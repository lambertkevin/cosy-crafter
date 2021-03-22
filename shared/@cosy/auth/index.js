import fs from "fs";
import path from "path";
import axios from "axios";
import Boom from "@hapi/boom";
import { logger } from "@cosy/logger";
import CustomError from "@cosy/custom-error";
import {
  makeRsaPublicEncrypter,
  makeRsaPublicDecrypter,
} from "@cosy/rsa-utils";

const { AUTH_SERVICE_NAME, AUTH_SERVICE_PORT } = process.env;
const CREDENTIALS_PATH = path.resolve("./", ".credentials");

let identifier;
try {
  const config = require(path.resolve("./src/config"));
  identifier = config.identifier;
} catch (e) {
  throw new CustomError("Config file is missing", "RequireConfigError");
}

export const tokens = {
  accessToken: null,
  refreshToken: null,
};

export const register = async () => {
  try {
    const publicEncrypter = makeRsaPublicEncrypter("auth");
    const publicDecrypter = makeRsaPublicDecrypter("auth");
    const { data: response } = await axios.post(
      `http://${AUTH_SERVICE_NAME}:${AUTH_SERVICE_PORT}/services`,
      {
        identifier,
      },
      {
        headers: {
          "X-Authorization": publicEncrypter(Date.now()),
        },
      }
    );
    const { data: encryptedKey } = response;
    const key = publicDecrypter(encryptedKey);

    if (encryptedKey) {
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
    process.exit();
  }
};

export const login = async () => {
  try {
    const publicEncrypter = makeRsaPublicEncrypter("auth");
    const { identifier: savedIdentifier, key } = JSON.parse(
      fs.readFileSync(CREDENTIALS_PATH, "utf8")
    );
    const { data: freshTokens } = await axios
      .post(`http://${AUTH_SERVICE_NAME}:${AUTH_SERVICE_PORT}/services/login`, {
        identifier: savedIdentifier,
        key: publicEncrypter(key),
      })
      .then(({ data }) => data);

    tokens.accessToken = freshTokens.accessToken;
    tokens.refreshToken = freshTokens.refreshToken;
  } catch (e) {
    /** @WARNING Change this to fatal when feature available in winston + sentry */
    logger.error("Error while loging the service", e);
    process.exit(1);
  }
};

export const auth = async () => {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    await register();
    await login();
  } else {
    await login();
  }
};

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

export default {
  tokens,
  register,
  login,
  auth,
  refresh,
};
