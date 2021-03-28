import joi from 'joi';
import _ from 'lodash';
import { logger } from '@cosy/logger';
import CustomError from '@cosy/custom-error';
import * as JobController from '../controllers/JobController';
import { transcodingQueue } from '../queue';

const routes = [
  {
    path: '/add',
    handler: (data, ack) => {
      const job = JobController.createTranscodingJob(data, ack);
      transcodingQueue.addJob(job);
    },
    validation: joi.object({
      name: joi.string().required(),
      files: joi
        .array()
        .items(
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
        .required()
    })
  }
];

export default (prefix, socket) => {
  _.forEach(routes, (route) => {
    const path = `${_.trimEnd(prefix, '/')}/${_.trim(route.path, '/')}`;
    const handler = async (data, ack) => {
      try {
        if (route.validation) {
          await route.validation.validateAsync(data);
        }
        if (typeof ack !== 'function') {
          const error = new CustomError('ack is not a function', 'AckError', 500);
          throw error;
        }
        return route.handler.apply(null, [data, ack, socket]);
      } catch (e) {
        logger.error('Socket payload validation error', e);
        if (e.name !== 'AckError' && typeof ack === 'function') {
          return ack({
            statusCode: 400,
            error: 'Bad Request',
            message: e.message
          });
        }
        return e;
      }
    };

    socket.on(path, handler);
  });
};
