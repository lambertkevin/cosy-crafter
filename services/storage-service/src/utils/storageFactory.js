import path from 'path';
import { Storage, StorageType } from '@tweedegolf/storage-abstraction';

export default () => {
  try {
    const storages = {
      scaleway: new Storage({
        type: StorageType.S3,
        bucketName: process.env.SCALEWAY_BUCKET_NAME,
        region: process.env.SCALEWAY_REGION,
        endpoint: process.env.SCALEWAY_ENDPOINT,
        accessKeyId: process.env.SCALEWAY_ACCESS_KEY_ID,
        secretAccessKey: process.env.SCALEWAY_SECRET_ACCESS_KEY
      }),

      aws: new Storage({
        type: StorageType.S3,
        bucketName: process.env.AWS_BUCKET_NAME,
        region: process.env.AWS_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
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
     * @param {Array|String} _storagesTypePriority
     * @param {ReadableStream} stream
     * @param {String} filepath
     *
     * @return {String|void} storageType {aws|scaleway|local|null}
     */
    const setFileFromReadable = async (
      _storagesTypePriority,
      stream,
      filepath
    ) => {
      const storagesPriority =
        typeof _storagesTypePriority === 'string'
          ? [_storagesTypePriority]
          : _storagesTypePriority;
      let storageName;

      for (let i = 0; i < storagesPriority.length; i += 1) {
        storageName = storagesPriority[i];
        const storage = storages[storageName];

        if (storage) {
          try {
            // eslint-disable-next-line no-await-in-loop
            await storage.addFileFromReadable(stream, filepath);
            break;
          } catch (e) {
            /** @WARNING Log dat */
            storageName = null;
          }
        }
      }

      return storageName;
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
        return null;
      }
      return storage.getFileAsReadable(`${filepath}/${filename}`);
    };

    return {
      setFileFromReadable,
      getFileAsReadable
    };
  } catch (e) {
    return e;
  }
};
