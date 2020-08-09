import _ from 'lodash';
import axios from 'axios';
import Boom from '@hapi/boom';
import { v4 as uuid } from 'uuid';
import StorageFactory from '../utils/storageFactory';
import axiosErrorBoomifier from '../utils/axiosErrorBoomifier';

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
  const storageType = await storages.setFileFromReadable(
    storageStrategy,
    file,
    `${location}/${filename}`
  );

  return storageType
    ? {
        filename,
        location,
        storageType
      }
    : Boom.serverUnavailable('All storages options have failed');
};

/**
 * Get a podcast file and returns it as a stream
 *
 * @param {String} id
 * @param {Object} h
 *
 * @return {Response}
 */
export const getPodcastPartFile = async (id, h) => {
  return axios
    .get(`http://podcast-parts-service:3000/v1/parts/${id}`)
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
      if (error.statusCode) {
        return new Boom.Boom(error.message, { statusCode: error.statusCode });
      }
      return Boom.boomify(error);
    });
};

export default {
  addPodcastPartFile,
  getPodcastPartFile
};
