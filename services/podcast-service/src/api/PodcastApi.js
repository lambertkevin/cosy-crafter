import joi from 'joi';
import { responseSchema, creationSchema } from '../schemas/PodcastSchema';
import * as podcastController from '../controllers/PodcastController';
import failValidationHandler from '../utils/failValidationHandler';
import { calibrateSchema, schemaKeys } from '../utils/schemasUtils';

export default {
  name: 'podcastApi',
  async register(server) {
    /**
     * Get all podcasts
     *
     * @method GET
     */
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: {
          mode: 'optional',
          strategy: 'service-jwt'
        },
        validate: {
          headers: joi
            .object({
              authorization: joi.string().optional()
            })
            .unknown()
        },
        handler: (request) =>
          podcastController.find(!request.auth.isAuthenticated),
        tags: ['api', 'podcasts', 'v1'],
        description: 'Get all Podcasts',
        notes: 'Returns all the podcasts',
        plugins: {
          'hapi-swagger': {
            responses: {
              200: {
                schema: calibrateSchema(responseSchema)
              }
            }
          }
        }
      }
    });

    /**
     * Get one podcast
     *
     * @method GET
     * @param {String} id
     */
    server.route({
      method: 'GET',
      path: '/{id}',
      options: {
        auth: {
          mode: 'optional',
          strategy: 'service-jwt'
        },
        handler: (request) =>
          podcastController.findOne(
            request.params.id,
            !request.auth.isAuthenticated
          ),
        tags: ['api', 'podcasts', 'v1'],
        description: 'Get a Podcast',
        notes: 'Returns a specific podcast',
        validate: {
          failAction: failValidationHandler,
          params: joi.object({
            id: joi.string().length(24).required()
          }),
          headers: joi
            .object({
              authorization: joi.string().required()
            })
            .unknown()
        },
        plugins: {
          'hapi-swagger': {
            responses: {
              200: {
                schema: calibrateSchema(responseSchema, false)
              }
            }
          }
        }
      }
    });

    /**
     * Create one podcast
     *
     * @method POST
     * @see creationSchema
     */
    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: {
          mode: 'required',
          strategy: 'service-jwt'
        },
        handler: (request) =>
          podcastController.create(
            request.payload,
            !request.auth.isAuthenticated
          ),
        validate: {
          failAction: failValidationHandler,
          payload: creationSchema,
          headers: joi
            .object({
              authorization: joi.string().required()
            })
            .unknown()
        },
        tags: ['api', 'podcasts', 'v1'],
        description: 'Create a Podcast',
        notes: 'Creates a podcast and returns it',
        plugins: {
          'hapi-swagger': {
            responses: {
              200: {
                schema: calibrateSchema(responseSchema)
              }
            }
          }
        }
      }
    });

    /**
     * Update one podcast
     *
     * @method PATCH
     * @param {String} id
     * @see creationSchema
     */
    server.route({
      method: 'PATCH',
      path: '/{id}',
      options: {
        auth: {
          mode: 'required',
          strategy: 'service-jwt'
        },
        handler: (request) =>
          podcastController.update(
            request.params.id,
            request.payload,
            request.auth.isAuthenticated
          ),
        validate: {
          failAction: failValidationHandler,
          params: joi.object({
            id: joi.string().length(24).required()
          }),
          payload: creationSchema.fork(schemaKeys(creationSchema), (x) =>
            x.optional()
          ),
          headers: joi
            .object({
              authorization: joi.string().required()
            })
            .unknown()
        },
        tags: ['api', 'podcasts', 'v1'],
        description: 'Update a Podcast',
        notes: 'Updates a podcast and returns it',
        plugins: {
          'hapi-swagger': {
            responses: {
              200: {
                schema: calibrateSchema(responseSchema)
              }
            }
          }
        }
      }
    });

    /**
     * Delete podcasts
     *
     * @method DELETE
     * @payload {Array} ids
     */
    server.route({
      method: 'DELETE',
      path: '/',
      options: {
        auth: {
          mode: 'required',
          strategy: 'service-jwt'
        },
        handler: (request) => podcastController.remove(request.payload.ids),
        validate: {
          failAction: failValidationHandler,
          payload: joi.object({
            ids: joi
              .array()
              .items(
                joi
                  .string()
                  .length(24)
                  .required()
                  .example('5f3ed26ab65f39d0d8b7f360')
              )
          }),
          headers: joi
            .object({
              authorization: joi.string().required()
            })
            .unknown()
        },
        tags: ['api', 'podcasts', 'v1'],
        description: 'Delete Podcasts',
        notes: 'Deletes podcasts and returns their id to confirm',
        plugins: {
          'hapi-swagger': {
            responses: {
              200: {
                schema: calibrateSchema(
                  joi.object({
                    deleted: joi
                      .array()
                      .items(
                        joi
                          .string()
                          .length(24)
                          .required()
                          .example('5f3ed184201d35c0c309aaaa')
                      )
                  }),
                  false
                )
              }
            }
          }
        }
      }
    });

    /**
     * Delete one podcast
     *
     *
     * @method DELETE
     * @param {String} id
     */
    server.route({
      method: 'DELETE',
      path: '/{id}',
      options: {
        auth: {
          mode: 'required',
          strategy: 'service-jwt'
        },
        handler: (request) => podcastController.remove([request.params.id]),
        validate: {
          failAction: failValidationHandler,
          params: joi.object({
            id: joi.string().length(24).required()
          }),
          headers: joi
            .object({
              authorization: joi.string().required()
            })
            .unknown()
        },
        tags: ['api', 'podcasts', 'v1'],
        description: 'Delete a Podcast',
        notes: 'Delete a podcast and returns its id to confirm',
        plugins: {
          'hapi-swagger': {
            responses: {
              200: {
                schema: calibrateSchema(
                  joi.object({
                    deleted: joi
                      .array()
                      .items(
                        joi
                          .string()
                          .length(24)
                          .required()
                          .example('5f3ed184201d35c0c309aaaa')
                      )
                  }),
                  false
                )
              }
            }
          }
        }
      }
    });
  }
};
