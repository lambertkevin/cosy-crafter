import Package from '../package.json';

export const identifier = `${process.env.STORAGE_SERVICE_NAME}-florence`;

/**
 * Config for Node
 * @type {Object}
 */
export const nodeConfig = {
  port: process.env.STORAGE_SERVICE_PORT || 3000
};

/**
 * Config for Swagger
 * @type {Object}
 */
export const swaggerConfig = {
  info: {
    title: 'Storage Service API',
    version: Package.version
  },
  grouping: 'tags'
};

/**
 * Config for the object storages
 * @type {Object}
 */
export const storagesConfig = {
  scaleway: {
    bucketName: process.env.SCALEWAY_BUCKET_NAME,
    region: process.env.SCALEWAY_REGION,
    endpoint: process.env.SCALEWAY_ENDPOINT,
    accessKeyId: process.env.SCALEWAY_ACCESS_KEY_ID,
    secretAccessKey: process.env.SCALEWAY_SECRET_ACCESS_KEY,
    publicLinkGenerator(filepath) {
      const url = this.endpoint.replace('s3', `${this.bucketName}.s3`);
      return `${url}/${filepath}`;
    }
  },
  aws: {
    bucketName: process.env.AWS_BUCKET_NAME,
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    publicLinkGenerator(filepath) {
      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${filepath}`;
    }
  }
};
