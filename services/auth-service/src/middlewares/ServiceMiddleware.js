import fs from 'fs';
import path from 'path';
import Boom from '@hapi/boom';
import NodeRsa from 'node-rsa';
import privateIp from 'private-ip';

export const checkSignature = (request, h) => {
  try {
    const privateKey = new NodeRsa(
      fs.readFileSync(
        path.join(process.env.RSA_KEYS_LOCATION, process.env.RSA_KEYS_NAME)
      ),
      'pkcs1-private-pem'
    );
    const { payload } = request;
    const decrypted = privateKey.decrypt(payload.signature, 'utf8');
    const decryptedTimestamp = new Date(Number(decrypted)).getTime();
    const now = Date.now();
    const timing = process.env.NODE_ENV === 'production' ? 1000 : 1800000;

    if (now - decryptedTimestamp > timing) {
      throw Boom.unauthorized();
    }
    return h.continue;
  } catch (e) {
    /** @WARNING LOG DAT */
    throw Boom.unauthorized();
  }
};

export const checkIpWhiteList = (request, h) => {
  const ip = request.info.remoteAddress;
  const { whitelist = [] } = fs.readFileSync(
    path.join(path.resolve('./'), 'whitelist.json'),
    'utf8'
  );

  if (!privateIp(ip) && !whitelist.includes(ip)) {
    /** @WARNING LOG DAT */
    throw Boom.unauthorized();
  }
  return h.continue;
};

export default {
  checkSignature,
  checkIpWhiteList
};
