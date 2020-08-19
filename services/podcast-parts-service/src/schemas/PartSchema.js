import joi from 'joi';

export default joi.object({
  name: joi
    .string()
    .min(1)
    .max(100)
    .required()
    .meta({
      _mongoose: { unique: true }
    }),
  type: joi
    .string()
    .length(24)
    .required()
    .meta({
      _mongoose: {
        type: 'ObjectId',
        ref: 'PartType'
      }
    }),
  podcast: joi
    .string()
    .length(24)
    .required()
    .meta({
      _mongoose: {
        type: 'ObjectId',
        ref: 'Podcast'
      }
    }),
  tags: joi.array().items(joi.string().min(1).max(100)),
  originalFilename: joi.string().required(),
  storageType: joi.string().required().valid('local', 'aws', 'scaleway'),
  storagePath: joi.string().required(),
  storageFilename: joi.string().required(),
  publicLink: joi.string(),
  contentType: joi.string().required()
});
