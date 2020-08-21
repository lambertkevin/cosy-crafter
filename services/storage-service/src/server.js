import Hapi from '@hapi/hapi';
import Inert from '@hapi/inert';
import Vision from '@hapi/vision';
import HapiSwagger from 'hapi-swagger';
import { nodeConfig, swaggerConfig } from './config';
import StorageApi from './api/StorageApi';

const init = async () => {
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
    await server.register(StorageApi);
    await server.start();

    console.log('Server running on %s', server.info.uri);
  } catch (e) {
    console.log(e);
  }
};

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

init();
