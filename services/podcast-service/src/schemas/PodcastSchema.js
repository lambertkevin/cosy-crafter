import joi from 'joi';

export const hiddenProperties = [];

export const creationSchema = joi.object({
  name: joi
    .string()
    .min(1)
    .max(100)
    .required()
    .example('Mon super podcast!')
    .meta({
      _mongoose: { unique: true }
    }),
  edition: joi
    .number()
    .positive()
    .required()
    .example(69)
    .meta({
      _mongoose: { unique: true }
    }),
  tags: joi.array().items(joi.string().min(1).max(100).example('technologie'))
});

export const validationSchema = creationSchema
  .append({
    parts: joi.array().items(
      joi
        .string()
        .length(24)
        .meta({
          _mongoose: {
            type: 'ObjectId',
            ref: 'Part'
          }
        })
        .example('5f3d73a658a9ae0ec8061fb1')
    )
  })
  .label('Podcast');

export const responseSchema = validationSchema
  .append({
    _id: joi.string().length(24).required().example('5f3d73a658a9ae0ec8061fb1')
  })
  .fork(hiddenProperties, (x) => x.forbidden());

export default validationSchema;
