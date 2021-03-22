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

  return Boom.badImplementation(null, err);
};

export const reformat = (payload = {}, _statusCode = 200) => {
  if (payload?.[standardized]) {
    return payload;
  }

  const statusCode = Number(_statusCode);

  return {
    [standardized]: true,
    statusCode: !Number.isNaN(statusCode) ? statusCode : 200,
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
export const standardizeResponse = (response = {}) => {
  if (!response?.hasOwnProperty("source")) {
    return Boom.badImplementation("Response is invalid");
  }

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
  register(server, { ignorePlugins = [] } = {}) {
    const preResponse = (request, h) => {
      if (ignorePlugins?.includes(request?.route?.realm?.plugin)) {
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
