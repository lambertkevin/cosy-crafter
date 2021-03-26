import _ from 'lodash';
import Boom from '@hapi/boom';
import { v4 as uuid } from 'uuid';
import { logger } from '@cosy/logger';
import CustomError from '@cosy/custom-error';
import { tokens, refresh } from '@cosy/auth';
import { axiosErrorBoomifier, makeAxiosInstance } from '@cosy/axios-utils';
import StorageFactory from '../lib/StorageFactory';

const { PODCAST_SERVICE_NAME, PODCAST_SERVICE_PORT, NODE_ENV } = process.env;
const storages = StorageFactory();

/**
 * Save a podcast part file
 *
 * @param {Object} payload
 * @param {ReadableStream} payload.file
 * @param {String} payload.podcastName
 * @param {String} payload.filename
 * @param {String} payload.storageType
 *
 * @return {Object}
 */
export const addPodcastPartFile = async ({
  file,
  podcastName,
  filename: originalFilename,
  storageStrategy: _storageStrategy
}) => {
  const extension = originalFilename.split('.').pop();
  const filename = `${uuid()}.${extension}`;
  const location = `podcasts/${_.kebabCase(podcastName)}`;
  // istanbul ignore next
  const defaultStorageStrategy = NODE_ENV === 'production' ? ['scaleway', 'local'] : ['local'];
  let storageStrategy;

  // Check if storageStrat is set and storages exist, else go default
  try {
    if (_storageStrategy) {
      storageStrategy = _storageStrategy.split(',').map((x) => x.trim());
      const storagesExist = storageStrategy.every((storage) =>
        storages.storagesAvailable.includes(storage)
      );

      if (!storagesExist) {
        return Boom.badData("At least one storage type doesn't exist");
      }
    } else {
      throw new CustomError('Storage strategy not specified', 'StorageStrategyUndefined');
    }
  } catch (e) {
    if (!(e instanceof CustomError)) {
      return Boom.serverUnavailable();
    }
    storageStrategy = defaultStorageStrategy;
  }

  try {
    const storedFile = await storages.setFileFromReadable(
      storageStrategy,
      file,
      `${location}/${filename}`
    );

    return {
      filename,
      location,
      storageType: storedFile.storageName,
      publicLink: storedFile.publicLink
    };
  } catch (error) {
    if (error.isBoom) {
      logger.error(`Add Podcast Part File Error: ${error.message}`, {
        originalFilename,
        filename,
        podcastName,
        storageStrategy
      });
      return error;
    }
    return Boom.boomify(error);
  }
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
  const axiosAsService = makeAxiosInstance(refresh);
  return axiosAsService
    .get(`http://${PODCAST_SERVICE_NAME}:${PODCAST_SERVICE_PORT}/v1/parts/${id}`, {
      headers: {
        authorization: tokens.accessToken
      }
    })
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
      if (error.code === 'ENOENT' || error.statusCode === 404) {
        logger.error("Get Podcast Part File Error: Part doesn't exist", error);
        return Boom.resourceGone("File doesn't exist or has been deleted in storage");
      }

      logger.error('Get Podcast Part File Error', error);
      return axiosErrorBoomifier(error);
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
export const removePodcastPartFile = async ({ storageType, storagePath, storageFilename } = {}) => {
  try {
    if (!storageType || !storagePath || !storageFilename) {
      throw Boom.badRequest();
    }

    await storages.removeFile(storageType, storagePath, storageFilename);
    return { deleted: storageFilename };
  } catch (error) {
    logger.error('Remove Podcast Part File Error', error);
    if (error.isBoom) {
      return error;
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
 * @param {String} data.storageStrategy
 *
 * @return {Promise<Object>}
 */
export const addCraftFile = async ({ file, filename, storageStrategy: _storageStrategy }) => {
  const location = 'crafts';
  const defaultStorageStrategy = ['local'];
  let storageStrategy;

  // Check if storageStrat is set and storages exist, else go default
  try {
    if (_storageStrategy) {
      storageStrategy = _storageStrategy.split(',').map((x) => x.trim());
      const storagesExist = storageStrategy.every((storage) =>
        storages.storagesAvailable.includes(storage)
      );

      if (!storagesExist) {
        return Boom.badData("At least one storage type doesn't exist");
      }
    } else {
      throw new CustomError('Storage strategy not specified', 'StorageStrategyUndefined');
    }
  } catch (e) {
    if (!(e instanceof CustomError)) {
      return Boom.serverUnavailable();
    }
    storageStrategy = defaultStorageStrategy;
  }

  try {
    const storedFile = await storages.setFileFromReadable(
      storageStrategy,
      file,
      `${location}/${filename}`
    );

    return {
      filename,
      location,
      storageType: storedFile.storageName,
      publicLink: storedFile.publicLink
    };
  } catch (error) {
    if (error.isBoom) {
      logger.error(`Add Craft File Error: ${error.message}`, {
        filename,
        location,
        storageStrategy
      });
      return error;
    }
    return Boom.boomify(error);
  }
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
  const axiosAsService = makeAxiosInstance(refresh);
  return axiosAsService
    .get(`http://${PODCAST_SERVICE_NAME}:${PODCAST_SERVICE_PORT}/v1/crafts/${id}`, {
      headers: {
        authorization: tokens.accessToken
      }
    })
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
        .header('content-disposition', `attachment; filename=${_.snakeCase(data.name)}.mp3;`);
    })
    .catch((error) => {
      if (error.code === 'ENOENT' || error.statusCode === 404) {
        logger.error("Get Craft File Error: Craft doesn't exist", error);
        return Boom.resourceGone("File doesn't exist or has been deleted in storage");
      }

      logger.error('Get Craft File Error', error);
      return axiosErrorBoomifier(error);
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
export const removeCraftFile = async ({ storageType, storagePath, storageFilename } = {}) => {
  try {
    if (!storageType || !storagePath || !storageFilename) {
      throw Boom.badRequest();
    }

    await storages.removeFile(storageType, storagePath, storageFilename);
    return { deleted: storageFilename };
  } catch (error) {
    logger.error('Remove Craft File Error', error);
    if (error.isBoom) {
      return error;
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
