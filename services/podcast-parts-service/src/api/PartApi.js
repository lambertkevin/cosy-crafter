import joi from 'joi';
import * as partController from '../controllers/PartController';
import failValidationHandler from '../utils/failValidationHandler';

export default {
  name: 'partApi',
  async register(server) {
    server.route({
      method: 'GET',
      path: '/',
      handler: partController.find
    });

    server.route({
      method: 'GET',
      path: '/{id}',
      handler: (request) => partController.findOne(request.params.id)
    });

    server.route({
      method: 'POST',
      path: '/',
      options: {
        payload: {
          output: 'file',
          maxBytes: 200 * 1024 * 1024, // 200 Mo limit on upload size
          multipart: true,
          parse: true
        },
        validate: {
          failAction: failValidationHandler,
          payload: joi.object({
            name: joi.string().min(1).max(50).required(),
            type: joi.string().length(24).required(),
            podcast: joi.string().length(24).required(),
            tags: joi.string().regex(/^[a-zA-Z0-9, ]*$/, 'Alphanumerics, space and comma characters').min(3).max(200),
            file: joi.any().required()
          })
        }
      },
      handler: ({ payload }) => partController.create(payload)
    });

    server.route({
      method: 'PATCH',
      path: '/{id}',
      handler: (request) => partController.update(request.params.id, request.payload)
    });

    server.route({
      method: 'DELETE',
      path: '/',
      handler: (request) => partController.remove(request.payload.ids)
    });
  }
};
