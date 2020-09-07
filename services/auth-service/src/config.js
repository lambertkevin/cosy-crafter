import Package from '../package.json';

export const identifier = `${process.env.AUTH_SERVICE_NAME}-kathlene`;

/**
 * Config for Node
 * @type {Object}
 */
export const nodeConfig = {
  port: process.env.AUTH_SERVICE_PORT || 3000
};

/**
 * Config for Swagger
 * @type {Object}
 */
export const swaggerConfig = {
  info: {
    title: 'Auth Service API',
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
  db: process.env.AUTH_DB_NAME,
  username: process.env.AUTH_DB_USER,
  password: process.env.AUTH_DB_PASSWORD
};
