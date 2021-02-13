import fs from 'fs';
import path from 'path';
import NodeRsa from 'node-rsa';

/**
 * Factory of function capable of decrypting
 * with the private rsa key
 *
 * @return {Function}
 */
export const makeRsaPrivateDecrypter = () => {
  const privateKey = new NodeRsa(
    fs.readFileSync(
      path.join(process.env.RSA_KEYS_LOCATION, process.env.POOL_RSA_KEYS_NAME)
    ),
    'pkcs1-private-pem'
  );

  return (data, format = 'utf8') => privateKey.decrypt(data, format);
};

/**
 * Factory of function capable of encrypting
 * with the private rsa key
 *
 * @return {Function}
 */
export const makeRsaPrivateEncrypter = () => {
  const privateKey = new NodeRsa(
    fs.readFileSync(
      path.join(process.env.RSA_KEYS_LOCATION, process.env.POOL_RSA_KEYS_NAME)
    ),
    'pkcs1-private-pem'
  );

  return (data, format = 'base64') => privateKey.encryptPrivate(data, format);
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
    pool: `${process.env.POOL_RSA_KEYS_NAME}.pem`
  };
  const publicKey = new NodeRsa(
    fs.readFileSync(
      path.join(
        process.env.RSA_KEYS_LOCATION,
        keys[keyType] || `${process.env.AUTH_RSA_KEYS_NAME}.pem`
      )
    ),
    'pkcs8-public-pem'
  );

  return (data, format = 'utf8') => publicKey.decryptPublic(data, format);
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
    pool: `${process.env.POOL_RSA_KEYS_NAME}.pem`
  };
  const publicKey = new NodeRsa(
    fs.readFileSync(
      path.join(
        process.env.RSA_KEYS_LOCATION,
        keys[keyType] || `${process.env.AUTH_RSA_KEYS_NAME}.pem`
      )
    ),
    'pkcs8-public-pem'
  );

  return (data, format = 'utf8') => publicKey.encrypt(data, format);
};