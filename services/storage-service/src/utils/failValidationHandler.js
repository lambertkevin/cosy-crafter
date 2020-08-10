import Boom from '@hapi/boom';

/**
 * Async function that allows errors to be shown as
 * API responses when in dev mode
 * @param {Object} request
 * @param {Object} h
 * @param {Object} err
 * @return {Promise}
 */
export default async (request, h, err) => {
  if (process.env.NODE_ENV === 'prod') {
    // In prod, log a limited error message and throw the default Bad Request error.
    console.error('ValidationError:', err.message); // Better to use an actual logger here.
    throw Boom.badRequest('Invalid request payload input');
  } else {
    // During development, log and respond with the full error.
    console.error(err);
    throw err;
  }
};
