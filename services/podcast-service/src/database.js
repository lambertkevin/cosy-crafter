import mongoose from 'mongoose';
import { databaseConfig } from './config';
import { logger } from './utils/Logger';

const mongoURL = `mongodb://${databaseConfig.username}:${databaseConfig.password}@${databaseConfig.host}:${databaseConfig.port}/${databaseConfig.db}`;

export default () => {
  mongoose
    .connect(mongoURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    .then(() => console.log('Database connected'))
    .catch((err) =>
      /** @WARNING Change this to fatal when feature available in winston + sentry */
      logger.error(`Database connection error: ${err.message}`, err)
    );
};
