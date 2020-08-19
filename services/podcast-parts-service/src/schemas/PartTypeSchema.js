import joi from 'joi';

export default joi.object({
  name: joi
    .string()
    .min(1)
    .max(100)
    .required()
    .meta({
      _mongoose: { unique: true }
    })
});
