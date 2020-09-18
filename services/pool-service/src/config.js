export const identifier = `${process.env.POOL_SERVICE_NAME}-leia`;

/**
 * Config for Node
 * @type {Object}
 */
export const nodeConfig = {
  apiPort: process.env.POOL_SERVICE_PORT || 3004,
  workerPort: process.env.POOL_SERVICE_WORKER_PORT || 3005
};
