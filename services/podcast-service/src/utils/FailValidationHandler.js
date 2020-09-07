import stream from 'stream';
import Boom from '@hapi/boom';
import { logger } from './Logger';

/**
 * Async function that allows errors to be shown as
 * API responses when in dev mode
 * @param {Object} request
 * @param {Object} h
 * @param {Object} error
 * @return {Promise}
 */
export default async (request, h, error) => {
  // Some destruc to avoid trying to log Buffer from file.
  // If logged, it stuck the Node main process and makes the service unavailable
  const safeOriginal = Object.keys(error._original).reduce((acc, key) => {
    if (Buffer.isBuffer(error._original[key])) {
      acc[key] = 'Buffer<Filtered>';
    } else if (error._original[key] instanceof stream.Readable) {
      acc[key] = 'Readable<Filtered>';
    } else {
      acc[key] = error._original[key];
    }
    return acc;
  }, {});
  const safeError = { ...error, _original: safeOriginal };
  logger.warn('ValidationError', safeError);
  if (process.env.NODE_ENV === 'prod') {
    // In prod, log a limited error message and throw the default Bad Request error.
    throw Boom.badRequest('Invalid request payload input');
  } else {
    // During development, log and respond with the full error.
    throw error;
  }
};
