import joi from 'joi';
import Boom from '@hapi/boom';
import { logger } from '@cosy/logger';
import generatePassword from 'generate-password';
import { standardizeSchema } from '@cosy/schema-utils';
import { makeRsaPrivateDecrypter, makeRsaPrivateEncrypter } from '@cosy/rsa-utils';
import failValidationHandler from '@cosy/hapi-fail-validation-handler';
import { responseSchema, creationSchema } from '../schemas/ServiceSchema';
import * as ServiceController from '../controllers/ServiceController';
import { checkSignature, checkIpWhiteList } from '../middlewares/ServiceMiddleware';

export default {
  name: 'serviceApi',
  async register(server) {
    /**
     * Get all services
     *
     * @method GET
     */
    server.route({
      method: 'GET',
      path: '/',
      options: {
        // @TODO User Auth needed here
        pre: [checkIpWhiteList],
        handler: () => ServiceController.find(),
        tags: ['api', 'services'],
        description: 'Get all Services',
        notes: 'Returns all the services',
        plugins: {
          'hapi-swagger': {
            responses: {
              200: {
                schema: standardizeSchema(responseSchema)
              }
            }
          }
        }
      }
    });

    /**
     * Get one service
     *
     * @method GET
     * @param {String} id
     */
    server.route({
      method: 'GET',
      path: '/{id}',
      options: {
        // @TODO User Auth needed here
        handler: (request) => ServiceController.findOne(request.params.id),
        tags: ['api', 'services'],
        description: 'Get a Service',
        notes: 'Returns a specific service',
        validate: {
          failAction: failValidationHandler,
          params: joi.object({
            id: joi.string().required()
          })
        },
        plugins: {
          'hapi-swagger': {
            responses: {
              200: {
                schema: standardizeSchema(responseSchema, false)
              }
            }
          }
        }
      }
    });

    /**
     * Create one service
     *
     * @method POST
     * @see creationSchema
     */
    server.route({
      method: 'POST',
      path: '/',
      options: {
        // @TODO User Auth might be possible instead of whitelist and sign
        pre: [checkIpWhiteList, checkSignature],
        handler: async (request, h) => {
          try {
            const password = generatePassword.generate({
              length: 64,
              symbols: true,
              numbers: true,
              strict: true
            });

            const service = await ServiceController.create({
              ...request.payload,
              key: password,
              ip: request.info.remoteAddress
            });

            if (service.isBoom) {
              logger.error('Service Creation Handler Error: Service creation failed', service);
              return Boom.boomify(service);
            }

            const encryptor = makeRsaPrivateEncrypter();
            return h.response(encryptor(password)).code(201);
          } catch (error) {
            logger.error('Service Creation Handler Error', error);
            return Boom.boomify(error);
          }
        },
        payload: {
          allow: 'application/json'
        },
        validate: {
          failAction: failValidationHandler,
          payload: creationSchema
        },
        tags: ['api', 'services'],
        description: 'Create a Service',
        notes: 'Register a service and returns it',
        plugins: {
          'hapi-swagger': {
            responses: {
              201: {
                schema: standardizeSchema(responseSchema)
              }
            }
          }
        }
      }
    });

    /**
     * Delete services
     *
     * @method DELETE
     * @payload {Array} identifiers
     */
    server.route({
      method: 'DELETE',
      path: '/',
      options: {
        // @WARNING User Auth needed here
        pre: [checkIpWhiteList],
        handler: async (request, h) => {
          const deletion = await ServiceController.remove(request.payload.ids);
          if (deletion instanceof Error) {
            return deletion;
          }
          return h.response(deletion).code(202);
        },
        validate: {
          failAction: failValidationHandler,
          payload: joi.object({
            ids: joi
              .array()
              .items(joi.string().required().example('podcast-service-john'))
              .required()
          })
        },
        tags: ['api', 'services'],
        description: 'Delete Services',
        notes: 'Deletes services and returns their id to confirm',
        plugins: {
          'hapi-swagger': {
            responses: {
              202: {
                schema: standardizeSchema(
                  joi.object({
                    // prettier-ignore
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
     * Log in a service
     *
     * @method POST
     */
    server.route({
      method: 'POST',
      path: '/login',
      options: {
        handler: (request) => {
          try {
            const privateDecrypter = makeRsaPrivateDecrypter();
            const key = privateDecrypter(request.payload.key);

            return ServiceController.login(
              {
                ...request.payload,
                key
              },
              request.info.remoteAddress
            );
          } catch (error) {
            logger.error('Service Login Handler Error,', error);
            return Boom.unauthorized();
          }
        },
        validate: {
          failAction: failValidationHandler,
          payload: joi.object({
            // prettier-ignore
            identifier: joi
              .string()
              .required()
              .example('podcast-service-john')
              .required(),
            // prettier-ignore
            key: joi
            .string()
            .required()
            .example('wxWxBcq9hd9WEXh1Al5pa0Kh0').required()
          })
        },
        tags: ['api', 'services'],
        description: 'Log in a Service',
        notes: 'Login a service to get JWT tokens',
        plugins: {
          'hapi-swagger': {
            responses: {
              200: {
                schema: standardizeSchema(
                  joi.object({
                    accessToken: joi
                      .string()
                      .example(
                        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXJ2aWNlIjoidGVzdC1zZXJ2aWNlIiwiaWF0IjoxNTk4NzM2MTk1LCJleHAiOjE1OTg3MzY0OTUsImp0aSI6IjQ5ZTRjYjJmLTBlYWItNDg1Yy1hZWVkLTcwZjYxNGU3MjFjOCJ9.JW9UFBHHES6N8LVDXq-sxxImAR_8cjV-rrCt_PRTEc0'
                      ),
                    refreshToken: joi
                      .string()
                      .example(
                        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXJ2aWNlIjoidGVzdC1zZXJ2aWNlIiwiaWF0IjoxNTk4NzM2MTk1LCJleHAiOjE1OTg4MjI1OTUsImp0aSI6IjgxZTZlNzBmLTgyZmMtNDE3Ny04MWZmLWY0ODczYmEwMGFlYSJ9.Von77aOucYQvf-_N9bZOtCw46adzg4dQSUzLBfSwXds'
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
     * Refresh tokens for a service
     *
     * @method POST
     */
    server.route({
      method: 'POST',
      path: '/refresh',
      options: {
        handler: ({ payload }) => ServiceController.refresh(payload),
        validate: {
          failAction: failValidationHandler,
          payload: joi.object({
            accessToken: joi.string().required(),
            refreshToken: joi.string().required()
          })
        },
        tags: ['api', 'services'],
        description: "Refresh a Service's tokens",
        notes: 'Refresh JWT tokens for a service',
        plugins: {
          'hapi-swagger': {
            responses: {
              200: {
                schema: standardizeSchema(
                  joi.object({
                    accessToken: joi
                      .string()
                      .example(
                        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXJ2aWNlIjoidGVzdC1zZXJ2aWNlIiwiaWF0IjoxNTk4NzM2MTk1LCJleHAiOjE1OTg3MzY0OTUsImp0aSI6IjQ5ZTRjYjJmLTBlYWItNDg1Yy1hZWVkLTcwZjYxNGU3MjFjOCJ9.JW9UFBHHES6N8LVDXq-sxxImAR_8cjV-rrCt_PRTEc0'
                      ),
                    refreshToken: joi
                      .string()
                      .example(
                        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXJ2aWNlIjoidGVzdC1zZXJ2aWNlIiwiaWF0IjoxNTk4NzM2MTk1LCJleHAiOjE1OTg4MjI1OTUsImp0aSI6IjgxZTZlNzBmLTgyZmMtNDE3Ny04MWZmLWY0ODczYmEwMGFlYSJ9.Von77aOucYQvf-_N9bZOtCw46adzg4dQSUzLBfSwXds'
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
