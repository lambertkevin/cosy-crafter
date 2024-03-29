/* istanbul ignore file */

import Package from '../package.json';

export const identifier = `${process.env.PODCAST_SERVICE_NAME}-jessica`;

/**
 * Config for Node
 * @type {Object}
 */
export const nodeConfig = {
  port: process.env.PODCAST_SERVICE_PORT || 3000,
  routes: {
    cors: {
      origin: [process.env.CORS_ORIGIN ?? '']
    }
  }
};

/**
 * Config for Swagger
 * @type {Object}
 */
export const swaggerConfig = {
  info: {
    title: 'Podcast Service API',
    version: Package.version
  },
  grouping: 'tags'
};

/**
 * Config for DB
 * @type {Object}
 */
export const databaseConfig = {
  host: process.env.MONGO_SERVICE_NAME,
  port: process.env.MONGO_SERVICE_PORT,
  db: process.env.PODCAST_DB_NAME,
  username: process.env.PODCAST_DB_USER,
  password: process.env.PODCAST_DB_PASSWORD
};
