import _ from 'lodash';
import Boom from '@hapi/boom';
import calibrate from 'calibrate';
import { v4 as uuid } from 'uuid';
import { axiosErrorBoomifier, makeAxiosInstance } from '../utils/AxiosUtils';
import StorageFactory from '../utils/StorageFactory';
import { tokens } from '../auth';

const { PODCAST_SERVICE_NAME, PODCAST_SERVICE_PORT } = process.env;
const storages = StorageFactory();

/**
 * Save a podcast part file
 *
 * @param {Object} payload
 * @param {ReadableStream} payload.file
 * @param {String} payload.podcastName
 * @param {String} payload.filename
 *
 * @return {Object}
 */
export const addPodcastPartFile = async ({
  file,
  podcastName,
  filename: originalFilename
}) => {
  const extension = originalFilename.split('.').pop();
  const filename = `${uuid()}.${extension}`;
  const location = `podcasts/${_.kebabCase(podcastName)}`;
  const storageStrategy =
    process.env.NODE_ENV === 'production' ? ['scaleway', 'local'] : ['local'];
  const storedFile = await storages.setFileFromReadable(
    storageStrategy,
    file,
    `${location}/${filename}`
  );

  return storedFile
    ? calibrate.response({
        filename,
        location,
        storageType: storedFile.storageName,
        publicLink: storedFile.publicLink
      })
    : Boom.serverUnavailable('All storages options have failed');
};

/**
 * Get a podcast part file and returns it as a stream
 *
 * @param {String} id
 * @param {Object} h
 *
 * @return {Response}
 */
export const getPodcastPartFile = async (id, h) => {
  const axiosAsService = makeAxiosInstance();
  return axiosAsService
    .get(
      `http://${PODCAST_SERVICE_NAME}:${PODCAST_SERVICE_PORT}/v1/parts/${id}`,
      {
        headers: {
          authorization: tokens.accessToken
        }
      }
    )
    .then(({ data }) => data)
    .then(async ({ data }) => {
      const stream = await storages.getFileAsReadable(
        data.storageType,
        data.storagePath,
        data.storageFilename
      );

      return h.response(stream).type(data.contentType);
    })
    .catch((error) => {
      if (error.isAxiosError) {
        return axiosErrorBoomifier(error);
      }
      if (error.code === 'ENOENT' || error.statusCode === 404) {
        return Boom.resourceGone('File has been deleted in storage');
      }
      if (error.isBoom) {
        return error;
      }
      if (error.statusCode) {
        return new Boom.Boom(error.message, { statusCode: error.statusCode });
      }
      return Boom.boomify(error);
    });
};

/**
 * Remove a podcast part file
 *
 * @param {Object} data
 * @param {String} data.storageType
 * @param {String} data.storagePath
 * @param {String} data.storageFilename
 *
 * @return {Object}
 */
export const removePodcastPartFile = async ({
  storageType,
  storagePath,
  storageFilename
}) => {
  try {
    await storages.removeFile(storageType, storagePath, storageFilename);
    return calibrate.response({ deleted: storageFilename });
  } catch (e) {
    if (e.isBoom) {
      return e;
    }
    return Boom.badData();
  }
};

/**
 * Save a craft file
 *
 * @param {Object} data
 * @param {String} data.file
 * @param {String} data.filename
 *
 * @return {Promise<Object>}
 */
export const addCraftFile = async ({ file, filename }) => {
  const storagePath = `crafts`;
  const location = `${storagePath}/${filename}`;
  const storageStrategy = ['local'];
  const storedFile = await storages.setFileFromReadable(
    storageStrategy,
    file,
    location
  );

  return storedFile
    ? calibrate.response({
        storagePath,
        storageType: storedFile.storageName,
        storageFilename: filename,
        publicLink: storedFile.publicLink
      })
    : Boom.serverUnavailable('All storages options have failed');
};

/**
 * Save a craft file
 *
 * @param {String} id
 * @param {Object} h
 *
 * @return {Response}
 */
export const getCraftFile = async (id, h) => {
  const axiosAsService = makeAxiosInstance();
  return axiosAsService
    .get(
      `http://${PODCAST_SERVICE_NAME}:${PODCAST_SERVICE_PORT}/v1/crafts/${id}`,
      {
        headers: {
          authorization: tokens.accessToken
        }
      }
    )
    .then(({ data }) => data)
    .then(async ({ data }) => {
      const stream = await storages.getFileAsReadable(
        data.storageType,
        data.storagePath,
        data.storageFilename
      );

      return h
        .response(stream)
        .type('audio/mpeg')
        .header(
          'content-disposition',
          `attachment; filename=${_.snakeCase(data.name)}.mp3;`
        );
    })
    .catch((error) => {
      if (error.isAxiosError) {
        return axiosErrorBoomifier(error);
      }
      if (error.code === 'ENOENT' || error.statusCode === 404) {
        return Boom.resourceGone('File has been deleted in storage');
      }
      if (error.isBoom) {
        return error;
      }
      if (error.statusCode) {
        return new Boom.Boom(error.message, { statusCode: error.statusCode });
      }
      return Boom.boomify(error);
    });
};

/**
 * Remove a craft file
 *
 * @param {Object} data
 * @param {String} data.storageType
 * @param {String} data.storagePath
 * @param {String} data.storageFilename
 *
 * @return {Object}
 */
export const removeCraftFile = async ({
  storageType,
  storagePath,
  storageFilename
}) => {
  try {
    await storages.removeFile(storageType, storagePath, storageFilename);
    return calibrate.response({ deleted: storageFilename });
  } catch (e) {
    if (e.isBoom) {
      return e;
    }
    return Boom.badData();
  }
};

export default {
  addPodcastPartFile,
  getPodcastPartFile,
  removePodcastPartFile,
  addCraftFile,
  getCraftFile,
  removeCraftFile
};
