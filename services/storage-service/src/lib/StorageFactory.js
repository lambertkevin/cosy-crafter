import path from 'path';
import Boom from '@hapi/boom';
import { Readable } from 'stream';
import { logger } from '@cosy/logger';
import CustomError from '@cosy/custom-error';
import { Storage, StorageType } from '@tweedegolf/storage-abstraction';
import { storagesConfig } from '../config';

export default () => {
  // istanbul ignore next
  const storages =
    process.env.NODE_ENV === 'test'
      ? {
          scaleway: new Storage({
            type: StorageType.S3,
            accessKeyId: 'S3RVER',
            secretAccessKey: 'S3RVER',
            s3ForcePathStyle: true,
            bucketName: process.env.SCALEWAY_BUCKET_NAME,
            endpoint: 'http://localhost:4500'
          }),

          aws: new Storage({
            type: StorageType.S3,
            accessKeyId: 'S3RVER',
            secretAccessKey: 'S3RVER',
            s3ForcePathStyle: true,
            bucketName: process.env.AWS_BUCKET_NAME,
            endpoint: 'http://localhost:4501'
          }),

          local: new Storage({
            type: StorageType.LOCAL,
            directory: path.resolve('./bucket/tests/local'),
            mode: '750'
          })
        }
      : {
          scaleway: new Storage({
            type: StorageType.S3,
            ...storagesConfig.scaleway
          }),

          aws: new Storage({
            type: StorageType.S3,
            ...storagesConfig.aws,
            useDualStack: true,
            sslEnabled: true
          }),

          local: new Storage({
            type: StorageType.LOCAL,
            directory: path.resolve('./bucket'),
            mode: '750'
          })
        };
  /**
   * Will upload a stream to one of the storage available
   * depending on a priority list given as argument
   *
   * @param {Array} storagePriorities
   * @param {ReadableStream} stream
   * @param {String} filepath
   *
   * @return {String|void} storageType {aws|scaleway|local|null}
   */
  const setFileFromReadable = async (storagePriorities, stream, filepath) => {
    if (!(stream instanceof Readable)) {
      throw Boom.badData('File is not a stream');
    }

    let storageName;
    let publicLink;
    for (let i = 0; i < storagePriorities.length; i += 1) {
      storageName = storagePriorities[i];
      const storage = storages[storageName];

      try {
        if (storage) {
          await storage.addFileFromReadable(stream, filepath);
          publicLink = storagesConfig?.[storageName]?.publicLinkGenerator(filepath);

          // If addFileFromReadable didn't fail, we just exit the loop
          break;
        } else {
          throw new CustomError("Storage doesn't exist", 'StorageNotExisting');
        }
      } catch (error) {
        logger.warn('StorageFactory Error: Storage option has failed', {
          error,
          args: {
            storagePriorities,
            storage,
            filepath
          }
        });
        storageName = null;
      }
    }

    if (!storageName) {
      throw Boom.serverUnavailable('All storage options have failed');
    }

    return {
      storageName,
      publicLink
    };
  };

  /**
   * Get a file from a storage type returned as a stream
   *
   * @param {String} storageType
   * @param {String} filepath
   * @param {String} filename
   *
   * @return {Promise<ReadableStream>}
   */
  const getFileAsReadable = (storageType, filepath, filename) => {
    const storage = storages[storageType];

    if (!storage) {
      throw Boom.badData('Storage type not existing');
    }

    if (!filepath || !filename) {
      throw Boom.notFound();
    }

    return storage.getFileAsReadable(`${filepath}/${filename}`);
  };

  /**
   * Remove a file from a storage type
   *
   * @param {String} storageType
   * @param {String} filepath
   * @param {String} filename
   *
   * @return {Promise<void>}
   */
  const removeFile = (storageType, filepath, filename) => {
    const storage = storages[storageType];

    if (!storage) {
      throw Boom.badData('Storage type not existing');
    }

    if (!filepath || !filename) {
      throw Boom.notFound();
    }

    return storage.removeFile(`${filepath}/${filename}`);
  };

  return {
    storagesAvailable: Object.keys(storages),
    setFileFromReadable,
    getFileAsReadable,
    removeFile
  };
};
