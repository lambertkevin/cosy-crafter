/**
 * Config for Node
 * @type {Object}
 */
export const nodeConfig = {
  port: 3000
};

/**
 * Config for DB
 * @type {Object}
 */
export const databaseConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  db: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};
