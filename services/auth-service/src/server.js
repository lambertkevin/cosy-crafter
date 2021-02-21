import Hapi from '@hapi/hapi';
import Inert from '@hapi/inert';
import Vision from '@hapi/vision';
import HapiSwagger from 'hapi-swagger';
import killPort from 'kill-port';
import { nodeConfig, swaggerConfig } from './config';
import { logger } from './utils/Logger';
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
        plugin: HapiSwagger,
        options: swaggerConfig
      }
    ]);
    await server.register(apis);
    await killPort(nodeConfig.port);
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
