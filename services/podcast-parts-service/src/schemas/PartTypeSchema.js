import joi from 'joi';

export const hiddenProperties = [];

export const creationSchema = joi.object({
  name: joi
    .string()
    .min(1)
    .max(100)
    .required()
    .meta({
      _mongoose: { unique: true }
    })
    .example('Section de Ouf!')
});

export const validationSchema = creationSchema;

export const responseSchema = validationSchema.append({
  _id: joi.string().length(24).required().example('5f3ffc559dd530f33cc39f8b')
});

export default validationSchema;
