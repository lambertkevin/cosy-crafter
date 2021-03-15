/**
 * Creates the array of configs
 * to crossfade all the parts.
 *
 * @param {Array<Object>} files
 *
 * @return {Array<String>}
 */
export const getCrossFadeFilters = (files) => {
  if (!files || !Array.isArray(files)) {
    return null;
  }

  // Making an array of what chaining inputs will look like
  // E.g.: input A crossfaded with input B will create output AB
  // So for 4 inputs, we should get ['0', '01', '012', '0123']
  const inputsMixed = files.reduce((acc, input, i) => {
    if (i === 0) {
      acc.push(`${i}`);
      return acc;
    }

    acc.push(`${acc[acc.length - 1]}+${i}`);
    return acc;
  }, []);

  const crossFadeFilters = files
    .map((file, i) => {
      return files[i + 1]
        ? {
            filter: 'acrossfade',
            options: {
              d: 4,
              /** @see https://github.com/guillaumekh/ffmpeg-afade-cheatsheet  */
              /**  @WARNING Change crossfade depending on input-type podcast-part or user-input */
              c1: 'par',
              c2: 'nofade'
            },
            // Take as input the last output done
            // E.g. We are at input 1 so last output has been
            // the mixing of '0' and '1' merging in output '0+1' and
            // we are now merging this '0+1' with '2' into output '0+1+2'
            inputs: [inputsMixed[i], `${i + 1}`],
            outputs: [inputsMixed[i + 1]]
          }
        : null;
    })
    .filter((x) => x);

  // The 'acrossfade' filter cannot have
  // an unconnected output (meaning it cannot have
  // an unused output for the last usage of the filter)
  // We then have to delete the last outuput of the last
  if (crossFadeFilters.length) {
    delete crossFadeFilters[crossFadeFilters.length - 1].outputs;
  }
  return crossFadeFilters;
};

/**
 * Returns a percentage from a timemark format
 * based on the total duration
 *
 * @param {String} timemark [format HH:mm:ss.SS]
 * @param {Number} duration
 *
 * @return {Number} percentage
 */
export const percentageFromTimemark = (timemark, duration) => {
  if (typeof timemark !== 'string' || typeof duration !== 'number') {
    return 0;
  }

  const timemarkRegex = new RegExp('[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{2}$');
  if (!timemarkRegex.test(timemark)) {
    return 0;
  }

  const timemarkAsSec =
    (Date.parse(`04/21/2014 ${timemark}`) -
      Date.parse('04/21/2014 00:00:00.00')) /
    1000;

  return (timemarkAsSec / duration) * 100;
};

export default {
  getCrossFadeFilters
};
