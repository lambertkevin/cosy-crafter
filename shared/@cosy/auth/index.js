import fs from "fs";
import path from "path";
import axios from "axios";
import Boom from "@hapi/boom";
import jwt from "jsonwebtoken";
import { logger } from "@cosy/logger";
import CustomError from "@cosy/custom-error";
import {
  makeRsaPublicEncrypter,
  makeRsaPublicDecrypter,
} from "@cosy/rsa-utils";

const { AUTH_SERVICE_NAME, AUTH_SERVICE_PORT } = process.env;
const CREDENTIALS_PATH = path.resolve("./", ".credentials");

if (
  typeof AUTH_SERVICE_NAME !== "string" ||
  typeof AUTH_SERVICE_PORT !== "string"
) {
  throw new CustomError("Env variables are not set", "EnvVariableNotSet");
}

let config;
try {
  config = require(path.resolve("./src/config"));
} catch (e) {
  throw new CustomError("Config file is missing", "RequireConfigError");
}

const { identifier } = config;

/**
 * Exposed object contaning tokens
 * @type {Object}
 */
export const tokens = {
  accessToken: null,
  refreshToken: null,
};

/**
 * Register a service to the auth-service
 * and save credentials to local file
 *
 * @return {Promise}
 */
export const register = async () => {
  try {
    const publicEncrypter = makeRsaPublicEncrypter("auth");
    const publicDecrypter = makeRsaPublicDecrypter("auth");
    const { data: encryptedKey } = await axios
      .post(
        `http://${AUTH_SERVICE_NAME}:${AUTH_SERVICE_PORT}/services`,
        {
          identifier,
        },
        {
          headers: {
            "X-Authorization": publicEncrypter(Date.now()),
          },
        }
      )
      .then(({ data }) => data);

    const key = publicDecrypter(encryptedKey);
    if (encryptedKey && key) {
      fs.writeFileSync(
        CREDENTIALS_PATH,
        JSON.stringify({
          identifier,
          key,
        })
      );
      return;
    }
    throw new CustomError("Couldn't get a key");
  } catch (e) {
    logger.error("Error while registering the service", e);
    // istanbul ignore else
    if (process.env.NODE_ENV === "test") {
      throw new CustomError(
        "Process would have exited",
        "ProcessExitError",
        null,
        e
      );
    } else {
      process.exit(1);
    }
  }
};

/**
 * Log a service to get tokens
 *
 * @return {Promise}
 */
export const login = async () => {
  try {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      throw new CustomError("Service has not registered", "NoCredentialsError");
    }

    const publicEncrypter = makeRsaPublicEncrypter("auth");
    const { identifier: savedIdentifier, key } = JSON.parse(
      fs.readFileSync(CREDENTIALS_PATH, "utf8")
    );

    if (!savedIdentifier || !key) {
      throw new CustomError(
        "Credentials are malformed",
        "CredentialsMalformedError"
      );
    }

    const { data: freshTokens } = await axios
      .post(`http://${AUTH_SERVICE_NAME}:${AUTH_SERVICE_PORT}/services/login`, {
        identifier: savedIdentifier,
        key: publicEncrypter(key),
      })
      .then(({ data }) => data);

    tokens.accessToken = freshTokens.accessToken;
    tokens.refreshToken = freshTokens.refreshToken;

    return tokens;
  } catch (e) {
    /** @WARNING Change this to fatal when feature available in winston + sentry */
    logger.error("Error while loging the service", e);
    // istanbul ignore else
    if (process.env.NODE_ENV === "test") {
      throw new CustomError(
        "Process would have exited",
        "ProcessExitError",
        null,
        e
      );
    } else {
      return process.exit(1);
    }
  }
};

/**
 * Helper to authenticate a service by either
 * registering + logging
 * or just logging
 *
 * @return {Promise}
 */
export const auth = async () => {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    await register();
  }
  return login();
};

/**
 * Refresh the service tokens
 *
 * @return {Promise<Object>} [tokens]
 */
export const refresh = async () => {
  try {
    const { data: freshTokens } = await axios
      .post(
        `http://${AUTH_SERVICE_NAME}:${AUTH_SERVICE_PORT}/services/refresh`,
        tokens
      )
      .then(({ data }) => data);

    if (freshTokens?.accessToken && freshTokens?.refreshToken) {
      tokens.accessToken = freshTokens.accessToken;
      tokens.refreshToken = freshTokens.refreshToken;

      return tokens;
    }
    throw new CustomError(
      "Auth-Service failed to return tokens",
      "AuthServiceFailedError",
      503
    );
  } catch (e) {
    /** @WARNING Change this to fatal when feature available in winston + sentry */
    logger.error("Error while refreshing the service", e);
    if (e instanceof CustomError) {
      throw e;
    }
    throw new CustomError(
      "Failed refreshing tokens",
      "RefreshUnauthorizedError",
      401,
      e
    );
  }
};

export default {
  tokens,
  register,
  login,
  auth,
  refresh,
};
