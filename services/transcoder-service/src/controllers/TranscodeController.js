import fs from 'fs';
import joi from 'joi';
import _ from 'lodash';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { v4 as uuid } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import CustomError from '@cosy/custom-error';
import { refresh, tokens } from '@cosy/auth';
import { sentry, logger } from '@cosy/logger';
import { makeAxiosInstance } from '@cosy/axios-utils';
import { fileSchema, filesSchema, jobIdSchema, nameSchema, socketSchema } from '../schemas';
import { getMp3ListDuration } from '../utils/Mp3Utils';
import { getCrossFadeFilters, percentageFromTimemark } from '../utils/FfmpegUtils';

const {
  STORAGE_SERVICE_NAME,
  STORAGE_SERVICE_PORT,
  PODCAST_SERVICE_NAME,
  PODCAST_SERVICE_PORT
} = process.env;

let busyFlag = false;

// istanbul ignore next
export const setBusyFlag = (val) => {
  if (process.env.NODE_ENV === 'test') {
    busyFlag = val;
  } else {
    throw new CustomError(
      'This feature is only available for testing purposes in test environement',
      'AccessForbidden'
    );
  }
};

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

            const storageServiceError = new CustomError(
              'Failed to fetch a file from storage service',
              'StorageServiceError',
              424,
              e
            );
            reject(storageServiceError);
          });
      }

      const fileTypeError = new CustomError(
        'File fetch error: File type is invalid',
        'FileTypeError'
      );
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

  const { error: argsError } = argsSchema.validate({
    files,
    jobId,
    socket
  });

  if (argsError) {
    throw new CustomError(argsError.message, argsError.name, 406, argsError);
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
    const mergedFilePath = path.join(path.resolve('./'), 'tmp', `${uuid()}.mp3`);
    const ff = ffmpeg();

    for (let i = 0; i < files.length; i += 1) {
      // File existence has already been tested by getMp3ListDuration
      const inputOptions = files[i].seek
        ? [`-ss ${files[i]?.seek?.start ?? 0}`, `-to ${files[i]?.seek?.end ?? values[i]}`]
        : [];

      ff.input(files[i].path).inputOptions(inputOptions);
    }

    const crossFadeFilters = getCrossFadeFilters(files, duration);
    ff.complexFilter(crossFadeFilters);

    ff.on('start', () => {
      /* istanbul ignore if  */
      if (process.env.NODE_ENV === 'development') {
        console.time('merge');
      }
      const killProcess = () => {
        ff.kill('SIGSTOP');
        const transcodingKilled = new CustomError(
          'Transcoding stopped by worker',
          'TranscodingKilledError',
          499
        );
        reject(transcodingKilled);
      };
      socket.on(`kill-job-${jobId}`, killProcess);
      socket.on(`disconnect`, killProcess);
    })
      .on('progress', ({ timemark }) => {
        const percent = percentageFromTimemark(timemark, duration);
        /* istanbul ignore if  */
        if (process.env.NODE_ENV === 'development') {
          console.log(percent);
        }
        socket.emit(`job-progress-${jobId}`, {
          percent
        });
      })
      .on('end', () => {
        /* istanbul ignore if  */
        if (process.env.NODE_ENV === 'development') {
          console.timeEnd('merge');
        }
        socket.emit(`job-progress-${jobId}`, {
          percent: 100
        });
        resolve(mergedFilePath);
      })
      .on('error', (err) => {
        logger.error(`[${jobId}] Error while transcoding`, err);
        reject(new CustomError('', '', null, err));
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
    const filePathError = new CustomError('Filepath is invalid', 'FilePathError');
    throw filePathError;
  }

  if (!fs.existsSync(filepath)) {
    const fileNotFound = new CustomError("File doesn't exist", 'FileNotFound');
    throw fileNotFound;
  }

  if (typeof jobId !== 'string' || !jobId) {
    const jobIdError = new CustomError('JobId is invalid', 'JobIdError');
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
      const saveError = new CustomError('An error occured while saving the file', 'SaveError');
      throw saveError;
    }
    return savedFile;
  } catch (error) {
    logger.error(`[${jobId}]Error while uploading a craft`, {
      error,
      filepath
    });

    if (error.isAxiosError) {
      const uploadServiceError = new CustomError(
        'Storage service returned an error',
        'UploadServiceError',
        417,
        error
      );
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
export const createTranscodeJob = async ({ files, name, jobId } = {}, ack, socket) => {
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
      const payloadError = new CustomError(
        `Payload invalid: ${argsError.message}`,
        'PayloadError',
        400
      );
      throw payloadError;
    }

    if (busyFlag) {
      const workerBusyError = new CustomError('Resource is busy', 'WorkerBusyError', 419);
      throw workerBusyError;
    }

    busyFlag = true;

    /* istanbul ignore if  */
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
    /* istanbul ignore if  */
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
    /* istanbul ignore if  */
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
    /* istanbul ignore if  */
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
    /* istanbul ignore if  */
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
      /* istanbul ignore if  */
      if (error) {
        logger.error(`Error while deleting temp merge file`, {
          error,
          jobId,
          mergedFilePath
        });
      }
    });

    busyFlag = false;

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
    if (e instanceof CustomError) {
      if (e?.name !== 'WorkerBusyError') {
        busyFlag = false;
      }

      return ack({
        statusCode: e.code,
        errorName: e.name,
        message: e.message
      });
    }

    busyFlag = false;
    return ack({
      statusCode: 500,
      errorName: e.name,
      message: 'An error has occured'
    });
  } finally {
    transaction?.finish();
  }
};

export default {
  getFile,
  joinFiles,
  upload,
  createTranscodeJob
};
