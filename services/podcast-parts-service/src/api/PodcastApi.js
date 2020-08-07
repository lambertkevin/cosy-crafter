import joi from 'joi';
import * as podcastController from '../controllers/PodcastController';

export default {
  name: 'podcastApi',
  async register(server) {
    server.route({
      method: 'GET',
      path: '/',
      handler: podcastController.find
    });

    server.route({
      method: 'GET',
      path: '/{id}',
      handler: (request) => podcastController.findOne(request.params.id)
    });

    server.route({
      method: 'POST',
      path: '/',
      handler: (request) => podcastController.create(request.payload),
      options: {
        validate: {
          payload: joi.object({
            name: joi.string().min(1).max(50).required(),
            edition: joi.number().positive().required(),
            tags: joi.array().items(joi.string().min(1).max(50))
          })
        }
      }
    });

    server.route({
      method: 'PATCH',
      path: '/{id}',
      handler: (request) => podcastController.update(request.params.id, request.payload)
    });

    server.route({
      method: 'DELETE',
      path: '/',
      handler: (request) => podcastController.remove(request.payload.ids)
    });
  }
};
