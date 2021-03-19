import os from 'os';
import express from 'express';
import socket from 'socket.io';
import { logger } from '@cosy/logger';
import { nodeConfig } from './config';
import { workerHandler, transcodingQueue } from './queue';
import { auth, socketJwtMiddleware } from './auth';
import apis from './api';

export default async () => {
  try {
    await auth();
    const app = express();
    const server = app.listen(nodeConfig.apiPort, () => {
      console.log(
        `Server running on http://${os.hostname()}:${nodeConfig.apiPort}`
      );
    });
    const io = socket(server, {
      cors: {
        origin: process.env.NODE_ENV === 'development' ? '*' : undefined
      }
    });

    io.of('/clients')
      .use(socketJwtMiddleware)
      .on('connection', (client) => {
        if (client?.handshake?.decodedToken?.service) {
          apis(client);
        }
      });

    io.of('/workers')
      .use(socketJwtMiddleware)
      .on('connection', (worker) => {
        if (worker?.handshake?.decodedToken?.service) {
          workerHandler(worker);
        }
      });

    app.get('/details', (req, res) => {
      res.send(transcodingQueue);
    });

    return server;
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
