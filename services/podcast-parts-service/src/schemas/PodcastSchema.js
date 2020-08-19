import joi from 'joi';

export default joi.object({
  name: joi.string().min(1).max(100).required(),
  edition: joi.number().positive().required(),
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
  ),
  tags: joi.array().items(joi.string().min(1).max(100))
});
