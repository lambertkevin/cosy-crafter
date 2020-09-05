import joi from 'joi';
import { responseSchema, creationSchema } from '../schemas/CraftSchema';
import * as craftController from '../controllers/CraftController';
import { calibrateSchema, schemaKeys } from '../utils/schemasUtils';
import failValidationHandler from '../utils/failValidationHandler';

export default {
  name: 'craftApi',
  async register(server) {
    server.route({
      method: 'get',
      path: '/ping',
      handler: () => 'pong'
    });
    /**
     * Get all crafts
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
          craftController.find(!request.auth.isAuthenticated),
        tags: ['api', 'crafts', 'v1'],
        description: 'Get all Crafts',
        notes: 'Returns all the crafts',
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
     * Get one craft
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
        validate: {
          failAction: failValidationHandler,
          params: joi.object({
            id: joi.string().length(24).required()
          }),
          headers: joi
            .object({
              authorization: joi.string().optional()
            })
            .unknown()
        },
        handler: (request) =>
          craftController.findOne(
            request.params.id,
            !request.auth.isAuthenticated
          ),
        tags: ['api', 'crafts', 'v1'],
        description: 'Get a Craft',
        notes: 'Returns a specific craft',
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
     * Create one craft
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
        validate: {
          failAction: failValidationHandler,
          payload: creationSchema,
          headers: joi
            .object({
              authorization: joi.string().required()
            })
            .unknown()
        },
        handler: (request) =>
          craftController.create(
            request.payload,
            !request.auth.isAuthenticated
          ),
        tags: ['api', 'crafts', 'v1'],
        description: 'Create a Craft',
        notes: 'Creates a craft and returns it',
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
     * Update one craft
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
        handler: (request) =>
          craftController.update(
            request.params.id,
            request.payload,
            !request.auth.isAuthenticated
          ),
        tags: ['api', 'crafts', 'v1'],
        description: 'Update a Craft',
        notes: 'Updates a craft and returns it',
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
     * Delete crafts
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
                  .example('5f3ffc6b726fccbdeac6a320')
              )
          }),
          headers: joi
            .object({
              authorization: joi.string().required()
            })
            .unknown()
        },
        handler: (request) => craftController.remove(request.payload.ids),
        tags: ['api', 'crafts', 'v1'],
        description: 'Delete Crafts',
        notes: 'Deletes crafts and returns their id to confirm',
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
                          .example('5f3ffc6b726fccbdeac6a320')
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
     * Delete one craft
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
        handler: (request) => craftController.remove([request.params.id]),
        tags: ['api', 'crafts', 'v1'],
        description: 'Delete a Craft',
        notes: 'Delete a craft and returns its id to confirm',
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
                          .example('5f3ffc717161d3708f251bc0')
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
