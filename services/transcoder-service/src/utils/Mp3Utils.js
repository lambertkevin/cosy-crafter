import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import CustomError from '@cosy/custom-error';

/**
 * Promise returning the duration of an
 * mp3 in seconds
 *
 * @param {String|Buffer} file
 *
 * @return {Promise<Number|Error>} [seconds]
 */
export const getMp3Duration = (file) =>
  new Promise((resolve, reject) => {
    if (typeof file === 'string') {
      const fileExist = fs.existsSync(file);
      if (!fileExist) {
        const notFound = new CustomError("File doesn't exist", 'NotFound');
        return reject(notFound);
      }
    }

    return ffmpeg(file).ffprobe((err, data) => {
      if (err) {
        const ffmpegError = new CustomError(
          'FFmpeg failed to anaylize the file',
          'FFmpegError',
          null,
          err
        );
        return reject(ffmpegError);
      }

      if (data.format.format_name !== 'mp3') {
        const fileFormatError = new CustomError(
          'File format is not suppported',
          'FileFormatError'
        );
        return reject(fileFormatError);
      }

      return resolve(data.format.duration);
    });
  });

/**
 * Promise returning the concatenation of
 * mp3 durations
 *
 * @param {Array<String>} files
 *
 * @return {Promise<Number>}
 */
export const getMp3ListDuration = async (files) => {
  const values = await Promise.all(files.map((x) => getMp3Duration(x)));
  const duration = values.reduce((prev, curr) => {
    return prev + curr;
  }, 0);

  return {
    values,
    duration
  };
};

export default {
  getMp3Duration,
  getMp3ListDuration
};
