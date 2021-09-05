import Hapi from '@hapi/hapi';
import Inert from '@hapi/inert';
import Vision from '@hapi/vision';
import HapiSwagger from 'hapi-swagger';
import { nodeConfig, swaggerConfig } from './config';

export default async () => {
  try {
    const server = Hapi.server(nodeConfig);
    await server.register([
      Inert,
      Vision,
      {
        plugin: HapiSwagger,
        options: swaggerConfig
      }
    ]);
    await server.start();
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
