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

    acc.push(`${acc[acc.length - 1]}${i}`);
    return acc;
  }, []);

  const crossFadeFilters = files
    .map((file, i) => {
      return inputsMixed[i + 1]
        ? {
            filter: 'acrossfade',
            options: {
              d: 4,
              /**  @WARNING Change crossfade depending on input-type podcast-part or user-input */
              c1: 'log',
              c2: 'nofade'
            },
            // Take as input the last output done
            // E.g. We are at input 1 so last output has been
            // the mixing of '0' and '1' merging in output '01' and
            // we are now merging this '01' with '2' into output '012'
            inputs: [inputsMixed[i], `${i + 1}`],
            outputs: [inputsMixed[i + 1]]
          }
        : null;
    })
    .filter((x) => x);

  // The last 'output' is implied by the fact
  // it's the last merging/crossfade and
  // therefore we need to remove it
  if (crossFadeFilters.length) {
    delete crossFadeFilters[crossFadeFilters.length - 1].outputs;
  }

  return crossFadeFilters.length ? crossFadeFilters : null;
};

/**
 * Returns a percentage from a timemark format
 * based on the total duration
 *
 * @param {String} timemark [format HH:mm:ss.SSS]
 * @param {Number} duration
 *
 * @return {Number} percentage
 */
export const percentageFromTimemark = (timemark, duration) => {
  if (typeof timemark !== 'string' || typeof duration !== 'number') {
    return 0;
  }

  const timemarkRegex = new RegExp('[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}');
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
