/* istanbul ignore file */

export const identifier = `${process.env.POOL_SERVICE_NAME}-leia`;

/**
 * Config for Node
 * @type {Object}
 */
export const nodeConfig = {
  port: process.env.POOL_SERVICE_PORT || 3004
};
