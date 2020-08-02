import joi from '@hapi/joi';
import * as partController from '../controllers/PartController';

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
      handler: (request) => partController.create(request.payload),
      options: {
        validate: {
          payload: joi.object({
            name: joi.string().min(1).max(50).required(),
            type: joi.string().length(24).required(),
            podcast: joi.string().length(24).required(),
            tags: joi.array().items(joi.string().min(1).max(50))
          })
        }
      }
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
