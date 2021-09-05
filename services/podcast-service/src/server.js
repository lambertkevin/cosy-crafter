import _ from 'lodash';
import Hapi from '@hapi/hapi';
import Inert from '@hapi/inert';
import mongoose from 'mongoose';
import Vision from '@hapi/vision';
import { auth } from '@cosy/auth';
import HapiJWT from 'hapi-auth-jwt2';
import { logger } from '@cosy/logger';
import HapiSwagger from 'hapi-swagger';
import jsonApiStandardize from '@cosy/json-api-standardize';
import { nodeConfig, swaggerConfig } from './config';
import apis from './api';
import db from './database';

export default async () => {
  try {
    const server = Hapi.server(nodeConfig);
    await db();
    await auth();
    await server.register([
      Inert,
      Vision,
      {
        plugin: jsonApiStandardize,
        options: {
          ignorePlugins: ['hapi-swagger']
        }
      },
      {
        plugin: HapiSwagger,
        options: swaggerConfig
      },
      HapiJWT
    ]);

    server.auth.strategy('service-jwt', 'jwt', {
      key: process.env.SERVICE_JWT_SECRET,
      validate: async (decoded) => ({ isValid: Boolean(decoded.service) }),
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

    server.events.on('stop', async () => {
      await mongoose.disconnect();
    });

    console.log('Server running on %s', server.info.uri);
    return server;
  } catch (err) /* istanbul ignore next */ {
    logger.fatal('Fatal Error while starting the service', err);
    return process.exit(1);
  }
};

// istanbul ignore if
if (process.env.NODE_ENV !== 'test') {
  process.on('unhandledRejection', (err) => {
    logger.fatal('unhandledRejection', err);
    process.exit(1);
  });
}
