import joi from 'joi';

export const hiddenProperties = [];

export const creationSchema = joi
  .object({
    // prettier-ignore
    type: joi
      .string()
      .valid('access', 'refresh')
      .required()
      .default('refresh')
      .example('refresh'),
    // prettier-ignore
    jwtid: joi
      .string()
      .guid()
      .required()
      .meta({
        _mongoose: { unique: true }
      })
      .example('eefe539d-c1f5-4d98-9478-465a1479969b')
  })
  .label('Token');

export const validationSchema = creationSchema;

export const responseSchema = validationSchema
  .append({
    _id: joi.string().length(24).required().example('5f3ec14cb2d104269d3c3282')
  })
  .fork(
    hiddenProperties,
    /* istanbul ignore next */ (x) => x.optional().description('Only if not sanitized')
  );
export default validationSchema;
