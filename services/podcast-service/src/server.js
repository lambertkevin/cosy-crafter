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
import db from './database';

export default async () => {
  try {
    const server = Hapi.server(nodeConfig);
    await auth();
    await db();
    await server.register([
      Inert,
      Vision,
      {
        plugin: HapiSwagger,
        options: swaggerConfig
      },
      HapiJWT
    ]);

    server.auth.strategy('service-jwt', 'jwt', {
      key: process.env.SERVICE_JWT_SECRET,
      validate: async (decoded) =>
        decoded.service ? { isValid: true } : { isValid: false },
      errorFunc: (error, request) => {
        logger.error('Podcast Service Request JWT Error', {
          error,
          request: _.pick(request, ['info', 'auth'])
        });

        return error;
      }
    });

    await server.register(apis);
    await server.start();
    console.log('Server running on %s', server.info.uri);

    return server;
  } catch (err) {
    /** @WARNING Change this to fatal when feature available in winston + sentry */
    logger.error('Fatal Error while starting the service', err);
    return process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  process.on('unhandledRejection', (err) => {
    /** @WARNING Change this to fatal when feature available in winston + sentry */
    logger.error('unhandledRejection', err);
    process.exit(1);
  });
}
