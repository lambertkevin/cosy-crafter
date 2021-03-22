import stream from "stream";
import Boom from "@hapi/boom";
import { logger } from "@cosy/logger";

/**
 * Async function that allows validation errors
 * to be logged and shown (only in dev mode)
 *
 * @param {Object} logger
 *
 * @return {Promise}
 */
export default async (request, h, error) => {
  if (!(error instanceof Error)) {
    return h.continue;
  }

  if (!error?._original) {
    throw error;
  }
  // Some destruc to avoid trying to log Buffer from file.
  // If logged, it stuck the Node main process and makes the service unavailable
  const safeOriginal = Object.keys(error._original).reduce((acc, key) => {
    if (Buffer.isBuffer(error._original[key])) {
      acc[key] = "Buffer<Filtered>";
    } else if (error._original[key] instanceof stream.Readable) {
      acc[key] = "Readable<Filtered>";
    } else {
      acc[key] = error._original[key];
    }
    return acc;
  }, {});
  const safeError = { ...error, _original: safeOriginal };
  logger.warn("ValidationError", safeError);
  if (process.env.NODE_ENV === "production") {
    // In prod, log a limited error message and throw the default Bad Request error.
    throw Boom.badRequest("Invalid request payload input");
  } else {
    // During development, log and respond with the full error.
    throw error;
  }
};
