import path from 'path';
import Boom from '@hapi/boom';
import { Readable } from 'stream';
import { Storage, StorageType } from '@tweedegolf/storage-abstraction';
import { storagesConfig } from '../config';

export default () => {
  try {
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
     * @param {Array} storagesPriorities
     * @param {ReadableStream} stream
     * @param {String} filepath
     *
     * @return {String|void} storageType {aws|scaleway|local|null}
     */
    const setFileFromReadable = async (
      storagesPriorities,
      stream,
      filepath
    ) => {
      let storageName;
      let publicLink;

      if (!(stream instanceof Readable)) {
        throw Boom.badData('File is not a stream');
      }

      for (let i = 0; i < storagesPriorities.length; i += 1) {
        storageName = storagesPriorities[i];
        const storage = storages[storageName];
        const storageConfig = storagesConfig[storageName];

        if (storage) {
          try {
            // eslint-disable-next-line no-await-in-loop
            await storage.addFileFromReadable(stream, filepath);
            if (storageConfig) {
              publicLink = storageConfig.publicLinkGenerator(filepath);
            }

            break;
          } catch (e) {
            /** @WARNING Log dat */
            storageName = null;
          }
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
      return storage.removeFile(`${filepath}/${filename}`);
    };

    return {
      storagesAvailable: Object.keys(storages),
      setFileFromReadable,
      getFileAsReadable,
      removeFile
    };
  } catch (e) {
    return e;
  }
};
