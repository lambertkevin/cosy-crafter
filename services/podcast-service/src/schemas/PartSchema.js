import joi from 'joi';

export const hiddenProperties = [
  'originalFilename',
  'storageFilename',
  'storageType',
  'storagePath',
  'contentType',
  'publicLink'
];

export const creationSchema = joi.object({
  name: joi
    .string()
    .min(1)
    .max(100)
    .required()
    .meta({
      _mongoose: { unique: true }
    })
    .example('La partie qui est rigolote. LOL!'),
  type: joi
    .string()
    .length(24)
    .required()
    .meta({
      _mongoose: {
        type: 'ObjectId',
        ref: 'PartType'
      }
    })
    .example('5f3ee652c4ed94844d8288ee'),
  podcast: joi
    .string()
    .length(24)
    .required()
    .meta({
      _mongoose: {
        type: 'ObjectId',
        ref: 'Podcast'
      }
    })
    .example('5f3ee65cc70dbff1761e1e41'),
  tags: joi
    .string()
    .allow('')
    .regex(/^[a-zA-Z0-9, ]*$/, 'Alphanumerics, space and comma characters')
    .min(0)
    .max(200),
  file: joi.any().required().meta({ swaggerType: 'file' })
});

export const validationSchema = creationSchema
  .append({
    tags: joi.array().items(joi.string().min(3).max(100).example('LOL')),
    originalFilename: joi.string().required().example('MonFichier.mp3'),
    storageType: joi
      .string()
      .required()
      .valid('local', 'aws', 'scaleway')
      .example('scaleway'),
    storagePath: joi.string().required().example('mon_dossier/mon_podcast/'),
    storageFilename: joi
      .string()
      .required()
      .example('ecd3506c-e26e-4799-8562-85f658c82056.mp3'),
    publicLink: joi
      .string()
      .allow(null)
      .default(null)
      .example(
        'https://cosy-crafter.s3.fr-par.scw.cloud/ecd3506c-e26e-4799-8562-85f658c82056.mp3'
      ),
    contentType: joi.string().required().example('audio/mpeg'),
    file: joi.any().forbidden()
  })
  .label('Part');

export const responseSchema = validationSchema
  .append({
    _id: joi.string().length(24).required().example('5f3ec14cb2d104269d3c3282')
  })
  .fork(hiddenProperties, (x) => x.forbidden());

export default validationSchema;
