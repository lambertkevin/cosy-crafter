import fs from 'fs';
import joi from 'joi';
import _ from 'lodash';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { v4 as uuid } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import { sentry, logger } from '@cosy/logger';
import { makeAxiosInstance } from '@cosy/axios-utils';
import {
  fileSchema,
  filesSchema,
  jobIdSchema,
  nameSchema,
  socketSchema
} from '../schemas';
import { getMp3ListDuration } from '../utils/Mp3Utils';
import { refresh, tokens } from '../auth';
import {
  getCrossFadeFilters,
  percentageFromTimemark
} from '../utils/FfmpegUtils';

const {
  STORAGE_SERVICE_NAME,
  STORAGE_SERVICE_PORT,
  PODCAST_SERVICE_NAME,
  PODCAST_SERVICE_PORT
} = process.env;
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
      if (file?.type === 'podcast-part') {
        const filepath = path.resolve('./', 'cache', `${file.id}`);

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
            logger.error('Error while getting files to transcode', e);

            const storageServiceError = new Error(
              'Failed to fetch a file from storage service'
            );
            storageServiceError.name = 'StorageServiceError';
            storageServiceError.details = e;
            storageServiceError.code = 424;

            reject(storageServiceError);
          });
      }

      const fileTypeError = new Error('File fetch error: File type is invalid');
      fileTypeError.name = 'FileTypeError';

      return reject(fileTypeError);
    } catch (e) {
      logger.error('Error while getting files to transcode', e);
      return reject(e);
    }
  });

/**
 * Join multiple audio files through a ffmpeg pipe
 *
 * @param {Array<Object>} files
 * @param {String} jobId
 * @param {socket.Socket} socket
 *
 * @return {Promise<String>} [mergedFilePath]
 */
export const joinFiles = async (files, jobId, socket) => {
  const argsSchema = joi.object({
    files: joi
      .array()
      .items(fileSchema.append({ path: joi.string().required() }))
      .required(),
    jobId: jobIdSchema,
    socket: socketSchema
  });

  const { error: argsError } = await argsSchema.validateAsync({
    files,
    jobId,
    socket
  });

  if (argsError) {
    throw argsError;
  }

  // Add final silence for fadeout with acrossfade
  files.push({
    path: path.resolve('./src/utils/files/10s-silence.mp3'),
    seek: {
      end: 4
    }
  });

  const filesPaths = files.map((x) => x.path);
  // Get total duration of the combined mp3s
  const { duration, values } = await getMp3ListDuration(filesPaths);

  return new Promise((resolve, reject) => {
    const mergedFilePath = path.join(
      path.resolve('./'),
      'tmp',
      `${uuid()}.mp3`
    );
    const ff = ffmpeg();

    for (let i = 0; i < files.length; i += 1) {
      if (files[i] && fs.existsSync(files[i].path)) {
        let inputOptions = [];
        if (files[i].seek) {
          inputOptions = [
            `-ss ${files[i]?.seek?.start ?? 0}`,
            `-to ${files[i]?.seek?.end ?? values[i]}`
          ];
        }
        ff.input(files[i].path).inputOptions(inputOptions);
      }
    }

    const crossFadeFilters = getCrossFadeFilters(files, duration);
    if (crossFadeFilters) {
      ff.complexFilter(crossFadeFilters);
    }

    ff.on('start', () => {
      if (process.env.NODE_ENV === 'development') {
        console.time('merge');
      }
      const killProcess = () => {
        ff.kill('SIGSTOP');
        reject(new Error('Stopped by worker'));
      };
      socket.on(`kill-job-${jobId}`, killProcess);
      socket.on(`disconnect`, killProcess);
    })
      .on('progress', ({ timemark }) => {
        const percent = percentageFromTimemark(timemark, duration);
        if (process.env.NODE_ENV === 'development') {
          console.log(percent);
        }
        socket.emit(`job-progress-${jobId}`, {
          percent
        });
      })
      .on('end', () => {
        if (process.env.NODE_ENV === 'development') {
          console.timeEnd('merge');
        }
        socket.emit(`job-progress-${jobId}`, {
          percent: 100
        });
        resolve(mergedFilePath);
      })
      .on('error', (err) => {
        console.log(err);
        logger.error(`[${jobId}] Error while transcoding`, err);
        reject(err);
      })
      // .audioQuality(5) /** @WARNING Try different qualities to optimize transcoding time */
      .save(mergedFilePath);
  });
};

/**
 * Upload a file as Craft on the storage-service
 *
 * @param {String} filepath
 * @param {String} jobId
 *
 * @return {Promise<Object|Error>}
 */
