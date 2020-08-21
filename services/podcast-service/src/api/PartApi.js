import joi from 'joi';
import { creationSchema, responseSchema } from '../schemas/PartSchema';
import { calibrateSchema, schemaKeys } from '../utils/schemasUtils';
import failValidationHandler from '../utils/failValidationHandler';
import * as partController from '../controllers/PartController';

export default {
  name: 'partApi',
  async register(server) {
    /**
     * Health Check Route
     *
     * @method GET
     */
    server.route({
      method: 'GET',
      path: '/ping',
      handler: () => 'pong'
    });

    /**
     * Get all parts
     *
     * @method GET
     */
    server.route({
      method: 'GET',
      path: '/',
      options: {
        handler: () => partController.find(),
        tags: ['api', 'parts', 'v1'],
        description: 'Get all Parts',
        notes: 'Returns all the parts',
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
     * Get one part
     *
     * @method GET
     * @param {String} id
     */
    server.route({
      method: 'GET',
      path: '/{id}',
      options: {
        handler: (request) => partController.findOne(request.params.id),
        tags: ['api', 'parts', 'v1'],
        description: 'Get a Part',
        notes: 'Returns a specific part',
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
     * Create one part
     *
     * @method POST
     * @see creationSchema
     */
    server.route({
      method: 'POST',
      path: '/',
      options: {
        handler: ({ payload }) => partController.create(payload),
        payload: {
          allow: 'multipart/form-data',
          output: 'file',
          maxBytes: 200 * 1024 * 1024, // 200 Mo limit on upload size
          multipart: true,
          parse: true
        },
        validate: {
          failAction: failValidationHandler,
          payload: creationSchema
        },
        tags: ['api', 'parts', 'v1'],
        description: 'Create a Part',
        notes:
          'Creates a part and returns it. It will also handle file upload through the Storage Service.',
        plugins: {
          'hapi-swagger': {
            responses: {
              200: {
                schema: calibrateSchema(responseSchema)
              },
              400: {
                description:
                  'The file upload failed. For example, the file might be too big. (< 200MB)'
              }
            },
            payloadType: 'form'
          }
        }
      }
    });

    /**
     * Update one part
     *
     * @method PATCH
     * @see creationSchema
     */
    server.route({
      method: 'PATCH',
      path: '/{id}',
      options: {
        handler: (request) =>
          partController.update(request.params.id, request.payload),
        payload: {
          allow: 'multipart/form-data',
          output: 'file',
          maxBytes: 200 * 1024 * 1024, // 200 Mo limit on upload size
          multipart: true,
          parse: true
        },
        validate: {
          failAction: failValidationHandler,
          params: joi.object({
            id: joi.string().length(24).required()
          }),
          payload: creationSchema.fork(schemaKeys(creationSchema), (x) =>
            x.optional()
          )
        },
        tags: ['api', 'parts', 'v1'],
        description: 'Update a Part',
        notes: 'Updates a part and returns it',
        plugins: {
          'hapi-swagger': {
            responses: {
              200: {
                schema: calibrateSchema(responseSchema)
              }
            },
            payloadType: 'form'
          }
        }
      }
    });

    /**
     * Delete parts
     *
     * @method DELETE
     * @payload {Array} ids
     */
    server.route({
      method: 'DELETE',
      path: '/',
      options: {
        handler: (request) => partController.remove(request.payload.ids),
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
                  .example('5f3fa3c85d413d6f42bf67b2')
              )
          })
        },
        tags: ['api', 'parts', 'v1'],
        description: 'Delete Parts',
        notes: 'Deletes parts and returns their id to confirm',
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
                          .example('5f3fa3c85d413d6f42bf67b2')
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
     * Delete one part
     *
     * @method DELETE
     * @param {String} id
     */
    server.route({
      method: 'DELETE',
      path: '/{id}',
      options: {
        handler: (request) => partController.remove([request.params.id]),
        validate: {
          failAction: failValidationHandler,
          params: joi.object({
            id: joi.string().length(24).required()
          })
        },
        tags: ['api', 'parts', 'v1'],
        description: 'Delete a Part',
        notes: 'Deletes one part and returns its id to confirm',
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
                          .example('5f3fa3c85d413d6f42bf67b2')
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
