import axios from "axios";
import Boom from "@hapi/boom";
import jwt from "jsonwebtoken";

/**
 * Turn an Axios error as a Boom error
 *
 * @param {Error} error
 * @returns
 */
export const axiosErrorBoomifier = (error) => {
  if (error?.isAxiosError) {
    const responseData = error?.response?.data;

    if (responseData) {
      return new Boom.Boom(responseData.message, responseData);
    }
    return Boom.badRequest(error.message);
  }
  return Boom.boomify(error);
};

/**
 * Create an instance of axios that will
 * check for jwt validity before sending
 * a request and refresh it if needed
 *
 * env SEVICE_JWT_SECRET need to be set
 *
 * @param {Promise} refreshFunc
 *
 * @return {Promise}
 */
export const makeAxiosInstance = (refreshFunc) => {
  const axiosInstance = axios.create();

  /**
   * Before each request, we'll add a possible retry if the
   * request need a refreshed token
   */
  axiosInstance.interceptors.request.use(async (request) => {
    const accessToken = request?.headers?.authorization;

    if (accessToken) {
      try {
        jwt.verify(accessToken, process.env.SERVICE_JWT_SECRET);
      } catch (e) {
        await refreshFunc();
        request.headers.authorization = tokens.accessToken;
      }
    }
    return request;
  });

  return axiosInstance;
};

export default {
  makeAxiosInstance,
  axiosErrorBoomifier,
};
