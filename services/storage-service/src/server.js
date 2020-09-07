import _ from 'lodash';
import Hapi from '@hapi/hapi';
import Inert from '@hapi/inert';
import Vision from '@hapi/vision';
import HapiSwagger from 'hapi-swagger';
import HapiJWT from 'hapi-auth-jwt2';
import { nodeConfig, swaggerConfig } from './config';
import { logger } from './utils/Logger';
import { auth } from './auth';
import apis from './api';

const init = async () => {
  try {
    const server = Hapi.server(nodeConfig);
    await auth();
    await server.register([
      Inert,
      Vision,
      HapiJWT,
      {
        plugin: HapiSwagger,
        options: swaggerConfig
      }
    ]);

    server.auth.strategy('service-jwt', 'jwt', {
      key: process.env.SERVICE_JWT_SECRET,
      validate: async (decoded) =>
        decoded.service ? { isValid: true } : { isValid: false },
      errorFunc: (error, request) => {
        logger.error(
          'Storage Service Request JWT Error',
          _.pick(request, ['info', 'auth'])
        );

        return error;
      }
    });

    await server.register(apis);
    await server.start();
    console.log('Server running on %s', server.info.uri);
  } catch (err) {
    /** @WARNING Change this to fatal when feature available in winston + sentry */
    logger.error('Fatal Error while starting the service', err);
    process.exit(0);
  }
};

process.on('unhandledRejection', (err) => {
  logger.error('unhandledRejection', err);
  process.exit(1);
});

init();
