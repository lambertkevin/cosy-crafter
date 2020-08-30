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
export const legacyMakeAxiosInstance = () => {
  const axiosInstance = axios.create();

  /**
   * Before each request, we'll add a possible retry if the
   * request need a refreshed token
   */
  axiosInstance.interceptors.request.use((request) => {
    if (typeof _.get(request, ['retried']) === 'undefined') {
      // eslint-disable-next-line no-param-reassign
      request.retried = false;
    }

    return request;
  });

  /**
   * After a request with an error, we'll check if the error is a token not refreshed.
   * If we didn't already tried to refresh, we'll just fallback to the errorHandler function
   */
  axiosInstance.interceptors.response.use(null, async (error) => {
    const statusCode = _.get(error, ['response', 'data', 'statusCode']);
    const message = _.get(error, ['response', 'data', 'message']);
    const { config: request = {} } = error;

    if (statusCode === 401 && message === 'Expired token' && !request.retried) {
      try {
        await refresh();
        request.retried = true;
        _.set(request, ['headers', 'authorization'], tokens.accessToken);
        console.log(request.data);
        return axiosInstance.request(request);
      } catch (e) {
        return error;
      }
    }
    return error;
  });

  return axiosInstance;
};

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
        const test = jwt.verify(accessToken, process.env.SERVICE_JWT_SECRET);
        console.log(test);
      } catch (e) {
        console.log(e);
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
