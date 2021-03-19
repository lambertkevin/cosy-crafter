import _ from 'lodash';
import { logger } from '@cosy/logger';
import CustomError from '@cosy/custom-error';
import { createTranscodeJob } from '../controllers/TranscodeController';
import { makeRsaPublicDecrypter } from '../utils/RsaUtils';
import { transcodeJobPayloadSchema } from '../schemas';

const routes = [
  {
    path: '/join',
    handler: createTranscodeJob,
    validation: transcodeJobPayloadSchema
  }
];

export default (prefix, socket) => {
  _.forEach(routes, (route) => {
    const path = `${prefix}${route.path}`;
    const handler = async (data, ack) => {
      try {
        const publicDecrypter = makeRsaPublicDecrypter('pool');
        const decryptedData = publicDecrypter(data, 'json');

        if (route.validation) {
          await route.validation.validateAsync(decryptedData);
        }

        if (typeof ack !== 'function') {
          throw new CustomError('ack is not a function', 'AckError');
        }

        return route.handler.apply(null, [decryptedData, ack, socket]);
      } catch (e) {
        logger.error('Socket payload validation error', e);

        if (
          e.message.startsWith(
            'Error during decryption (probably incorrect key)'
          )
        ) {
          return ack?.({
            statusCode: 403,
            message: 'Decryption error'
          });
        }

        if (e.name !== 'AckError') {
          return ack?.({
            statusCode: 409,
            message: 'Bad Request'
          });
        }

        return ack?.({
          statusCode: 500,
          message: 'An error occured'
        });
      }
    };

    socket.on(path, handler);
  });
};
