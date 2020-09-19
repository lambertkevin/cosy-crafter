import fs from 'fs';
import path from 'path';
import NodeRsa from 'node-rsa';

/**
 * Factory of function capable of decrypting
 * with the public rsa key
 *
 * @return {Function}
 */
export const makeRsaPublicDecrypter = () => {
  const publicKey = new NodeRsa(
    fs.readFileSync(
      path.join(
        process.env.RSA_KEYS_LOCATION,
        `${process.env.AUTH_RSA_KEYS_NAME}.pem`
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
 * @return {Function}
 */
export const makeRsaPublicEncrypter = () => {
  const publicKey = new NodeRsa(
    fs.readFileSync(
      path.join(
        process.env.RSA_KEYS_LOCATION,
        `${process.env.AUTH_RSA_KEYS_NAME}.pem`
      )
    ),
    'pkcs8-public-pem'
  );

  return (data, format = 'utf8') => publicKey.encrypt(data, format);
};
