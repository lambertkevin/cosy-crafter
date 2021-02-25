import path from 'path';
import S3rver from 's3rver';

// Start fake S3 servers for aws and scaleway
export default async () => {
  const aws = await new S3rver({
    hostname: '0.0.0.0',
    silent: false,
    directory: path.join(path.resolve('./'), 'bucket', 'tests', 'aws'),
    resetOnClose: true,
    configureBuckets: [
      {
        name: 'test-aws-bucket'
      }
    ]
  });
  const scaleway = await new S3rver({
    hostname: '0.0.0.0',
    silent: false,
    directory: path.join(path.resolve('./'), 'bucket', 'tests', 'scaleway'),
    resetOnClose: true,
    configureBuckets: [
      {
        name: 'test-scaleway-bucket'
      }
    ]
  });

  return [aws, scaleway];
};
