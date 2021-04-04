/* istanbul ignore file */

export const identifier = `${process.env.GATEWAY_SERVICE_NAME}-alexandra`;

/**
 * Config for Node
 * @type {Object}
 */
export const nodeConfig = {
  port: process.env.GATEWAY_SERVICE_PORT || 4000
};
