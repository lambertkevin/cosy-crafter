import _ from 'lodash';
import axios from 'axios';
import Boom from '@hapi/boom';
import jwt from 'jsonwebtoken';
import { refresh, tokens } from '../auth';

/**
 * Create an instance of axios
 *
 * @return {Promise}
 */
export const makeAxiosInstance = () => {
  const axiosInstance = axios.create();

  /**
   * Before each request, we'll add a possible retry if the
   * request need a refreshed token
   */
  axiosInstance.interceptors.request.use(async (request) => {
    const accessToken = _.get(request, ['headers', 'authorization']);
    if (accessToken) {
      try {
        jwt.verify(accessToken, process.env.SERVICE_JWT_SECRET);
      } catch (e) {
        await refresh();
        _.set(request, ['headers', 'authorization'], tokens.accessToken);
      }
    }
    return request;
  });

  return axiosInstance;
};

export const axiosErrorBoomifier = (error) => {
  if (error && error.isAxiosError) {
    const responseData = _.get(error, ['response', 'data']);

    if (responseData) {
      return new Boom.Boom(responseData.message, responseData);
    }
    return Boom.badRequest(error.message);
  }
  return Boom.boomify(error);
};

export default {
  makeAxiosInstance,
  axiosErrorBoomifier
};
