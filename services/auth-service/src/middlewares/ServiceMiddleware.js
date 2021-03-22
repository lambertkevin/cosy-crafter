import fs from 'fs';
import path from 'path';
import Boom from '@hapi/boom';
import privateIp from 'private-ip';
import { logger } from '@cosy/logger';
import { makeRsaPrivateDecrypter } from '@cosy/rsa-utils';

export const checkSignature = (request, h) => {
  try {
    const { headers } = request;
    const privateDecrypter = makeRsaPrivateDecrypter();
    const decrypted = privateDecrypter(headers['x-authorization']);
    const decryptedTimestamp = new Date(Number(decrypted)).getTime();
    const now = Date.now();
    // Date.now from signature must be less than 1 sec
    const timing = 1000;

    if (now - decryptedTimestamp > timing) {
      throw Boom.unauthorized();
    }
    return h.continue;
  } catch (error) {
    /** @WARNING Make it critical when feature is available in winston + sentry */
    logger.error('Signature Check Middleware Failed', error);
    throw Boom.unauthorized();
  }
};

export const checkIpWhiteList = (request, h) => {
  const ip = request.info.remoteAddress;
  const { whitelist = [] } = fs.readFileSync(
    path.resolve('./', 'remoteAddresses.json'),
    'utf8'
  );

  if (!privateIp(ip) && !whitelist.includes(ip)) {
    /** @WARNING Make it critical when feature is available in winston + sentry */
    logger.error('Ip WhiteList Check Failed', { ip });
    throw Boom.unauthorized('Remote not authorized');
  }
  return h.continue;
};

export default {
  checkSignature,
  checkIpWhiteList
};
