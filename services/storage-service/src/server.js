import Hapi from '@hapi/hapi';
import Inert from '@hapi/inert';
import { nodeConfig as config } from './config';
import StorageApi from './api/StorageApi';

const init = async () => {
  try {
    const server = Hapi.server(config);
    await server.register(Inert);
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
