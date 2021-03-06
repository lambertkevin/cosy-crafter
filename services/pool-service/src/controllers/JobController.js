import { logger } from '@cosy/logger';
import CustomError from '@cosy/custom-error';
import { makeRsaPrivateEncrypter } from '@cosy/rsa-utils';
import { makeJob } from '../lib/JobFactory';

export const createTranscodingJob = ({ name, files }, ack) => {
  try {
    const privateEncrypter = makeRsaPrivateEncrypter('pool');
    const transcodingJob = makeJob(
      (job, workerSocket) =>
        new Promise((resolve, reject) => {
          const payload = privateEncrypter({
            jobId: job.id,
            name,
            files
          });

          workerSocket.emit('transcode/join', payload, (response) => {
            if (response.statusCode !== 201) {
              logger.error('Transcode/Join in job controller failed', response);
              ack(response);
              return reject(
                new CustomError('Transcode Failed', 'TranscodingJobFailed')
              );
            }
            logger.info('Transcode/Join in job controller finished', response);
            ack(response);
            return resolve(response);
          });

          workerSocket.on(`job-progress-${job.id}`, ({ percent }) => {
            // eslint-disable-next-line no-param-reassign
            job.progress = percent;
          });
        }),
      {
        retries: 1
      }
    );

    if (process.env.NODE_ENV === 'test') {
      return ack({
        statusCode: 201,
        data: {
          location: `crafts/${name}.mp3`,
          storageType: 'local',
          publicLink: null
        }
      });
    }

    return transcodingJob;
  } catch (error) {
    logger.error('Error while creating transcoding job', error);
    return ack({
      statusCode: 500,
      message: "Couldn't create the transcoding job"
    });
  }
};

export default {
  createTranscodingJob
};
