import joi from 'joi';

export const hiddenProperties = [];

export const creationSchema = joi
  .object({
    identifier: joi
      .string()
      .min(1)
      .max(50)
      .required()
      .meta({
        _mongoose: { unique: true }
      })
      .example('podcast-service-x382')
  })
  .label('Service');

export const validationSchema = creationSchema.append({
  ip: joi.string().ip().allow('private').required(),
  key: joi.string().required()
});

export const responseSchema = validationSchema
  .append({
    _id: joi.string().length(24).required().example('5f3ec14cb2d104269d3c3282')
  })
  .fork(hiddenProperties, (x) =>
    // prettier-ignore
    x.optional().description('Only if not sanitized')
  )
  .label('ServiceResponse');

export default validationSchema;
