import fs from "fs";
import path from "path";
import NodeRsa from "node-rsa";
import CustomError from "@cosy/custom-error";

const {
  RSA_KEYS_LOCATION,
  AUTH_RSA_KEYS_NAME,
  POOL_RSA_KEYS_NAME,
} = process.env;

const keysMap = {
  auth: AUTH_RSA_KEYS_NAME,
  pool: POOL_RSA_KEYS_NAME,
};

const keyFileNotFoundError = new CustomError(
  "Key file not found",
  "KeyFileNotFound"
);

/**
 * Return a key filename from the keyMap
 *
 * @param {String} keyType
 *
 * @return {String}
 * @throws {CustomError}
 */
const keyByType = (keyType) => {
  const key = keysMap[keyType] ?? keysMap["auth"];

  if (typeof key !== "string" || typeof RSA_KEYS_LOCATION !== "string") {
    throw new CustomError("Env variables are not set", "EnvVariableNotSet");
  }

  return key;
};

/**
 * Factory of function capable of decrypting
 * with the private rsa key
 *
 * @param {String} keyType
 *
 * @return {Function}
 */
export const makeRsaPrivateDecrypter = (keyType) => {
  const key = keyByType(keyType);
  const keyPath = path.join(RSA_KEYS_LOCATION, key);
  const fileStats = fs.existsSync(keyPath) && fs.statSync(keyPath);

  if (fileStats?.isFile?.()) {
    const privateKey = new NodeRsa(
      fs.readFileSync(keyPath),
      "pkcs1-private-pem"
    );

    // Format returned can also be 'buffer', 'json' or 'utf8'
    return (data, formatReturned = "utf8") =>
      privateKey.decrypt(data, formatReturned);
  }

  throw keyFileNotFoundError;
};

/**
 * Factory of function capable of encrypting
 * with the private rsa key
 *
 * @param {String} keyType
 *
 * @return {Function}
 */
export const makeRsaPrivateEncrypter = (keyType) => {
  const key = keyByType(keyType);
  const keyPath = path.join(RSA_KEYS_LOCATION, key);
  const fileStats = fs.existsSync(keyPath) && fs.statSync(keyPath);

  if (fileStats?.isFile?.()) {
    const privateKey = new NodeRsa(
      fs.readFileSync(keyPath),
      "pkcs1-private-pem"
    );

    // Format returned can be 'buffer', 'binary', 'hex' or 'base64'
    return (data, formatReturned = "base64") =>
      privateKey.encryptPrivate(data, formatReturned);
  }

  throw keyFileNotFoundError;
};

/**
 * Factory of function capable of decrypting
 * with the public rsa key
 *
 * @param {String} keyType
 *
 * @return {Function}
 */
export const makeRsaPublicDecrypter = (keyType) => {
  const key = keyByType(keyType);
  const keyPath = path.join(RSA_KEYS_LOCATION, `${key}.pem`);
  const fileStats = fs.existsSync(keyPath) && fs.statSync(keyPath);

  if (fileStats?.isFile?.()) {
    const publicKey = new NodeRsa(fs.readFileSync(keyPath), "pkcs8-public-pem");

    // Format returned can be 'buffer', 'json' or 'utf8'
    return (data, formatReturned = "utf8") =>
      publicKey.decryptPublic(data, formatReturned);
  }

  throw keyFileNotFoundError;
};

/**
 * Factory of function capable of encrypting
 * with the public rsa key
 *
 * @param {String} keyType
 *
 * @return {Function}
 */
export const makeRsaPublicEncrypter = (keyType) => {
  const key = keyByType(keyType);
  const keyPath = path.join(RSA_KEYS_LOCATION, `${key}.pem`);
  const fileStats = fs.existsSync(keyPath) && fs.statSync(keyPath);

  if (fileStats?.isFile?.()) {
    const publicKey = new NodeRsa(fs.readFileSync(keyPath), "pkcs8-public-pem");

    // Format returned can be 'buffer', 'binary', 'hex' or 'base64'
    return (data, formatReturned = "base64") =>
      publicKey.encrypt(data, formatReturned);
  }

  throw keyFileNotFoundError;
};
