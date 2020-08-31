import fs from 'fs';
import path from 'path';
import axios from 'axios';
import Boom from '@hapi/boom';
import { makeRsaPublicEncrypter } from './utils/RsaUtils';

const {
  AUTH_SERVICE_NAME,
  AUTH_SERVICE_PORT,
  PODCAST_SERVICE_NAME
} = process.env;
const CREDENTIALS_PATH = path.join(path.resolve('./'), '.credentials');
const encrypter = makeRsaPublicEncrypter();

export const tokens = {
  accessToken: null,
  refreshToken: null
};

export const register = async () => {
  try {
    const identifier = `${PODCAST_SERVICE_NAME}-jessica`;
    const { data: encryptedKey } = await axios.post(
      `http://${AUTH_SERVICE_NAME}:${AUTH_SERVICE_PORT}/services`,
      {
        identifier
      },
      {
        headers: {
          'X-Authorization': encrypter(Date.now(), 'base64')
        }
      }
    );

    if (encryptedKey) {
      fs.writeFileSync(
        CREDENTIALS_PATH,
        JSON.stringify({
          identifier,
          encryptedKey
        })
      );
      return;
    }
    throw new Error("Couldn't get a key");
  } catch (e) {
    console.log(e);
    process.exit();
  }
};

export const login = async () => {
  try {
    const { identifier, encryptedKey: key } = JSON.parse(
      fs.readFileSync(CREDENTIALS_PATH, 'utf8')
    );
    const { data: freshTokens } = await axios
      .post(`http://${AUTH_SERVICE_NAME}:${AUTH_SERVICE_PORT}/services/login`, {
        identifier,
        key
      })
      .then(({ data }) => data);

    tokens.accessToken = freshTokens.accessToken;
    tokens.refreshToken = freshTokens.refreshToken;
  } catch (e) {
    console.log(e);
    process.exit();
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
    console.log(e);
    throw Boom.preconditionFailed();
  }
};

export default {
  tokens,
  register,
  login,
  auth,
  refresh
};
