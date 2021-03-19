import fs from "fs";
import path from "path";
import NodeRsa from "node-rsa";

/**
 * Factory of function capable of decrypting
 * with the private rsa key
 *
 * @param {String} keyType
 *
 * @return {Function}
 */
export const makeRsaPrivateDecrypter = (keyType) => {
  const keys = {
    auth: `${process.env.AUTH_RSA_KEYS_NAME}`,
    pool: `${process.env.POOL_RSA_KEYS_NAME}`,
  };
  const privateKey = new NodeRsa(
    fs.readFileSync(
      path.join(process.env.RSA_KEYS_LOCATION, keys[keyType] || keys["auth"])
    ),
    "pkcs1-private-pem"
  );

  return (data, format = "utf8") => privateKey.decrypt(data, format);
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
  const keys = {
    auth: `${process.env.AUTH_RSA_KEYS_NAME}`,
    pool: `${process.env.POOL_RSA_KEYS_NAME}`,
  };
  const privateKey = new NodeRsa(
    fs.readFileSync(
      path.join(process.env.RSA_KEYS_LOCATION, keys[keyType] || keys["auth"])
    ),
    "pkcs1-private-pem"
  );

  return (data, format = "base64") => privateKey.encryptPrivate(data, format);
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
  const keys = {
    auth: `${process.env.AUTH_RSA_KEYS_NAME}.pem`,
    pool: `${process.env.POOL_RSA_KEYS_NAME}.pem`,
  };
  const publicKey = new NodeRsa(
    fs.readFileSync(
      path.join(process.env.RSA_KEYS_LOCATION, keys[keyType] || keys["auth"])
    ),
    "pkcs8-public-pem"
  );

  return (data, format = "utf8") => publicKey.decryptPublic(data, format);
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
  const keys = {
    auth: `${process.env.AUTH_RSA_KEYS_NAME}.pem`,
    pool: `${process.env.POOL_RSA_KEYS_NAME}.pem`,
  };
  const publicKey = new NodeRsa(
    fs.readFileSync(
      path.join(process.env.RSA_KEYS_LOCATION, keys[keyType] || keys["auth"])
    ),
    "pkcs8-public-pem"
  );

  return (data, format = "utf8") => publicKey.encrypt(data, format);
};
