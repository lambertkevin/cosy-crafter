import joi from 'joi';
import failValidationHandler from '../utils/failValidationHandler';
import * as StorageController from '../controllers/StorageController';

export default {
  name: 'storageApi',
  async register(server) {
    /**
     * Health Check Route
     */
    server.route({
      method: 'GET',
      path: '/ping',
      handler: () => 'pong'
    });

    /**
     * Podcast Part Upload Route
     */
    server.route({
      method: 'POST',
      path: '/podcast-part',
      options: {
        payload: {
          output: 'stream',
          maxBytes: 200 * 1024 * 1024, // 200 Mo limit on upload size
          multipart: true,
          parse: true
        },
        validate: {
          failAction: failValidationHandler,
          payload: joi.object({
            podcastName: joi.string().min(1).max(50).required(),
            filename: joi.string().min(1).max(50).required(),
            file: joi.any().required()
          })
        }
      },
      handler: ({ payload }) => StorageController.addPodcastPartFile(payload)
    });

    server.route({
      method: 'GET',
      path: '/podcast-part/{id}',
      handler: async ({ params }, h) =>
        StorageController.getPodcastPartFile(params.id, h)
    });
  }
};
