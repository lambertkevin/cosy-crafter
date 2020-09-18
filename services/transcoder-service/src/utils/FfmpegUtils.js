/**
 * Creates the array of configs
 * to crossfade all the parts.
 *
 * @param {Array<Object>} files
 *
 * @return {Array<String>}
 */
export const getCrossFadeFilters = (files) => {
  const inputs = files.map((x) => x.input);
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

  if (crossFadeFilters.length) {
    delete crossFadeFilters[crossFadeFilters.length - 1].outputs;
  }

  return crossFadeFilters.length ? crossFadeFilters : null;
};

export default {
  getCrossFadeFilters
};
