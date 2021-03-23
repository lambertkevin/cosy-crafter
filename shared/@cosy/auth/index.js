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

    if (freshTokens) {
      tokens.accessToken = freshTokens.accessToken;
      tokens.refreshToken = freshTokens.refreshToken;

      return tokens;
    }
    throw Boom.serverUnavailable();
  } catch (e) {
    /** @WARNING Change this to fatal when feature available in winston + sentry */
    logger.error("Error while refreshing the service", e);
    throw Boom.preconditionFailed();
  }
};

/**
 * Middleware in charge of checking weither a socket
 * client is using auth through handshake or not.
 * Will disconnect the socket if
 * it is not authorized
 *
 * @param {Object} socket
 * @param {Function} next
 *
 * @return {void}
 */
export const socketJwtMiddleware = (socket, next) => {
  try {
    const { token } = socket.handshake.auth;
    jwt.verify(token, process.env.SERVICE_JWT_SECRET);
    // eslint-disable-next-line no-param-reassign
    socket.handshake.decodedToken = jwt.decode(token);
    next();
  } catch (error) {
    if (["JsonWebTokenError", "TokenExpiredError"].includes(error.name)) {
      error.data = { name: error.name, message: error.message };

      next(error);
    } else {
      setTimeout(() => {
        socket.disconnect();
      }, 200);

      // Do not change it to CustomError as socket.io will throw an Error instance
      next(new Error("An error has occured"));
    }
  }
};

export default {
  tokens,
  register,
  login,
  auth,
  refresh,
  socketJwtMiddleware,
};
