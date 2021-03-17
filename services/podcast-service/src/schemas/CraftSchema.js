import joi from 'joi';

export const hiddenProperties = [
  'jobId',
  'storageType',
  'storagePath',
  'storageFilename'
];

export const creationSchema = joi.object({
  name: joi
    .string()
    .min(1)
    .max(100)
    .required()
    .example('La partie qui est rigolote. LOL!'),
  jobId: joi
    .string()
    .guid()
    .required()
    .meta({
      _mongoose: { unique: true }
    }),
  /** @WARNING Not required until I add the users to auth service */
  user: joi.string().length(24).allow(null).default(null), // .required()
  storageType: joi.string().valid('local', 'aws', 'scaleway').required(),
  storagePath: joi.string().required(),
  storageFilename: joi.string().required()
});

export const validationSchema = creationSchema.label('Craft');

export const responseSchema = validationSchema
  .append({
    _id: joi.string().length(24).required().example('5f3ec14cb2d104269d3c3282')
  })
  .fork(hiddenProperties, (x) =>
    x.optional().description('Only if not sanitized')
  );

export default validationSchema;
