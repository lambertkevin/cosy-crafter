import os from 'os';
import express from 'express';
import socket from 'socket.io';
import socketioJwt from 'socketio-jwt';
import { logger } from './utils/Logger';
import { nodeConfig } from './config';
import { workerHandler, transcodingQueue } from './queue';
import { auth } from './auth';
import apis from './api';

export default async () => {
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

    ioWorkers
      .use(
        socketioJwt.authorize({
          secret: process.env.SERVICE_JWT_SECRET,
          handshake: true,
          auth_header_required: true
        })
      )
      .on('connection', (worker) => {
        if (worker.decoded_token.service) {
          workerHandler(worker);
        }
      });

    app.get('/details', (req, res) => {
      res.send(transcodingQueue);
    });

    app.close = () => {
      apiServer.close();
      workerServer.close();
    };

    return app;
  } catch (err) {
    /** @WARNING Change this to fatal when feature available in winston + sentry */
    logger.error('Fatal Error while starting the service', err);
    return process.exit(0);
  }
};

if (process.env.NODE_ENV !== 'test') {
  process.on('unhandledRejection', (err) => {
    logger.error('unhandledRejection', err);
    process.exit(1);
  });
}