export const upload = async (filepath, jobId) => {
  if (typeof filepath !== 'string') {
    const filePathError = new Error('Filepath is invalid');
    filePathError.name = 'FilePathError';

    throw filePathError;
  }

  if (!fs.existsSync(filepath)) {
    const fileNotFound = new Error("File doesn't exist");
    fileNotFound.name = 'FileNotFound';

    throw fileNotFound;
  }

  if (typeof jobId !== 'string' || !jobId) {
    const jobIdError = new Error('JobId is invalid');
    jobIdError.name = 'JobIdError';

    throw jobIdError;
  }

  const formData = new FormData();
  formData.append('file', fs.createReadStream(filepath));
  formData.append('filename', path.basename(filepath));

  try {
    const axiosAsService = makeAxiosInstance(refresh);
    const { data: savingFile } = await axiosAsService.post(
      `http://${STORAGE_SERVICE_NAME}:${STORAGE_SERVICE_PORT}/v1/crafts`,
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
    const savedFile = savingFile?.data ?? {};

    if (_.isEmpty(savedFile)) {
      const saveError = new Error('An error occured while saving the file');
      saveError.name = 'SaveError';

      throw saveError;
    }
    return savedFile;
  } catch (error) {
    logger.error(`[${jobId}]Error while uploading a craft`, {
      error,
      filepath
    });

    if (error.isAxiosError) {
      const uploadServiceError = new Error('Storage service returned an error');
      uploadServiceError.name = 'UploadServiceError';
      uploadServiceError.details = error;
      uploadServiceError.code = 417;

      throw uploadServiceError;
    }
    throw error;
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
export const createTranscodeJob = async (
  { files, name, jobId } = {},
  ack,
  socket
) => {
  let transaction;
  try {
    const { error: argsError } = joi
      .object({
        files: filesSchema,
        name: nameSchema,
        jobId: jobIdSchema,
        ack: joi.function().required(),
        socket: socketSchema
      })
      .validate({ files, name, jobId, ack, socket });

    if (argsError) {
      const payloadError = new Error(`Payload invalid: ${argsError.message}`);
      payloadError.name = 'PayloadError';
      payloadError.code = 400;

      throw payloadError;
    }

    if (busyFlag) {
      const workerBusyError = new Error('Resource is busy');
      workerBusyError.name = 'WorkerBusy';
      workerBusyError.code = 429;

      throw workerBusyError;
    }

    busyFlag = true;

    if (process.env.NODE_ENV === 'production') {
      sentry.setTag('jobId', jobId);
      transaction = sentry.startTransaction({
        name: 'Transcoding Job'
      });
      sentry.configureScope((scope) => {
        scope.setSpan(transaction);
      });
    }

    logger.info(`Received Job`, { jobId, files, name });

    // --- Start Download Files
    let downloadFilesSpan;
    if (process.env.NODE_ENV === 'production') {
      downloadFilesSpan = transaction.startChild({
        data: {
          files
        },
        op: 'Download Files',
        description: 'Download all the files necessary to the transcoding'
      });
    }

    const filesPaths = await Promise.all(files.map((x) => getFile(x)));
    downloadFilesSpan?.finish();
    logger.info(`Files Downloaded`, { jobId, filesPaths });
    // --- End Download Files

    const filesWithPaths = files.map((x, i) => ({
      ...x,
      path: filesPaths[i]
    }));

    // --- Start Transcoding
    let transcodingSpan;
    if (process.env.NODE_ENV === 'production') {
      transcodingSpan = transaction.startChild({
        data: {
          filesWithPaths
        },
        op: 'Transcoding',
        description: 'Joining and crossfading files into a single audio file'
      });
    }

    // Will emit progress
    logger.info(`Start Transcoding`, { jobId, filesWithPaths });
    const mergedFilePath = await joinFiles(filesWithPaths, jobId, socket);
    transcodingSpan?.finish();
    // --- End Transcoding

    // --- Start Uploading
    let uploadingSpan;
    if (process.env.NODE_ENV === 'production') {
      uploadingSpan = transaction.startChild({
        data: {
          mergedFilePath
        },
        op: 'Uploading',
        description: 'Uploading the joined audio file'
      });
    }

    logger.info(`Start Uploading`, { jobId, mergedFilePath });
    // Upload file
    const savedFile = await upload(mergedFilePath, jobId);
    logger.info(`File Uploaded`, { jobId, savedFile });
    uploadingSpan?.finish();
    // --- End Uploading

    if (!savedFile || _.isEmpty(savedFile)) {
      throw new Error('The saved file is incorrect', { mergedFilePath, jobId });
    }

    // --- Start Saving Craft
    const payload = {
      name,
      jobId,
      /** @WARNING Add when users are added to auth service */
      // user : ''
      storageType: savedFile.storageType,
      storagePath: savedFile.location,
      storageFilename: savedFile.filename
    };

    let savingCraftSpan;
    if (process.env.NODE_ENV === 'production') {
      savingCraftSpan = transaction.startChild({
        data: payload,
        op: 'Saving Craft',
        description: 'Saving the craft in the podcast service'
      });
    }

    const axiosAsService = makeAxiosInstance(refresh);
    const { data: savedCraft } = await axiosAsService.post(
      `http://${PODCAST_SERVICE_NAME}:${PODCAST_SERVICE_PORT}/v1/crafts`,
      payload,
      {
        headers: {
          authorization: tokens.accessToken
        }
      }
    );
    savingCraftSpan?.finish();
    // --- End Saving Craft

    // Delete old file
    fs.unlink(mergedFilePath, (error) => {
      if (error) {
        logger.error(`Error while deleting temp merge file`, {
          error,
          jobId,
          mergedFilePath
        });
      }
    });

    // Finish job
    return ack({
      statusCode: 201,
      data: {
        craftId: savedCraft?.data?._id
      }
    });
  } catch (e) {
    logger.error(`Error in createTranscodeJob`, e);

    if (typeof ack !== 'function') {
      throw e;
    }

    // Check if error is a custom error and not a native one
    if (!_.isError(e)) {
      return ack({
        statusCode: e.code,
        errorName: e.name,
        message: e.message
      });
    }

    return ack({
      statusCode: 500,
      errorName: e.name,
      message: 'An error has occured'
    });
  } finally {
    transaction?.finish();
    busyFlag = false;
  }
};

export default {
  getFile,
  joinFiles,
  upload,
  createTranscodeJob
};
