import _ from 'lodash';

// const filtersProperties = ['fadeIn', 'fadeOut'];
const filtersProperties = [];

/**
 * Creates inputs and ouputs names for each
 * filters properties handled to allow for chain
 * filtering
 *
 * @param {Object} file
 *
 * @return {Array<Object>}
 */
export const getIOFiltersNames = (file) => {
  const fileFilters = Object.keys(file).filter((x) =>
    filtersProperties.includes(x)
  );
  const IO = [];

  for (let i = 0; i < fileFilters.length; i += 1) {
    IO.push({
      input: fileFilters[i - 1]
        ? `${file.input}-${fileFilters[i - 1]}`
        : `${file.input}`,
      output: fileFilters[i + 1]
        ? `${file.input}-${fileFilters[i]}`
        : `${file.input}-end`
    });
  }

  return IO;
};

/**
 * Create an array of configurations for the
 * complex_filter method of ffmpeg.
 * Yes. I know. It's spaghetti. Sry.
 *
 * @param {Array<Object>} files
 * @param {Array<Number>} durations
 *
 * @return {Array<Object>}
 */
export const getFadeFilters = (files, durations) => {
  const inputsOuputs = files.map((x) => getIOFiltersNames(x));

  return files.reduce((acc, curr, i) => {
    const IOFadeFilters = inputsOuputs[i];
    let filtersDone = 0;

    if (curr.fadeIn) {
      acc.push({
        filter: 'afade',
        options: {
          t: 'in',
          st: 0,
          d: curr.fadeIn
        },
        inputs: [IOFadeFilters[filtersDone].input],
        outputs: [IOFadeFilters[filtersDone].output]
      });
      filtersDone += 1;
    }

    if (curr.fadeOut) {
      const seekStart = _.get(curr, ['seek', 'start']);
      const seekEnd = _.get(curr, ['seek', 'end']);
      const fadeStart = (() => {
        if (seekStart) {
          return seekEnd - seekStart;
        }
        if (seekEnd) {
          return seekEnd;
        }
        return durations[i];
      })();

      acc.push({
        filter: 'afade',
        options: {
          t: 'out',
          st: fadeStart - curr.fadeOut,
          d: curr.fadeOut
        },
        inputs: [IOFadeFilters[filtersDone].input],
        outputs: [IOFadeFilters[filtersDone].output]
      });
      filtersDone += 1;
    }

    return acc;
  }, []);
};

export const getCrossFadeFilters = (files) => {
  const inputsOuputs = files.map((x) => getIOFiltersNames(x));
  const inputs = inputsOuputs.map((x, i) => {
    if (x.length) {
      return x[x.length - 1].output;
    }
    return files[i].input;
  });
  const inputsMixed = inputs.reduce((acc, curr, i) => {
    if (i === 0) {
      acc.push(curr);
      return acc;
    }

    acc.push(acc[acc.length - 1] + curr);
    return acc;
  }, []);

  const crossFadeFilters = files
    .map((file, i) => {
      return inputsMixed[i + 1]
        ? {
            filter: 'acrossfade',
            options: {
              d: 4,
              c1: 'log',
              c2: 'nofade'
            },
            inputs: [inputsMixed[i], inputs[i + 1]],
            outputs: [inputsMixed[i + 1]]
          }
        : null;
    })
    .filter((x) => x);

  delete crossFadeFilters[crossFadeFilters.length - 1].outputs;

  return crossFadeFilters;
};

export default {
  getIOFiltersNames,
  getFadeFilters,
  getCrossFadeFilters
};
