import joi from 'joi';
import { responseSchema, creationSchema } from '../schemas/SectionSchema';
import * as sectionController from '../controllers/SectionController';
import { calibrateSchema, schemaKeys } from '../utils/SchemasUtils';
import failValidationHandler from '../utils/FailValidationHandler';

export default {
  name: 'sectionApi',
  async register(server) {
    /**
     * Get all sections
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
          sectionController.find(!request.auth.isAuthenticated),
        tags: ['api', 'sections', 'v1'],
        description: 'Get all Sections',
        notes: 'Returns all the sections',
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
     * Get one section
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
          sectionController.findOne(
            request.params.id,
            !request.auth.isAuthenticated
          ),
        tags: ['api', 'sections', 'v1'],
        description: 'Get a Section',
        notes: 'Returns a specific section',
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
     * Create one section
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
          sectionController.create(
            request.payload,
            !request.auth.isAuthenticated
          ),
        tags: ['api', 'sections', 'v1'],
        description: 'Create a Section',
        notes: 'Creates a section and returns it',
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
     * Update one section
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
          sectionController.update(
            request.params.id,
            request.payload,
            !request.auth.isAuthenticated
          ),
        tags: ['api', 'sections', 'v1'],
        description: 'Update a Section',
        notes: 'Updates a section and returns it',
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
     * Delete sections
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
        handler: (request) => sectionController.remove(request.payload.ids),
        tags: ['api', 'sections', 'v1'],
        description: 'Delete Sections',
        notes: 'Deletes sections and returns their id to confirm',
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
     * Delete one section
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
        handler: (request) => sectionController.remove([request.params.id]),
        tags: ['api', 'sections', 'v1'],
        description: 'Delete a Section',
        notes: 'Delete a section and returns its id to confirm',
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
