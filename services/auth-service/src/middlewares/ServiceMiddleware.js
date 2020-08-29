import fs from 'fs';
import path from 'path';
import Boom from '@hapi/boom';
import privateIp from 'private-ip';
import { rsaPrivateDecrypter } from '../utils/RsaUtils';

export const checkSignature = (request, h) => {
  try {
    const { headers } = request;
    const decrypter = rsaPrivateDecrypter();
    const decrypted = decrypter(headers['x-authorization']);
    const decryptedTimestamp = new Date(Number(decrypted)).getTime();
    const now = Date.now();
    const timing =
      process.env.NODE_ENV === 'production' ? 1000 : 12 * 60 * 60 * 1000;

    if (now - decryptedTimestamp > timing) {
      throw Boom.unauthorized();
    }
    return h.continue;
  } catch (e) {
    console.log(e);
    /** @WARNING LOG DAT */
    throw Boom.unauthorized();
  }
};

export const checkIpWhiteList = (request, h) => {
  const ip = request.info.remoteAddress;
  const { whitelist = [] } = fs.readFileSync(
    path.join(path.resolve('./'), 'remoteAddresses.json'),
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
