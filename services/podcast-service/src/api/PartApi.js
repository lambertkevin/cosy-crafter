import joi from 'joi';
import failValidationHandler from '@cosy/hapi-fail-validation-handler';
import { creationSchema, responseSchema } from '../schemas/PartSchema';
import { calibrateSchema, schemaKeys } from '../utils/SchemasUtils';
import * as partController from '../controllers/PartController';

export default {
  name: 'partApi',
  async register(server) {
    /**
     * Get all parts
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
          partController.find(!request.auth.isAuthenticated),
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
          partController.findOne(
            request.params.id,
            !request.auth.isAuthenticated
          ),
        tags: ['api', 'parts', 'v1'],
        description: 'Get a Part',
        notes: 'Returns a specific part',
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
        auth: {
          mode: 'required',
          strategy: 'service-jwt'
        },
        handler: (request) =>
          partController.create(request.payload, !request.auth.isAuthenticated),
        validate: {
          failAction: failValidationHandler,
          payload: creationSchema,
          headers: joi
            .object({
              authorization: joi.string().required()
            })
            .unknown()
        },
        payload: {
          allow: 'multipart/form-data',
          output: 'file',
          maxBytes: 200 * 1024 * 1024, // 200 Mo limit on upload size
          multipart: true,
          parse: true
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
          partController.update(
            request.params.id,
            request.payload,
            !request.auth.isAuthenticated
          ),
        payload: {
          allow: 'multipart/form-data',
          output: 'file',
          maxBytes: 200 * 1024 * 1024, // 200 Mo limit on upload size
          multipart: true,
          parse: true
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
                  .example('5f3fa3c85d413d6f42bf67b2')
              )
          }),
          headers: joi
            .object({
              authorization: joi.string().required()
            })
            .unknown()
        },
        handler: (request) => partController.remove(request.payload.ids),
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
        handler: (request) => partController.remove([request.params.id]),
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
