import fs from 'fs';
import _ from 'lodash';
import path from 'path';
import axios from 'axios';
import { v4 as uuid } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import { getMp3ListDuration } from '../utils/Mp3Utils';

const { STORAGE_SERVICE_NAME, STORAGE_SERVICE_PORT } = process.env;
let busyFlag = false;

/**
 * Download a file and save it to cache
 *
 * @param {Object} file
 * @param {String} file.type
 * @param {String} file.id
 *
 * @return {Promise<String>} [filepath]
 */
export const getFile = (file) =>
  new Promise((resolve, reject) => {
    try {
      if (file.type === 'podcast-part') {
        const filepath = path.join(path.resolve('./'), 'cache', `${file.id}`);

        if (fs.existsSync(filepath)) {
          return resolve(filepath);
        }

        return axios
          .get(
            `http://${STORAGE_SERVICE_NAME}:${STORAGE_SERVICE_PORT}/v1/podcast-parts/${file.id}`,
            {
              responseType: 'arraybuffer'
            }
          )
          .then(({ data }) => {
            fs.writeFileSync(filepath, data);
            resolve(filepath);
          })
          .catch((e) => {
            console.log(e);
            reject(e);
          });
      }
      return reject(new Error('File Type Error'));
    } catch (e) {
      console.log(e);
      return reject(e);
    }
  });

/**
 * Join multiple audio files through a ffmpeg pipe
 *
 * @param {Array<String>} paths
 * @param {String} jobId
 * @param {Function} ack
 * @param {socket.Socket} socket
 *
 * @return {Promise<String>} [mergedFilePath]
 */
export const joinFiles = async (paths, jobId, ack, socket) => {
  const duration = await getMp3ListDuration(paths);

  return new Promise((resolve, reject) => {
    const mergedFilePath = path.join(
      path.resolve('./'),
      'tmp',
      `${uuid()}.mp3`
    );
    const ff = ffmpeg().audioCodec('libmp3lame');

    for (let i = 0; i < paths.length; i += 1) {
      if (paths[i] && fs.existsSync(paths[i])) {
        ff.input(paths[i]);
      }
    }

    ff.on('start', () => {
      console.time('merge');
    })
      .on('progress', ({ timemark }) => {
        const percent =
          ((Date.parse(`04/21/2014 ${timemark}`) -
            Date.parse('04/21/2014 00:00:00.00')) /
            1000 /
            duration) *
          100;
        console.log(percent);
        socket.emit(`job-progress-${jobId}`, {
          percent
        });
      })
      .on('end', () => {
        console.timeEnd('merge');
        socket.emit(`job-progress-${jobId}`, {
          percent: 100
        });
        resolve(mergedFilePath);
      })
      .on('error', (err) => {
        console.log(`An error occurred: ${err.message}`);
        reject(err);
      })
      .mergeToFile(mergedFilePath);
  });
};

/**
 * Creates a job to get and transcode files
 * and upload it
 *
 * @param {Object} data
 * @param {Array<Object>} data.files
 * @param {Function} ack
 * @param {socket.Socket} socket
 *
 * @return {Promise<String|Error>}
 */
export const createTranscodeJob = async ({ files }, ack, socket) => {
  try {
    if (!_.isArray(files) || _.isEmpty(files)) {
      return ack({
        statusCode: 400,
        message: 'Files are incorrects'
      });
    }

    if (busyFlag) {
      return ack({
        statusCode: 429,
        message: 'Resource is busy'
      });
    }

    busyFlag = true;
    const jobId = uuid();

    ack({
      statusCode: 200,
      data: {
        jobId
      }
    });

    console.log('received job', jobId);
    const filesPaths = await Promise.all(files.map((x) => getFile(x)));
    console.log('files downloaded');
    // Will emit progress
    console.log('merging');
    const mergedFilePath = await joinFiles(filesPaths, jobId, ack, socket);
    // Finish Job
    busyFlag = false;

    return mergedFilePath;
  } catch (e) {
    console.log(e);
    return ack({
      statusCode: 500,
      message: 'An error has occured'
    });
  }
};
