import os from 'os';
import express from 'express';
import socket from 'socket.io';
import { logger } from './utils/Logger';
import { nodeConfig } from './config';
import { auth } from './auth';
import apis from './api';

const init = async () => {
  try {
    await auth();
    const app = express();
    const server = app.listen(nodeConfig.port, () => {
      console.log(
        `Server running on http://${os.hostname()}:${nodeConfig.port}`
      );
    });

    const io = socket.listen(server);

    io.on('connection', async (client) => {
      apis(client);
    });
  } catch (err) {
    logger.fatal('Fatal Error while starting the service', err);
    process.exit(0);
  }
};

process.on('unhandledRejection', (err) => {
  logger.error('unhandledRejection', err);
  process.exit(1);
});

init();
