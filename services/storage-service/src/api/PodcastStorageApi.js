import joi from 'joi';
import * as StorageController from '../controllers/StorageController';
import failValidationHandler from '../utils/FailValidationHandler';
import { calibrateSchema } from '../utils/SchemasUtils';

export default {
  name: 'podcastStorageApi',
  async register(server) {
    server.route({
      method: 'get',
      path: '/ping',
      handler: () => 'pong'
    });
    /**
     * Upload a podcast part file
     *
     * @method POST
     */
    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: {
          strategy: 'service-jwt',
          mode: 'required'
        },
        payload: {
          allow: 'multipart/form-data',
          output: 'stream',
          maxBytes: 200 * 1024 * 1024, // 200 Mo limit on upload size
          multipart: true,
          parse: true
        },
        validate: {
          failAction: failValidationHandler,
          payload: joi
            .object({
              podcastName: joi
                .string()
                .min(1)
                .max(100)
                .required()
                .example('Mon super podcast'),
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
            .label('PodcastPartCreationSchema'),
          headers: joi
            .object({
              authorization: joi.string().required()
            })
            .unknown()
        },
        handler: ({ payload }) => StorageController.addPodcastPartFile(payload),
        tags: ['api', 'podcasts', 'v1'],
        description: 'Upload a podcast part file',
        notes: 'Act like a pipeline to store a stream into a storage',
        plugins: {
          'hapi-swagger': {
            responses: {
              200: {
                schema: calibrateSchema(
                  joi.object({
                    filename: joi
                      .string()
                      .example('57319dfe-f6dc-473c-aabb-b3c8d642cdc2.mp3'),
                    location: joi.string().example('path/to/the/file'),
                    storageType: joi
                      .string()
                      .valid('local', 'aws', 'scaleway')
                      .example('aws'),
                    publicLink: joi
                      .string()
                      .example(
                        'https://cosy-crafter.s3.fr-par.scw.cloud/57319dfe-f6dc-473c-aabb-b3c8d642cdc2.mp3'
                      )
                  })
                ).label('PodcastPartUploadResponse')
              }
            },
            payloadType: 'form'
          }
        }
      }
    });

    /**
     * Get a file from the podcast part id
     *
     * @method GET
     * @param {String} id
     */
    server.route({
      method: 'GET',
      path: '/{id}',
      options: {
        handler: async ({ params }, h) =>
          StorageController.getPodcastPartFile(params.id, h),
        tags: ['api', 'podcasts', 'v1'],
        description: 'Get a podcast part file',
        notes: 'Returns a podcast part file from its podcast part id',
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
     * Delete a podcast part file
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
          StorageController.removePodcastPartFile(payload),
        tags: ['api', 'podcasts', 'v1'],
        description: 'Delete a podcast part file',
        notes: 'Deletes a specific file the podcast files',
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
            .label('PodcastPartDeletionSchema'),
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
