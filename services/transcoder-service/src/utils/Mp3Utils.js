import ffmpeg from 'fluent-ffmpeg';

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
    ffmpeg(file).ffprobe((err, data) => {
      if (err) {
        return reject();
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
  const durations = await Promise.all(files.map((x) => getMp3Duration(x)));

  return durations.reduce((prev, curr) => {
    return prev + curr;
  }, 0);
};

export default {
  getMp3Duration,
  getMp3ListDuration
};
