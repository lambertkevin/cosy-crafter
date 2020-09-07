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
  logger.warn('ValidationError', error);
  if (process.env.NODE_ENV === 'prod') {
    // In prod, log a limited error message and throw the default Bad Request error.
    throw Boom.badRequest('Invalid request payload input');
  } else {
    // During development, log and respond with the full error.
    throw error;
  }
};
