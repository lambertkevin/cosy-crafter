import os from 'os';
import express from 'express';
import socket from 'socket.io';
import { logger } from './utils/Logger';
import { nodeConfig } from './config';
import { workerHandler, transcodingQueue } from './queue';
import { auth } from './auth';
import apis from './api';

const init = async () => {
  try {
    await auth();
    const app = express();
    const apiServer = app.listen(nodeConfig.apiPort, () => {
      console.log(
        `Api running on http://${os.hostname()}:${nodeConfig.apiPort}`
      );
    });
    const workerServer = app.listen(nodeConfig.workerPort, () => {
      console.log(
        `Workers running on htt://${os.hostname()}:${nodeConfig.workerPort}`
      );
    });

    const ioApi = socket.listen(apiServer);
    const ioWorkers = socket.listen(workerServer);

    ioApi.on('connection', async (client) => {
      apis(client);
    });
    ioWorkers.on('connection', async (worker) => {
      workerHandler(worker);
    });

    app.get('/details', (req, res) => {
      res.send(transcodingQueue);
    });
  } catch (err) {
    /** @WARNING Change this to fatal when feature available in winston + sentry */
    logger.error('Fatal Error while starting the service', err);
    process.exit(0);
  }
};

process.on('unhandledRejection', (err) => {
  logger.error('unhandledRejection', err);
  process.exit(1);
});

init();
