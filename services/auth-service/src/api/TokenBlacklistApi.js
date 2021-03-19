import joi from 'joi';
import failValidationHandler from '@cosy/hapi-fail-validation-handler';
import * as TokenBlacklistController from '../controllers/TokenBlacklistController';
import { calibrateSchema } from '../utils/SchemasUtils';
import {
  responseSchema,
  creationSchema
} from '../schemas/TokenBlacklistSchema';

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
        // @TODO User Auth needed here
        handler: () => TokenBlacklistController.find(),
        tags: ['api', 'tokens'],
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
      path: '/{id}',
      options: {
        // @TODO User Auth needed here
        handler: (request) =>
          TokenBlacklistController.findOne(request.params.id),
        tags: ['api', 'tokens'],
        description: 'Get a Token',
        notes: 'Returns a specific blacklisted token',
        validate: {
          failAction: failValidationHandler,
          params: joi.object({
            id: joi
              .string()
              .length(24)
              .required()
              .example('5f3fa3c85d413d6f42bf67b2')
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
     * Create one token
     *
     * @method POST
     * @see creationSchema
     */
    server.route({
      method: 'POST',
      path: '/',
      options: {
        // @TODO User Auth needed here
        handler: (request) => TokenBlacklistController.create(request.payload),
        validate: {
          failAction: failValidationHandler,
          payload: creationSchema
        },
        tags: ['api', 'tokens'],
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
        handler: (request) =>
          TokenBlacklistController.remove(request.payload.ids),
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
        tags: ['api', 'tokens'],
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
     * Delete one token
     *
     *
     * @method DELETE
     * @param {String} id
     */
    server.route({
      method: 'DELETE',
      path: '/{id}',
      options: {
        // @TODO User Auth needed here
        handler: (request) =>
          TokenBlacklistController.remove([request.params.id]),
        validate: {
          failAction: failValidationHandler,
          params: joi.object({
            id: joi
              .string()
              .length(24)
              .required()
              .example('5f3fa3c85d413d6f42bf67b2')
          })
        },
        tags: ['api', 'tokens'],
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
