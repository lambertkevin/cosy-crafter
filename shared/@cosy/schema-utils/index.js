import joi, { ObjectSchema } from "joi";
import CustomError from "@cosy/custom-error";

/**
 * Returns a JSON API Spec compliant Joi object from a given schema
 *
 * @param {ObjectSchema} schema
 * @param {Boolean} isArray [can't use Joi.alternative as it's for swagger response representation]
 * @param {Number} statusCode
 *
 * @return {ObjectSchema}
 */
export const standardizeSchema = (schema, isArray = true, statusCode = 200) => {
  if (!joi.isSchema(schema)) {
    throw new CustomError("Invalid schema", "SchemaInvalidError");
  }

  return joi
    .object({
      statusCode: joi.number().required().example(statusCode),
      data: isArray ? joi.array().items(schema) : schema,
      meta: joi.object().required(),
    })
    .label("Response");
};

/**
 * Get an array containing a schema's keys
 *
 * @param {ObjectSchema} schema
 *
 * @return {Array}
 */
export const schemaKeys = (schema) => {
  if (!joi.isSchema(schema)) {
    throw new CustomError("Invalid schema", "SchemaInvalidError");
  }

  return Array.from(schema._ids._byKey.keys());
};
