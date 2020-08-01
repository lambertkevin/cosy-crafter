import Hapi from '@hapi/hapi';
import { nodeConfig as config } from './config';
import apis from './api';
import db from './database';

const init = async () => {
  const server = Hapi.server(config);
  await db();
  await server.register(apis);
  await server.start();
  console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

init();
