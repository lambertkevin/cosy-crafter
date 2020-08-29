import fs from 'fs';
import path from 'path';
import NodeRsa from 'node-rsa';

/**
 * Factory of function capable of decrypting
 * with the private rsa key
 *
 * @return {Function}
 */
export const rsaPrivateDecrypter = () => {
  const privateKey = new NodeRsa(
    fs.readFileSync(
      path.join(process.env.RSA_KEYS_LOCATION, process.env.RSA_KEYS_NAME)
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
export const rsaPrivateEncrypter = () => {
  const privateKey = new NodeRsa(
    fs.readFileSync(
      path.join(process.env.RSA_KEYS_LOCATION, process.env.RSA_KEYS_NAME)
    ),
    'pkcs1-private-pem'
  );

  return (data, format = 'base64') => privateKey.encrypt(data, format);
};

/**
 * Factory of function capable of decrypting
 * with the public rsa key
 *
 * @return {Function}
 */
export const rsaPublicDecrypter = () => {
  const publicKey = new NodeRsa(
    fs.readFileSync(
      path.join(
        process.env.RSA_KEYS_LOCATION,
        `${process.env.RSA_KEYS_NAME}.pem`
      )
    ),
    'pkcs1-public-pem'
  );

  return (data, format = 'utf8') => publicKey.decrypt(data, format);
};

/**
 * Factory of function capable of encrypting
 * with the public rsa key
 *
 * @return {Function}
 */
export const rsaPublicEncrypter = () => {
  const publicKey = new NodeRsa(
    fs.readFileSync(
      path.join(
        process.env.RSA_KEYS_LOCATION,
        `${process.env.RSA_KEYS_NAME}.pem`
      )
    ),
    'pkcs1-public-pem'
  );

  return (data, format = 'utf8') => publicKey.encrypt(data, format);
};
