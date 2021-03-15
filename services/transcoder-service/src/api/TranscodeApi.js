import joi from 'joi';
import _ from 'lodash';
import { createTranscodeJob } from '../controllers/TranscodeController';
import { makeRsaPublicDecrypter } from '../utils/RsaUtils';
import { logger } from '../utils/Logger';

const routes = [
  {
    path: '/join',
    handler: createTranscodeJob,
    validation: joi.object({
      jobId: joi.string().length(36).required(),
      files: joi.array().items(
        joi.object({
          id: joi.string().length(24).required(),
          type: joi.string().valid('podcast-part', 'user-input').required(),
          seek: joi
            .object({
              start: joi.number().optional(),
              end: joi.number().optional()
            })
            .optional()
        })
      ),
      name: joi.string().required()
    })
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
          const error = new Error('ack is not a function');
          error.name = 'AckError';

          throw error;
        }

        return route.handler.apply(null, [decryptedData, ack, socket]);
      } catch (e) {
        logger.error('Socket payload validation error', e);

        if (e.name !== 'AckError') {
          return ack({
            statusCode: 409,
            message: 'Bad Request'
          });
        }
        return null;
      }
    };

    socket.on(path, handler);
  });
};
