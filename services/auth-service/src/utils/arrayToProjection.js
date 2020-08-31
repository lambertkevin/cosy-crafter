/**
 * Generate an object containing hidden fields for projection
 * @param {Array} fields
 * @return {Object}
 */
export default (fields) => {
  const hiddenFields = {};

  fields.forEach((field) => {
    hiddenFields[field] = false;
  });
  return hiddenFields;
};
