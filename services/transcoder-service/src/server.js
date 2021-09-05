import io from 'socket.io-client';
import { logger } from '@cosy/logger';
import { auth, refresh, tokens } from '@cosy/auth';
import apis from './api';

export default async () => {
  try {
    await auth();
    const pool = io(
      `http://${process.env.POOL_SERVICE_NAME}:${process.env.POOL_SERVICE_PORT}/workers`,
      {
        auth: (cb) =>
          cb({
            token: tokens.accessToken
          })
      }
    );

    pool
      .once('connect', () => {
        console.log(
          `Connected to pool at: http://${process.env.POOL_SERVICE_NAME}:${process.env.POOL_SERVICE_PORT}/workers`
        );
        apis(pool);
      })
      .on('connect_error', async (error) => {
        if (error?.data?.name === 'TokenExpiredError') {
          try {
            await refresh();
            pool.connect();
          } catch (err) {
            logger.error('Fatal Error while refreshing the service tokens', err);
            process.exit(0);
          }
        }
      });
  } catch (err) /* istanbul ignore next */ {
    logger.fatal('Fatal Error while starting the service', err);
    process.exit(0);
  }
};

// istanbul ignore if
if (process.env.NODE_ENV !== 'test') {
  process.on('unhandledRejection', (err) => {
    logger.fatal('unhandledRejection', err);
    process.exit(1);
  });
}
