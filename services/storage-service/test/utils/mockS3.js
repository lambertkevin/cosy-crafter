import fs from 'fs';
import path from 'path';
import S3rver from 's3rver';
import { Storage, StorageType } from '@tweedegolf/storage-abstraction';
import { S3, Endpoint } from 'aws-sdk';

// Start fake S3 servers for aws and scaleway
export default async () => {
  const aws = await new S3rver({
    hostname: '0.0.0.0',
    port: 4501,
    silent: true,
    directory: path.join(path.resolve('./'), 'bucket', 'tests', 'aws'),
    configureBuckets: [
      {
        name: process.env.AWS_BUCKET_NAME
      }
    ]
  }).run();

  const scaleway = await new S3rver({
    hostname: '0.0.0.0',
    port: 4500,
    silent: true,
    directory: path.join(path.resolve('./'), 'bucket', 'tests', 'scaleway'),
    configureBuckets: [
      {
        name: process.env.SCALEWAY_BUCKET_NAME
      }
    ]
  }).run();

  return [aws, scaleway];
};
