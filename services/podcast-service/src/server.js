import Hapi from '@hapi/hapi';
import Inert from '@hapi/inert';
import Vision from '@hapi/vision';
import HapiSwagger from 'hapi-swagger';
import HapiJWT from 'hapi-auth-jwt2';
import { nodeConfig, swaggerConfig } from './config';
import { auth } from './auth';
import apis from './api';
import db from './database';

const init = async () => {
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
      decoded.service ? { isValid: true } : { isValid: false }
  });

  await server.register(apis);
  await server.start();
  console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

init();
