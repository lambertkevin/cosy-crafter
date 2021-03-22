/**
 * Generate an object containing hidden fields for projection
 *
 * @param {Array} fields
 * @return {Object}
 */
export default (fields) => {
  if (!Array.isArray(fields)) {
    return {};
  }

  const hiddenFields = {};

  fields.forEach((field) => {
    if (typeof field === "string") {
      hiddenFields[field] = false;
    }
  });
  return hiddenFields;
};
