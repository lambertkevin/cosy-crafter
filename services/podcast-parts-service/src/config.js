/**
 * Config for Node
 * @type {Object}
 */
export const nodeConfig = {
  port: process.env.PODCAST_PARTS_SERVICE_EXPOSED_PORT
};

/**
 * Config for DB
 * @type {Object}
 */
export const databaseConfig = {
  host: process.env.MONGO_DB_HOST,
  port: process.env.MONGO_DB_PORT,
  db: process.env.PODCAST_PARTS_DB_NAME,
  username: process.env.PODCAST_PARTS_DB_USER,
  password: process.env.PODCAST_PARTS_DB_PASSWORD
};
