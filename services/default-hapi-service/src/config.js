import Package from '../package.json';

/**
 * Config for Node
 * @type {Object}
 */
export const nodeConfig = {
  port: process.env.XXX_SERVICE_EXPOSED_PORT || 3000
};

/**
 * Config for Swagger
 * @type {Object}
 */
export const swaggerConfig = {
  info: {
    title: 'XXX Service API',
    version: Package.version
  },
  grouping: 'tags'
};
