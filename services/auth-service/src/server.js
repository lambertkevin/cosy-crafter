import Hapi from '@hapi/hapi';
import Inert from '@hapi/inert';
import mongoose from 'mongoose';
import Vision from '@hapi/vision';
import { logger } from '@cosy/logger';
import HapiSwagger from 'hapi-swagger';
import jsonApiStandardize from '@cosy/json-api-standardize';
import { nodeConfig, swaggerConfig } from './config';
import db from './database';
import apis from './api';

export default async () => {
  try {
    const server = Hapi.server(nodeConfig);
    await db();
    await server.register([
      Inert,
      Vision,
      {
        plugin: jsonApiStandardize,
        options: {
          ignorePlugins: 'hapi-swagger'
        }
      },
      {
        plugin: HapiSwagger,
        options: swaggerConfig
      }
    ]);
    await server.register(apis);
    await server.start();
    console.log('Server running on %s', server.info.uri);

    server.events.on('stop', async () => {
      await mongoose.disconnect();
    });

    return server;
  } catch (err) {
    console.error(err);
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
