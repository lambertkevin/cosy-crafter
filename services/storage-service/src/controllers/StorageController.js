import Boom from '@hapi/boom';
import { v4 as uuid } from 'uuid';
import StorageFactory from '../utils/storageFactory';

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
  const filename = `${uuid()}.${originalFilename}`;
  const location = `/podcasts/${podcastName}`;
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

export default {
  addPodcastPartFile
};
