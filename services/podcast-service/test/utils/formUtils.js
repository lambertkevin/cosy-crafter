import FormData from 'form-data';

/**
 * Creates a Formdata from an object by appending each property
 *
 * @param {Object} obj
 *
 * @return {FormData}
 */
export const objectToFormData = (obj) => {
  const fd = new FormData();
  Object.keys(obj).forEach((key) => {
    if (obj[key]) {
      fd.append(key, obj[key]);
    }
  });
  return fd;
};

export default {
  objectToFormData
};
