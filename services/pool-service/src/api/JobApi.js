import joi from 'joi';
import _ from 'lodash';
import { createTranscodingJob } from '../controllers/JobController';
import { logger } from '../utils/Logger';

const routes = [
  {
    path: '/add',
    handler: createTranscodingJob,
    validation: joi.object({
      name: joi.string().required(),
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
      )
    })
  }
];

export default (prefix, socket) => {
  _.forEach(routes, (route) => {
    const path = `${prefix}${route.path}`;
    const handler = async (data, ack) => {
      try {
        if (route.validation) {
          await route.validation.validateAsync(data);
        }
        if (typeof ack !== 'function') {
          const error = new Error('ack is not a function');
          error.name = 'AckError';

          throw error;
        }
        return route.handler.apply(null, [data, ack, socket]);
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
