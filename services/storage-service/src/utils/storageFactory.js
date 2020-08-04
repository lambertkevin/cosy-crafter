import path from 'path';
import { Storage,  StorageType } from '@tweedegolf/storage-abstraction';

export default () => {
  try {
    const scaleway = new Storage({
      type: StorageType.S3,
      bucketName: process.env.SCALEWAY_BUCKET_NAME,
      region: process.env.SCALEWAY_REGION,
      endpoint: process.env.SCALEWAY_ENDPOINT,
      accessKeyId: process.env.SCALEWAY_ACCESS_KEY_ID,
      secretAccessKey: process.env.SCALEWAY_SECRET_ACCESS_KEY
    });

    const aws = new Storage({
      type: StorageType.S3,
      bucketName: process.env.AWS_BUCKET_NAME,
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      useDualStack: true,
      sslEnabled: true
    });

    const local = new Storage({
      type: StorageType.LOCAL,
      directory: path.resolve('./bucket'),
      mode: '750'
    });

    return {
      aws,
      scaleway,
      local
    };
  } catch (e) {
    return e;
  }
};
