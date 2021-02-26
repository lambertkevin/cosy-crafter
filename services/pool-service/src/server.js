import os from 'os';
import express from 'express';
import jwt from 'jsonwebtoken';
import socket from 'socket.io';
import { logger } from './utils/Logger';
import { nodeConfig } from './config';
import { workerHandler, transcodingQueue } from './queue';
import { auth } from './auth';
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
    const io = socket(server);

    io.of('/clients').on('connection', async (client) => {
      apis(client);
    });

    io.of('/workers')
      .use((worker, next) => {
        try {
          const { token } = worker.handshake.auth;
          jwt.verify(token, process.env.SERVICE_JWT_SECRET);
          // eslint-disable-next-line no-param-reassign
          worker.handshake.decodedToken = jwt.decode(token);
          next();
        } catch (error) {
          if (['JsonWebTokenError', 'TokenExpiredError'].includes(error.name)) {
            error.data = { name: error.name, message: error.message };
            next(error);
          } else {
            next(new Error('An error has occured'));
            setTimeout(() => {
              worker.disconnect();
            }, 200);
          }
        }
      })
      .on('connection', (worker) => {
        console.log(worker);
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
