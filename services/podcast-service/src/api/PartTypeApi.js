import joi from 'joi';
import { responseSchema, creationSchema } from '../schemas/PartTypeSchema';
import * as partTypeController from '../controllers/PartTypeController';
import { calibrateSchema, schemaKeys } from '../utils/schemasUtils';
import failValidationHandler from '../utils/failValidationHandler';

export default {
  name: 'partTypeApi',
  async register(server) {
    /**
     * Get all part types
     *
     * @method GET
     */
    server.route({
      method: 'GET',
      path: '/',
      options: {
        handler: () => partTypeController.find(),
        tags: ['api', 'part types', 'v1'],
        description: 'Get all Part Types',
        notes: 'Returns all the part types',
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
     * Get one part type
     *
     * @method GET
     * @param {String} id
     */
    server.route({
      method: 'GET',
      path: '/{id}',
      options: {
        handler: (request) => partTypeController.findOne(request.params.id),
        tags: ['api', 'part types', 'v1'],
        description: 'Get a Part Type',
        notes: 'Returns a specific part type',
        validate: {
          failAction: failValidationHandler,
          params: joi.object({
            id: joi.string().length(24).required()
          })
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
     * Create one part type
     *
     * @method POST
     * @see creationSchema
     */
    server.route({
      method: 'POST',
      path: '/',
      options: {
        handler: (request) => partTypeController.create(request.payload),
        validate: {
          failAction: failValidationHandler,
          payload: creationSchema
        },
        tags: ['api', 'part types', 'v1'],
        description: 'Create a Part Type',
        notes: 'Creates a part type and returns it',
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
     * Update one part type
     *
     * @method PATCH
     * @param {String} id
     * @see creationSchema
     */
    server.route({
      method: 'PATCH',
      path: '/{id}',
      options: {
        handler: (request) =>
          partTypeController.update(request.params.id, request.payload),
        validate: {
          failAction: failValidationHandler,
          params: joi.object({
            id: joi.string().length(24).required()
          }),
          payload: creationSchema.fork(schemaKeys(creationSchema), (x) =>
            x.optional()
          )
        },
        tags: ['api', 'part types', 'v1'],
        description: 'Update a Part Type',
        notes: 'Updates a part type and returns it',
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
     * Delete part types
     *
     * @method DELETE
     * @payload {Array} ids
     */
    server.route({
      method: 'DELETE',
      path: '/',
      options: {
        handler: (request) => partTypeController.remove(request.payload.ids),
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
          })
        },
        tags: ['api', 'part types', 'v1'],
        description: 'Delete Part Types',
        notes: 'Deletes part types and returns their id to confirm',
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
     * Delete one part type
     *
     *
     * @method DELETE
     * @param {String} id
     */
    server.route({
      method: 'DELETE',
      path: '/{id}',
      options: {
        handler: (request) => partTypeController.remove([request.params.id]),
        validate: {
          failAction: failValidationHandler,
          params: joi.object({
            id: joi.string().length(24).required()
          })
        },
        tags: ['api', 'part types', 'v1'],
        description: 'Delete a Part Type',
        notes: 'Delete a part type and returns its id to confirm',
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
