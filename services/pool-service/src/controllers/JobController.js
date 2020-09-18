import _ from 'lodash';
import { makeJob } from '../lib/JobFactory';
import { logger } from '../utils/Logger';
import { transcodingQueue } from '../queue';

export const createTranscodingJob = ({ name, files }, ack) => {
  try {
    const transcodingJob = makeJob(
      (job, socket) =>
        new Promise((resolve, reject) => {
          socket.emit(
            'transcode/join',
            {
              jobId: job.id,
              name,
              files
            },
            (response) => {
              if (response.statusCode !== 200) {
                logger.error(
                  'Transcode/Join in job controller failed',
                  response
                );
                ack({
                  statusCode: 500,
                  message: 'Transcode/Join failed'
                });
                return reject(new Error('Transcode Failed'));
              }
              logger.info(
                'Transcode/Join in job controller finished',
                response
              );
              ack({
                statusCode: 200,
                response: _.get(response, ['savedCraft', 'data'])
              });
              return resolve(response);
            }
          );

          socket.on(`job-progress-${job.id}`, ({ percent }) => {
            // eslint-disable-next-line no-param-reassign
            job.progress = percent;
          });
        }),
      {
        retries: 1
      }
    );

    transcodingQueue.addJob(transcodingJob);
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
