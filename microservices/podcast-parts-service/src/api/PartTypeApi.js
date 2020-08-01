import joi from '@hapi/joi';
import * as partTypeController from '../controllers/PartTypeController';

export default {
  name: 'partTypeApi',
  async register(server) {
    server.route({
      method: 'GET',
      path: '/',
      handler: partTypeController.find
    });

    server.route({
      method: 'GET',
      path: '/{id}',
      handler: (request) => partTypeController.findOne(request.params.id)
    });

    server.route({
      method: 'POST',
      path: '/',
      handler: (request) => partTypeController.create(request.payload),
      options: {
        validate: {
          payload: joi.object({
            name: joi.string().min(1).max(50).required()
          })
        }
      }
    });

    server.route({
      method: 'PATCH',
      path: '/{id}',
      handler: (request) => partTypeController.update(request.params.id, request.payload)
    });

    server.route({
      method: 'DELETE',
      path: '/',
      handler: (request) => partTypeController.remove(request.payload.ids)
    });
  }
};
