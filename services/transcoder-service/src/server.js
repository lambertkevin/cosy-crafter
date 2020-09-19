import io from 'socket.io-client';
import { logger } from './utils/Logger';
import { auth, tokens } from './auth';
import apis from './api';

const init = async () => {
  try {
    await auth();
    const pool = io.connect(
      `http://${process.env.POOL_SERVICE_NAME}:${process.env.POOL_SERVICE_WORKER_PORT}`,
      {
        extraHeaders: { Authorization: `Bearer ${tokens.accessToken}` }
      }
    );
    pool
      .once('connect', () => {
        console.log(
          `Connected to pool at: http://${process.env.POOL_SERVICE_NAME}:${process.env.POOL_SERVICE_WORKER_PORT}`
        );
        apis(pool);
      })
      .on('unauthorized', (error) => {
        if (
          error.data.type === 'UnauthorizedError' ||
          error.data.code === 'invalid_token'
        ) {
          throw new Error('Invalid Token');
        }
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
