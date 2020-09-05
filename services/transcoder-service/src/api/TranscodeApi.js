import joi from 'joi';
import { forEach } from 'lodash';
import { createTranscodeJob } from '../controllers/TransodeController';

const routes = [
  {
    path: '/join',
    handler: createTranscodeJob,
    validation: joi.object({
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
  forEach(routes, (route) => {
    const path = `${prefix}${route.path}`;
    const handler = async (data, ack) => {
      try {
        if (route.validation) {
          await route.validation.validateAsync(data);
        }
        return route.handler.apply(null, [data, ack, socket]);
      } catch (e) {
        return ack({
          statusCode: 409,
          message: 'Bad Request'
        });
      }
    };

    socket.on(path, handler);
  });
};
