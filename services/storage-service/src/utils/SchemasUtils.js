import joi from 'joi';

/**
 * Returns a JSON API Spec compliant Joi object from a given schema
 *
 * @param {joi.ObjectSchema} schema
 * @param {Boolean} isArray
 * @param {Number} statusCode
 *
 * @return {joi.ObjectSchema}
 */
export const calibrateSchema = (schema, isArray = true, statusCode = 200) =>
  joi
    .object({
      statusCode: joi.number().required().example(statusCode),
      data: isArray ? joi.array().items(schema) : schema,
      meta: joi.object().required()
    })
    .label('Response');

/**
 * Get an array containing a schema's keys
 *
 * @param {joi.ObjectSchema} schema
 *
 * @return {Array}
 */
export const schemaKeys = (schema) => Array.from(schema._ids._byKey.keys());
