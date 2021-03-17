import path from 'path';
import S3rver from 's3rver';

// Start fake S3 servers for aws and scaleway
export default async () => {
  const aws = new S3rver({
    hostname: '0.0.0.0',
    port: 4501,
    silent: true,
    directory: path.resolve('./', 'bucket', 'tests', 'aws'),
    configureBuckets: [
      {
        name: process.env.AWS_BUCKET_NAME
      }
    ]
  });

  const scaleway = new S3rver({
    hostname: '0.0.0.0',
    port: 4500,
    silent: true,
    directory: path.resolve('./', 'bucket', 'tests', 'scaleway'),
    configureBuckets: [
      {
        name: process.env.SCALEWAY_BUCKET_NAME
      }
    ]
  });

  await aws.run();
  await scaleway.run();

  return [aws, scaleway];
};
