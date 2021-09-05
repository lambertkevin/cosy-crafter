import _ from 'lodash';
import Hapi from '@hapi/hapi';
import Inert from '@hapi/inert';
import Vision from '@hapi/vision';
import { auth } from '@cosy/auth';
import HapiJWT from 'hapi-auth-jwt2';
import { logger } from '@cosy/logger';
import HapiSwagger from 'hapi-swagger';
import jsonApiStandardize from '@cosy/json-api-standardize';
import { nodeConfig, swaggerConfig } from './config';
import apis from './api';

export default async () => {
  try {
    const server = Hapi.server(nodeConfig);
    await auth();
    await server.register([
      Inert,
      Vision,
      HapiJWT,
      {
        plugin: jsonApiStandardize,
        options: {
          ignorePlugins: ['hapi-swagger']
        }
      },
      {
        plugin: HapiSwagger,
        options: swaggerConfig
      }
    ]);

    server.auth.strategy('service-jwt', 'jwt', {
      key: process.env.SERVICE_JWT_SECRET,
      validate: async (decoded) => ({ isValid: Boolean(decoded.service) }),
      errorFunc: (error, request) => {
        logger.error('Storage Service Request JWT Error', _.pick(request, ['info', 'auth']));

        return error;
      }
    });

    await server.register(apis);
    await server.start();

    console.log('Server running on %s', server.info.uri);
    return server;
  } catch (err) /* istanbul ignore next */ {
    logger.fatal('Fatal Error while starting the service', err);
    process.exit(0);
  }
};

// istanbul ignore if
if (process.env.NODE_ENV !== 'test') {
  process.on('unhandledRejection', (err) => {
    logger.fatal('unhandledRejection', err);
    process.exit(1);
  });
}
