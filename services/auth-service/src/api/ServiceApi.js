import joi from 'joi';
import Boom from '@hapi/boom';
import generatePassword from 'generate-password';
import { responseSchema, creationSchema } from '../schemas/ServiceSchema';
import * as ServiceController from '../controllers/ServiceController';
import failValidationHandler from '../utils/FailValidationHandler';
import axiosErrorBoomifier from '../utils/AxiosErrorBoomifier';
import { calibrateSchema } from '../utils/SchemasUtils';
import { logger } from '../utils/Logger';
import {
  makeRsaPrivateDecrypter,
  makeRsaPrivateEncrypter
} from '../utils/RsaUtils';
import {
  checkSignature,
  checkIpWhiteList
} from '../middlewares/ServiceMiddleware';

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
        pre: [checkIpWhiteList],
        handler: () => ServiceController.find(),
        tags: ['api', 'services'],
        description: 'Get all Services',
        notes: 'Returns all the services',
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
     * Get one service
     *
     * @method GET
     * @param {String} identifier
     */
    server.route({
      method: 'GET',
      path: '/{identifier}',
      options: {
        handler: (request) =>
          ServiceController.findOne(request.params.identifier),
        tags: ['api', 'services'],
        description: 'Get a Service',
        notes: 'Returns a specific service',
        validate: {
          failAction: failValidationHandler,
          params: joi.object({
            identifier: joi.string().required()
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
     * Create one service
     *
     * @method POST
     * @see creationSchema
     */
    server.route({
      method: 'POST',
      path: '/',
      options: {
        pre: [checkIpWhiteList, checkSignature],
        handler: async (request) => {
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
              logger.error(
                'Service Creation Handler Error: Service creation failed',
                service
              );
              return axiosErrorBoomifier(service);
            }
            const encryptor = makeRsaPrivateEncrypter();
            return encryptor(password);
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
              200: {
                schema: calibrateSchema(responseSchema)
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
        // @TODO User Auth needed here
        pre: [checkIpWhiteList],
        handler: (request) =>
          ServiceController.remove(request.payload.identifiers),
        validate: {
          failAction: failValidationHandler,
          payload: joi.object({
            identifiers: joi
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
            identifier: joi
              .string()
              .required()
              .example('podcast-service-john')
              .required(),
            key: joi
              .string()
              .required()
              .example('wxWxBcq9hd9WEXh1Al5pa0Kh0')
              .required()
          })
        },
        tags: ['api', 'services'],
        description: 'Log in a Service',
        notes: 'Login a service to get JWT tokens',
        plugins: {
          'hapi-swagger': {
            responses: {
              200: {
                schema: calibrateSchema(
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
                schema: calibrateSchema(
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
