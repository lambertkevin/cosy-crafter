import joi from 'joi';
import { calibrateSchema } from '@cosy/schema-utils';
import failValidationHandler from '@cosy/hapi-fail-validation-handler';
import * as StorageController from '../controllers/StorageController';

export default {
  name: 'craftStorageApi',
  async register(server) {
    server.route({
      method: 'get',
      path: '/ping',
      handler: () => 'pong'
    });

    /**
     * Upload a Craft file
     *
     * @method POST
     */
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
              file: joi.any().required().meta({ swaggerType: 'file' }),
              storageStrategy: joi
                .string()
                .allow('')
                .regex(
                  /^[a-zA-Z0-9, -]*$/,
                  'Alphanumerics, space, dash and comma characters'
                )
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
                    storagePath: joi.string().example('path/to/the').required(),
                    storageFilename: joi
                      .string()
                      .example('file.mp3')
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

    /**
     * Get a craft
     *
     * @method GET
     * @param {String} id
     */
    server.route({
      method: 'GET',
      path: '/{id}',
      options: {
        handler: async ({ params }, h) =>
          StorageController.getCraftFile(params.id, h),
        tags: ['api', 'crafts', 'v1'],
        description: 'Get a Craft file',
        notes: 'Returns a craft file',
        validate: {
          failAction: failValidationHandler,
          params: joi.object({
            id: joi.string().length(24).required()
          })
        },
        plugins: {
          'hapi-swagger': {
            responses: {
              200: {
                description: 'Returns the file as a readable stream',
                schema: joi.binary().meta({ swaggerType: 'file' })
              }
            }
          }
        }
      }
    });

    /**
     * Delete a craft file
     *
     * @method DELETE
     */
    server.route({
      method: 'DELETE',
      path: '/',
      options: {
        auth: {
          strategy: 'service-jwt',
          mode: 'required'
        },
        handler: async ({ payload }) =>
          StorageController.removeCraftFile(payload),
        tags: ['api', 'crafts', 'v1'],
        description: 'Delete a craft file',
        notes: 'Deletes a specific a craft file',
        validate: {
          failAction: failValidationHandler,
          payload: joi
            .object({
              storageType: joi
                .string()
                .required()
                .valid('aws', 'scaleway', 'local')
                .example('aws'),
              storagePath: joi.string().required().example('path/to/folder'),
              storageFilename: joi
                .string()
                .required()
                .example('0d6c46e6-dc6f-46e0-b1e4-3e36e9b62f04.mp3')
            })
            .label('CraftDeletionSchema'),
          headers: joi
            .object({
              authorization: joi.string().required()
            })
            .unknown()
        },
        plugins: {
          'hapi-swagger': {
            responses: {
              200: {
                schema: calibrateSchema(
                  joi.object({
                    deleted: joi
                      .array()
                      .items(
                        joi
                          .string()
                          .length(24)
                          .required()
                          .example('5f3ed184201d35c0c309aaaa')
                      )
                  }),
                  false
                )
              }
            }
          }
        }
      }
    });
  }
};
