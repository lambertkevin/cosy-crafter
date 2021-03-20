import Boom from "@hapi/boom";
import isNil from "lodash.isnil";

const standardized = Symbol("standardized");

/**
 *
 * @param {Error} err
 *
 * @return {Boom}
 */
export const standardizeError = (err) => {
  if (err.isBoom) {
    return err;
  }

  return Boom.badImplementation(err);
};

export const reformat = (payload, statusCode = 200) => {
  if (payload[standardized]) {
    return payload;
  }

  return {
    [standardized]: true,
    statusCode,
    data: payload,
    meta: {},
  };
};

/**
 * Mutate a hapi response to respond with
 * a standardized payload
 *
 * @param {Object} response
 *
 * @return {Object|Boom} response
 */
export const standardizeResponse = (response) => {
  const { source } = response;
  const { statusCode = 200 } = response;

  if (!isNil(source)) {
    response.source = reformat(source, statusCode);
    return response;
  }

  return Boom.notFound(
    `The resource with that ID does not exist or has already been deleted.`
  );
};

export default {
  name: "json-api-standardize",
  register(server, { ignorePlugins = [] }) {
    const preResponse = (request, h) => {
      if (ignorePlugins.includes(request?.route?.realm?.plugin)) {
        return h.continue;
      }

      if (request?.response instanceof Error) {
        return standardizeError(request.response);
      }
      return standardizeResponse(request.response);
    };

    server.ext("onPreResponse", preResponse);
  },
};
