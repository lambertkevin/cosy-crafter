import mp3Duration from 'mp3-duration';

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
    mp3Duration(file, (error, duration) => {
      if (error) {
        return reject(error);
      }
      return resolve(duration);
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
  const durations = Promise.all(files.map((x) => getMp3Duration(x)));

  return durations.reduce((prev, curr) => {
    return prev + curr;
  }, 0);
};

export default {
  getMp3Duration,
  getMp3ListDuration
};
