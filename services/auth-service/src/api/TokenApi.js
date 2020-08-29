import joi from 'joi';
import { responseSchema, creationSchema } from '../schemas/TokenSchema';
import * as tokenController from '../controllers/TokenController';
import { calibrateSchema } from '../utils/schemasUtils';
import failValidationHandler from '../utils/failValidationHandler';

export default {
  name: 'tokenApi',
  async register(server) {
    /**
     * Get all tokens
     *
     * @method GET
     */
    server.route({
      method: 'GET',
      path: '/',
      options: {
        handler: () => tokenController.find(),
        tags: ['api', 'tokens', 'v1'],
        description: 'Get all Tokens',
        notes: 'Returns all the blacklisted tokens',
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
     * Get one token
     *
     * @method GET
     * @param {String} id
     */
    server.route({
      method: 'GET',
      path: '/{jwtid}',
      options: {
        handler: (request) => tokenController.findOne(request.params.jwtid),
        tags: ['api', 'tokens', 'v1'],
        description: 'Get a Token',
        notes: 'Returns a specific blacklisted token',
        validate: {
          failAction: failValidationHandler,
          params: creationSchema
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
     * Create one token
     *
     * @method POST
     * @see creationSchema
     */
    server.route({
      method: 'POST',
      path: '/',
      options: {
        handler: (request) => tokenController.create(request.payload),
        validate: {
          failAction: failValidationHandler,
          payload: creationSchema
        },
        tags: ['api', 'tokens', 'v1'],
        description: 'Create a Token',
        notes: 'Blacklist a token and returns it',
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
     * Delete tokens
     *
     * @method DELETE
     * @payload {Array} jwtids
     */
    server.route({
      method: 'DELETE',
      path: '/',
      options: {
        handler: (request) => tokenController.remove(request.payload.jwtids),
        validate: {
          failAction: failValidationHandler,
          payload: joi.object({
            jwtids: joi
              .array()
              .items(
                joi
                  .string()
                  .length(36)
                  .required()
                  .example('1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed')
              )
          })
        },
        tags: ['api', 'tokens', 'v1'],
        description: 'Delete Tokens',
        notes:
          'Removes tokens from the blacklist and returns their jwtid to confirm',
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
                          .length(36)
                          .required()
                          .example('1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed')
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
     * Delete one token
     *
     *
     * @method DELETE
     * @param {String} id
     */
    server.route({
      method: 'DELETE',
      path: '/{jwtid}',
      options: {
        handler: (request) => tokenController.remove([request.params.jwtid]),
        validate: {
          failAction: failValidationHandler,
          params: joi.object({
            jwtid: joi.string().length(36).required()
          })
        },
        tags: ['api', 'tokens', 'v1'],
        description: 'Delete a Token',
        notes:
          'Removes a token from blacklist and returns its jwtid to confirm',
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
                          .length(36)
                          .required()
                          .example('1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed')
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
