import joi from 'joi';
import { calibrateSchema } from '../utils/schemasUtils';
import failValidationHandler from '../utils/failValidationHandler';
import * as StorageController from '../controllers/StorageController';

export default {
  name: 'craftStorageApi',
  async register(server) {
    server.route({
      method: 'post',
      path: '/',
      options: {
        auth: {
          strategy: 'service-jwt',
          mode: 'required'
        },
        payload: {
          allow: 'multipart/form-data',
          output: 'stream',
          maxBytes: 400 * 1024 * 1024, // 400 Mo limit on upload size
          multipart: true,
          parse: true
        },
        validate: {
          failAction: failValidationHandler,
          payload: joi
            .object({
              filename: joi.string().required().example('fichier.mp3'),
              file: joi.any().required().meta({ swaggerType: 'file' })
            })
            .label('CraftCreationSchema'),
          headers: joi
            .object({
              authorization: joi.string().required()
            })
            .unknown()
        },
        handler: ({ payload }) => StorageController.addCraftFile(payload),
        tags: ['api', 'crafts', 'v1'],
        description: 'Upload a craft file',
        notes: 'Act like a pipeline to store a stream into a storage',
        plugins: {
          'hapi-swagger': {
            responses: {
              200: {
                schema: calibrateSchema(
                  joi.object({
                    location: joi
                      .string()
                      .example('path/to/the/file.mp3')
                      .required(),
                    storageType: joi
                      .string()
                      .valid('local', 'aws', 'scaleway')
                      .required()
                      .example('local'),
                    publicLink: joi
                      .string()
                      .example(
                        'https://cosy-crafter.s3.fr-par.scw.cloud/57319dfe-f6dc-473c-aabb-b3c8d642cdc2.mp3'
                      )
                  })
                ).label('CraftUploadResponse')
              }
            },
            payloadType: 'form'
          }
        }
      }
    });
  }
};
