import mongoose from 'mongoose';
import { logger } from '@cosy/logger';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { databaseConfig } from './config';

export default async () => {
  const mongoURL = await (async () => {
    if (['test', 'mock'].includes(process.env.NODE_ENV)) {
      const testDB = new MongoMemoryServer();
      const uri = await testDB.getUri();

      return uri;
    }
    return `mongodb://${databaseConfig.username}:${databaseConfig.password}@${databaseConfig.host}:${databaseConfig.port}/${databaseConfig.db}`;
  })();

  return mongoose
    .connect(mongoURL, {
      useCreateIndex: true,
      useFindAndModify: false,
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    .then(() => console.log('Database connected'))
    .catch((err) =>
      /** @WARNING Change this to fatal when feature available in winston + sentry */
      logger.error(`Database connection error: ${err.message}`, err)
    );
};
