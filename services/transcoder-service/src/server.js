import socketClient from 'socket.io-client';
import { logger } from './utils/Logger';
import { auth } from './auth';
import apis from './api';

const init = async () => {
  try {
    await auth();
    const pool = socketClient(
      `http://${process.env.POOL_SERVICE_NAME}:${process.env.POOL_SERVICE_WORKER_PORT}`
    );
    pool.once('connect', () => {
      console.log(
        `Connected to pool at: http://${process.env.POOL_SERVICE_NAME}:${process.env.POOL_SERVICE_WORKER_PORT}`
      );
      apis(pool);
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
