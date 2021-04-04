import os from 'os';
import express from 'express';
import socket from 'socket.io';
import { auth } from '@cosy/auth';
import { logger } from '@cosy/logger';
import { jwtMiddleware } from './middlewares/JwtMiddleware';
import { workerHandler, transcodingQueue } from './queue';
import { nodeConfig } from './config';
import apis from './api';

export default async () => {
  try {
    await auth();
    const app = express();
    const server = app.listen(nodeConfig.port, () => {
      console.log(`Server running on http://${os.hostname()}:${nodeConfig.port}`);
    });
    const io = socket(server, {
      cors: {
        origin /* istanbul ignore next */: process.env.NODE_ENV === 'development' ? '*' : undefined
      }
    });

    io.of('/clients')
      .use(jwtMiddleware)
      .on('connection', (client) => {
        if (client?.handshake?.decodedToken?.service) {
          apis(client);
        }
      });

    io.of('/workers')
      .use(jwtMiddleware)
      .on('connection', (worker) => {
        if (worker?.handshake?.decodedToken?.service) {
          workerHandler(worker);
        }
      });

    app.get('/details', (req, res) => {
      res.send(transcodingQueue);
    });

    return server;
  } catch (err) /* istanbul ignore next */ {
    /** @WARNING Change this to fatal when feature available in winston + sentry */
    logger.error('Fatal Error while starting the service', err);
    return process.exit(0);
  }
};

// istanbul ignore if
if (process.env.NODE_ENV !== 'test') {
  process.on('unhandledRejection', (err) => {
    logger.error('unhandledRejection', err);
    process.exit(1);
  });
}
