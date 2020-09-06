export const identifier = `${process.env.TRANSCODER_SERVICE_NAME}-lisa`;

/**
 * Config for Node
 * @type {Object}
 */
export const nodeConfig = {
  port: process.env.TRANSCODER_SERVICE_PORT || 3003
};
