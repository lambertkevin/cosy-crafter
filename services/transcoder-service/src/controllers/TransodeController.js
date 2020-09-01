import fs from 'fs';
import _ from 'lodash';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { v4 as uuid } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import { makeAxiosInstance, axiosErrorBoomifier } from '../utils/axiosUtils';
import { getCrossFadeFilters, getFadeFilters } from '../utils/FfmpegUtils';
import { getMp3ListDuration } from '../utils/Mp3Utils';
import { tokens } from '../auth';

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
  const { values: durationsArray, duration } = await getMp3ListDuration(paths);

  return new Promise((resolve, reject) => {
    const mergedFilePath = path.join(
      path.resolve('./'),
      'tmp',
      `${uuid()}.mp3`
    );
    const ff = ffmpeg();
    const files = paths.map((x, i) => {
      if (i === 0) {
        return {
          path: x,
          input: `${i}`,
          fadeIn: 10,
          fadeOut: 10,
          seek: {
            start: 10,
            end: 30
          }
        };
      }
      if (i === 1) {
        return {
          path: x,
          input: `${i}`,
          fadeIn: 5
        };
      }
      return {
        path: x,
        input: `${i}`
      };
    });

    for (let i = 0; i < files.length; i += 1) {
      if (files[i] && fs.existsSync(files[i].path)) {
        const inputOptions = [];
        if (files[i].seek) {
          const start = _.get(files, [i, 'seek', 'start']);
          const end = _.get(files, [i, 'seek', 'end']);
          const seekStart = start ? `-ss ${start}` : null;
          const seekEnd = end ? `-to ${end}` : null;

          inputOptions.push(seekStart);
          inputOptions.push(seekEnd);
        }
        ff.input(files[i].path).inputOptions(inputOptions);
      }
    }

    // const fadesFilters = getFadeFilters(files, durationsArray);
    const crossFadeFilters = getCrossFadeFilters(files, durationsArray);

    ff.complexFilter([
      // Either crossfades
      // ...fadesFilters,
      ...crossFadeFilters
      // Or fades + concat
      // {
      //   filter: 'concat',
      //   options: {
      //     n: files.length,
      //     a: 1,
      //     v: 0
      //   },
      //   inputs: inputsOuputs.map((x, i) => {
      //     if (x.length) {
      //       return x[x.length - 1].output;
      //     }
      //     return files[i].input;
      //   })
      // }
    ]);

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
      .on('error', (err, a, b) => {
        console.log(`An error occurred: ${err.message}`, b);
        reject(err);
      })
      .save(mergedFilePath);
  });
};

export const upload = async (filepath) => {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filepath));

  try {
    const axiosAsService = makeAxiosInstance();
    const savingFile = await axiosAsService.post(
      `http://${STORAGE_SERVICE_NAME}:${STORAGE_SERVICE_PORT}/v1/crafted`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          authorization: tokens.accessToken
        },
        maxBodyLength: 400 * 1024 * 1024, // 400MB max part size
        maxContentLength: 400 * 1024 * 1024 // 400MB max part size
      }
    );
    const savedFile = _.get(savingFile, ['data', 'data'], {});

    if (_.isEmpty(savedFile)) {
      throw new Error('An error occured while saving the file');
    }
    return savedFile;
  } catch (error) {
    return axiosErrorBoomifier(error);
  }
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
