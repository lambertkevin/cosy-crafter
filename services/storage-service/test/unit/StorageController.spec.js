import fs from 'fs';
import _ from 'lodash';
import path from 'path';
import Boom from '@hapi/boom';
import { expect } from 'chai';
import { Stream } from 'stream';
import proxyquire from 'proxyquire';
import mockS3 from '../utils/mockS3';
import createAxiosError from 'axios/lib/core/createError';
import StorageController from '../../src/controllers/StorageController';

const h = {
  continue: Symbol('h.continue'),
  response: (response) => {
    return {
      type: (type) => {
        return {
          response,
          type,
          header: (headerName, headerContent) => {
            return { response, type, header: { [headerName]: headerContent } };
          }
        };
      }
    };
  }
};

describe('StorageController unit tests', () => {
  let s3FakeServers;

  before(async () => {
    s3FakeServers = await mockS3();
  });

  after(() => {
    fs.rmdirSync(path.resolve('./bucket/tests/'), { recursive: true });
    s3FakeServers.forEach((s3) => s3.close());
  });

  describe('Podcast parts', () => {
    describe('add', () => {
      it('should upload a part file on local', async () => {
        const payload = {
          podcastName: 'podcast-test',
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'local'
        };
        const result = await StorageController.addPodcastPartFile(payload);

        expect(result).to.include({
          location: 'podcasts/podcast-test',
          storageType: 'local',
          publicLink: undefined
        });
        expect(result).to.have.property('filename');
      });

      it('should upload a part file on aws', async () => {
        const payload = {
          podcastName: 'podcast-test',
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'aws'
        };
        const result = await StorageController.addPodcastPartFile(payload);

        expect(result).to.deep.include({
          location: 'podcasts/podcast-test',
          storageType: 'aws',
          publicLink: `https://cosy-crafter-backup.s3.eu-west-3.amazonaws.com/${result.location}/${result.filename}`
        });
        expect(result).to.have.property('filename');
      });

      it('should upload a part file on scaleway', async () => {
        const payload = {
          podcastName: 'podcast-test',
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'scaleway'
        };
        const result = await StorageController.addPodcastPartFile(payload);

        expect(result).to.deep.include({
          location: 'podcasts/podcast-test',
          storageType: 'scaleway',
          publicLink: `https://cosy-crafter.s3.fr-par.scw.cloud/${result.location}/${result.filename}`
        });
        expect(result).to.have.property('filename');
      });

      it("should upload a default storage if storageStrategy isn't set", async () => {
        const payload = {
          podcastName: 'podcast-test',
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3'))
        };
        const result = await StorageController.addPodcastPartFile(payload);

        expect(result).to.deep.include({
          location: 'podcasts/podcast-test',
          storageType: 'local',
          publicLink: undefined
        });
        expect(result).to.have.property('filename');
      });

      it("should return a 422 error if a storage doesn't exist", async () => {
        const payload = {
          podcastName: 'podcast-test',
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'not-existing-storage'
        };

        const error = await StorageController.addPodcastPartFile(payload);

        expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(error?.output?.statusCode).to.be.equal(422);
        expect(error?.message).to.be.equal("At least one storage type doesn't exist");
      });

      it('should return a 500 error if an error occured while testing the storageStrategy', async () => {
        const payload = {
          podcastName: 'podcast-test',
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'local'
        };

        const { addPodcastPartFile } = proxyquire
          .noCallThru()
          .load('../../src/controllers/StorageController.js', {
            '../lib/StorageFactory': () => ({})
          });
        const error = await addPodcastPartFile(payload);

        expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(error?.output?.statusCode).to.be.equal(503);
        expect(error?.message).to.be.equal('Service Unavailable');
      });

      it('should return a Boom Error if setFromReadable throws a Boom', async () => {
        const payload = {
          podcastName: 'podcast-test',
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'local'
        };

        const { addPodcastPartFile } = proxyquire.load(
          '../../src/controllers/StorageController.js',
          {
            '../lib/StorageFactory': () => ({
              storagesAvailable: ['aws', 'local'],
              setFileFromReadable: () =>
                Promise.reject(Boom.serverUnavailable('All storage options have failed'))
            })
          }
        );
        const error = await addPodcastPartFile(payload);

        expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(error?.output?.statusCode).to.be.equal(503);
        expect(error?.message).to.be.equal('All storage options have failed');
      });

      it('should return a 422 Error if setFromReadable throws any other error', async () => {
        const payload = {
          podcastName: 'podcast-test',
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'local'
        };

        const { addPodcastPartFile } = proxyquire.load(
          '../../src/controllers/StorageController.js',
          {
            '../lib/StorageFactory': () => ({
              storagesAvailable: ['aws', 'local'],
              setFileFromReadable: () => Promise.reject(new Error())
            })
          }
        );
        const error = await addPodcastPartFile(payload);

        expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(error?.output?.statusCode).to.be.equal(500);
        expect(error?.message).to.be.equal('Internal Server Error');
      });
    });

    describe('get', () => {
      it('should get a part file from local', async () => {
        const payload = {
          podcastName: 'podcast-test',
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'local'
        };
        const part = await StorageController.addPodcastPartFile(payload);
        const { getPodcastPartFile } = proxyquire
          .noCallThru()
          .load('../../src/controllers/StorageController.js', {
            '@cosy/axios-utils': {
              makeAxiosInstance: () => ({
                get: () =>
                  Promise.resolve({
                    data: {
                      data: {
                        originalFilename: payload.filename,
                        storageType: part.storageType,
                        storagePath: part.location,
                        storageFilename: part.filename,
                        contentType: 'audio/mpeg'
                      }
                    }
                  })
              })
            }
          });

        const { response, type } = await getPodcastPartFile(part._id, h);

        expect(response).to.be.an.instanceOf(Stream.Readable);
        expect(type).to.be.equal('audio/mpeg');
      });

      it('should get a part file from aws', async () => {
        const payload = {
          podcastName: 'podcast-test',
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'aws'
        };
        const part = await StorageController.addPodcastPartFile(payload);
        const { getPodcastPartFile } = proxyquire
          .noCallThru()
          .load('../../src/controllers/StorageController.js', {
            '@cosy/axios-utils': {
              makeAxiosInstance: () => ({
                get: () =>
                  Promise.resolve({
                    data: {
                      data: {
                        originalFilename: payload.filename,
                        storageType: part.storageType,
                        storagePath: part.location,
                        storageFilename: part.filename,
                        contentType: 'audio/mpeg'
                      }
                    }
                  })
              })
            }
          });

        const { response, type } = await getPodcastPartFile(part._id, h);

        expect(response).to.be.an.instanceOf(Stream.Readable);
        expect(type).to.be.equal('audio/mpeg');
      });

      it('should get a part file from scaleway', async () => {
        const payload = {
          podcastName: 'podcast-test',
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'scaleway'
        };
        const part = await StorageController.addPodcastPartFile(payload);
        const { getPodcastPartFile } = proxyquire
          .noCallThru()
          .load('../../src/controllers/StorageController.js', {
            '@cosy/axios-utils': {
              makeAxiosInstance: () => ({
                get: () =>
                  Promise.resolve({
                    data: {
                      data: {
                        originalFilename: payload.filename,
                        storageType: part.storageType,
                        storagePath: part.location,
                        storageFilename: part.filename,
                        contentType: 'audio/mpeg'
                      }
                    }
                  })
              })
            }
          });

        const { response, type } = await getPodcastPartFile(part._id, h);

        expect(response).to.be.an.instanceOf(Stream.Readable);
        expect(type).to.be.equal('audio/mpeg');
      });

      it('should return a 404 error if filepath or filename is null/empty on a local storage type', async () => {
        const { getPodcastPartFile } = proxyquire
          .callThru()
          .load('../../src/controllers/StorageController.js', {
            '@cosy/axios-utils': {
              makeAxiosInstance: () => ({
                get: () =>
                  Promise.resolve({
                    data: {
                      data: {
                        originalFilename: '',
                        storageType: 'local',
                        storagePath: '',
                        storageFilename: '',
                        contentType: 'audio/mpeg'
                      }
                    }
                  })
              })
            }
          });

        const error = await getPodcastPartFile('123', h);

        expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(error?.output?.statusCode).to.be.equal(404);
      });

      it('should return a thrown axios error', async () => {
        const { getPodcastPartFile } = proxyquire
          .callThru()
          .load('../../src/controllers/StorageController.js', {
            '@cosy/axios-utils': {
              makeAxiosInstance: () => ({
                get: () => {
                  const error = createAxiosError("I'm a tea pot");
                  const errorResponse = {
                    statusCode: 418,
                    data: {
                      statusCode: 418,
                      message: "I'm a tea pot"
                    }
                  };
                  return Promise.reject(createAxiosError(error, null, 418, null, errorResponse));
                }
              })
            }
          });

        const error = await getPodcastPartFile('123', h);

        expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(error?.output?.statusCode).to.be.equal(418);
      });

      it("should return a 410 error if doesn't exist on storage", async () => {
        const { getPodcastPartFile } = proxyquire
          .noCallThru()
          .load('../../src/controllers/StorageController.js', {
            '@cosy/axios-utils': {
              makeAxiosInstance: () => ({
                get: () =>
                  Promise.resolve({
                    data: {
                      data: {
                        originalFilename: 'test',
                        storageType: 'local',
                        storagePath: 'test',
                        storageFilename: 'test',
                        contentType: 'audio/mpeg'
                      }
                    }
                  })
              })
            }
          });

        const error = await getPodcastPartFile('123', h);

        expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(error?.output?.statusCode).to.be.equal(410);
        expect(error?.message).to.be.equal("File doesn't exist or has been deleted in storage");
      });

      it('should return a 422 error storage is not set in storage factory', async () => {
        const { getPodcastPartFile } = proxyquire
          .callThru()
          .load('../../src/controllers/StorageController.js', {
            '@cosy/axios-utils': {
              makeAxiosInstance: () => ({
                get: () =>
                  Promise.resolve({
                    data: {
                      data: {
                        originalFilename: 'test',
                        storageType: 'test',
                        storagePath: 'test',
                        storageFilename: 'test',
                        contentType: 'audio/mpeg'
                      }
                    }
                  })
              })
            }
          });

        const error = await getPodcastPartFile('123', h);

        expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(error?.output?.statusCode).to.be.equal(422);
        expect(error?.message).to.be.equal('Storage type not existing');
      });
    });

    describe('remove', () => {
      it('should delete a file on local', async () => {
        const payload = {
          podcastName: 'podcast-test',
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'local'
        };
        const result = await StorageController.addPodcastPartFile(payload);

        const response = await StorageController.removePodcastPartFile({
          storageType: result.storageType,
          storagePath: result.location,
          storageFilename: result.filename
        });

        expect(response).to.deep.include({ deleted: result.filename });
      });

      it('should delete a file on aws', async () => {
        const payload = {
          podcastName: 'podcast-test',
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'aws'
        };
        const result = await StorageController.addPodcastPartFile(payload);

        const response = await StorageController.removePodcastPartFile({
          storageType: result.storageType,
          storagePath: result.location,
          storageFilename: result.filename
        });

        expect(response).to.deep.include({ deleted: result.filename });
      });

      it('should delete a file on scaleway', async () => {
        const payload = {
          podcastName: 'podcast-test',
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'scaleway'
        };
        const result = await StorageController.addPodcastPartFile(payload);

        const response = await StorageController.removePodcastPartFile({
          storageType: result.storageType,
          storagePath: result.location,
          storageFilename: result.filename
        });

        expect(response).to.deep.include({ deleted: result.filename });
      });

      it('should return a 400 error if payload is invalid', async () => {
        const { removePodcastPartFile } = proxyquire('../../src/controllers/StorageController.js', {
          '../lib/StorageFactory': () => ({
            removeFile: () => Promise.reject(Boom.teapot())
          })
        });

        const error = await removePodcastPartFile();
        const error2 = await removePodcastPartFile({});

        expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(error2).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(error?.output?.statusCode).to.be.equal(400);
        expect(error2?.output?.statusCode).to.be.equal(400);
      });

      it('should return the thrown axios error by storage factory removeFile', async () => {
        const { removePodcastPartFile } = proxyquire
          .noCallThru()
          .load('../../src/controllers/StorageController.js', {
            '../lib/StorageFactory': () => ({
              removeFile: () => Promise.reject(Boom.teapot())
            })
          });

        const error = await removePodcastPartFile({
          storageType: 'local',
          storagePath: 'test',
          storageFilename: 'test'
        });

        expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(error?.output?.statusCode).to.be.equal(418);
      });

      it('should return a 500 error for any other error in removeFile', async () => {
        const { removePodcastPartFile } = proxyquire
          .noCallThru()
          .load('../../src/controllers/StorageController.js', {
            '../lib/StorageFactory': () => ({
              removeFile: () => Promise.reject(new Error())
            })
          });

        const error = await removePodcastPartFile({
          storageType: 'local',
          storagePath: 'test',
          storageFilename: 'test'
        });

        expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(error?.output?.statusCode).to.be.equal(422);
        expect(error?.message).to.be.equal('Unprocessable Entity');
      });
    });
  });

  describe('Crafts', () => {
    describe('add', () => {
      it('should upload a craft file on local', async () => {
        const payload = {
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'local'
        };
        const result = await StorageController.addCraftFile(payload);

        expect(result).to.include({
          location: `crafts`,
          storageType: 'local',
          publicLink: undefined
        });
        expect(result).to.have.property('filename');
      });

      it('should upload a craft file on aws', async () => {
        const payload = {
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'aws'
        };
        const result = await StorageController.addCraftFile(payload);

        expect(result).to.deep.include({
          location: `crafts`,
          storageType: 'aws',
          publicLink: `https://cosy-crafter-backup.s3.eu-west-3.amazonaws.com/crafts/${result.filename}`
        });
        expect(result).to.have.property('filename');
      });

      it('should upload a craft file on scaleway', async () => {
        const payload = {
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'scaleway'
        };
        const result = await StorageController.addCraftFile(payload);

        expect(result).to.deep.include({
          location: `crafts`,
          storageType: 'scaleway',
          publicLink: `https://cosy-crafter.s3.fr-par.scw.cloud/crafts/${result.filename}`
        });
        expect(result).to.have.property('filename');
      });

      it("should upload a default storage if storageStrategy isn't set", async () => {
        const payload = {
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3'))
        };
        const result = await StorageController.addCraftFile(payload);

        expect(result).to.deep.include({
          location: `crafts`,
          storageType: 'local',
          publicLink: undefined
        });
        expect(result).to.have.property('filename');
      });

      it("should return a 422 error if a storage doesn't exist", async () => {
        const payload = {
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'not-existing-storage'
        };

        const error = await StorageController.addCraftFile(payload);

        expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(error?.output?.statusCode).to.be.equal(422);
        expect(error?.message).to.be.equal("At least one storage type doesn't exist");
      });

      it('should return a 500 error if an error occured while testing the storageStrategy', async () => {
        const payload = {
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'local'
        };

        const { addCraftFile } = proxyquire
          .noCallThru()
          .load('../../src/controllers/StorageController.js', {
            '../lib/StorageFactory': () => ({})
          });
        const error = await addCraftFile(payload);

        expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(error?.output?.statusCode).to.be.equal(503);
        expect(error?.message).to.be.equal('Service Unavailable');
      });

      it('should return a Boom Error if setFromReadable throws a Boom', async () => {
        const payload = {
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'local'
        };

        const { addCraftFile } = proxyquire.load('../../src/controllers/StorageController.js', {
          '../lib/StorageFactory': () => ({
            storagesAvailable: ['aws', 'local'],
            setFileFromReadable: () =>
              Promise.reject(Boom.serverUnavailable('All storage options have failed'))
          })
        });
        const error = await addCraftFile(payload);

        expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(error?.output?.statusCode).to.be.equal(503);
        expect(error?.message).to.be.equal('All storage options have failed');
      });

      it('should return a 500 Error if setFromReadable throws any other error', async () => {
        const payload = {
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'local'
        };

        const { addCraftFile } = proxyquire.load('../../src/controllers/StorageController.js', {
          '../lib/StorageFactory': () => ({
            storagesAvailable: ['aws', 'local'],
            setFileFromReadable: () => Promise.reject(new Error())
          })
        });
        const error = await addCraftFile(payload);

        expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(error?.output?.statusCode).to.be.equal(500);
        expect(error?.message).to.be.equal('Internal Server Error');
      });
    });

    describe('get', () => {
      it('should get a craft file from local', async () => {
        const payload = {
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'local'
        };
        const craft = await StorageController.addCraftFile(payload);
        const { getCraftFile } = proxyquire
          .noCallThru()
          .load('../../src/controllers/StorageController.js', {
            '@cosy/axios-utils': {
              makeAxiosInstance: () => ({
                get: () =>
                  Promise.resolve({
                    data: {
                      data: {
                        name: 'test-craft',
                        storageType: craft.storageType,
                        storagePath: craft.location,
                        storageFilename: craft.filename
                      }
                    }
                  })
              })
            }
          });

        const { response, type, header } = await getCraftFile(craft._id, h);
        expect(response).to.be.an.instanceOf(Stream.Readable);
        expect(type).to.be.equal('audio/mpeg');
        expect(header).to.include({
          'content-disposition': `attachment; filename=${_.snakeCase('test-craft')}.mp3;`
        });
      });

      it('should get a craft file from aws', async () => {
        const payload = {
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'aws'
        };
        const craft = await StorageController.addCraftFile(payload);
        const { getCraftFile } = proxyquire
          .noCallThru()
          .load('../../src/controllers/StorageController.js', {
            '@cosy/axios-utils': {
              makeAxiosInstance: () => ({
                get: () =>
                  Promise.resolve({
                    data: {
                      data: {
                        name: 'test-craft',
                        storageType: craft.storageType,
                        storagePath: craft.location,
                        storageFilename: craft.filename
                      }
                    }
                  })
              })
            }
          });

        const { response, type, header } = await getCraftFile(craft._id, h);
        expect(response).to.be.an.instanceOf(Stream.Readable);
        expect(type).to.be.equal('audio/mpeg');
        expect(header).to.include({
          'content-disposition': `attachment; filename=${_.snakeCase('test-craft')}.mp3;`
        });
      });

      it('should get a craft file from scaleway', async () => {
        const payload = {
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'scaleway'
        };
        const craft = await StorageController.addCraftFile(payload);
        const { getCraftFile } = proxyquire
          .noCallThru()
          .load('../../src/controllers/StorageController.js', {
            '@cosy/axios-utils': {
              makeAxiosInstance: () => ({
                get: () =>
                  Promise.resolve({
                    data: {
                      data: {
                        name: 'test-craft',
                        storageType: craft.storageType,
                        storagePath: craft.location,
                        storageFilename: craft.filename
                      }
                    }
                  })
              })
            }
          });

        const { response, type, header } = await getCraftFile(craft._id, h);
        expect(response).to.be.an.instanceOf(Stream.Readable);
        expect(type).to.be.equal('audio/mpeg');
        expect(header).to.include({
          'content-disposition': `attachment; filename=${_.snakeCase('test-craft')}.mp3;`
        });
      });

      it('should return a 404 error if filepath or filename is null/empty on a local storage type', async () => {
        const { getCraftFile } = proxyquire
          .callThru()
          .load('../../src/controllers/StorageController.js', {
            '@cosy/axios-utils': {
              makeAxiosInstance: () => ({
                get: () =>
                  Promise.resolve({
                    data: {
                      data: {
                        name: 'test-name',
                        storageType: 'local',
                        storagePath: '',
                        storageFilename: ''
                      }
                    }
                  })
              })
            }
          });

        const error = await getCraftFile('123', h);

        expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(error?.output?.statusCode).to.be.equal(404);
      });

      it('should return a thrown axios error', async () => {
        const { getCraftFile } = proxyquire
          .callThru()
          .load('../../src/controllers/StorageController.js', {
            '@cosy/axios-utils': {
              makeAxiosInstance: () => ({
                get: () => {
                  const error = createAxiosError("I'm a tea pot");
                  const errorResponse = {
                    statusCode: 418,
                    data: {
                      statusCode: 418,
                      message: "I'm a tea pot"
                    }
                  };
                  return Promise.reject(createAxiosError(error, null, 418, null, errorResponse));
                }
              })
            }
          });

        const error = await getCraftFile('123', h);

        expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(error?.output?.statusCode).to.be.equal(418);
      });

      it("should return a 410 error if doesn't exist on storage", async () => {
        const { getCraftFile } = proxyquire
          .noCallThru()
          .load('../../src/controllers/StorageController.js', {
            '@cosy/axios-utils': {
              makeAxiosInstance: () => ({
                get: () =>
                  Promise.resolve({
                    data: {
                      data: {
                        name: 'test-craft',
                        storageType: 'local',
                        storagePath: 'test',
                        storageFilename: 'test'
                      }
                    }
                  })
              })
            }
          });

        const error = await getCraftFile('123', h);
        expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(error?.output?.statusCode).to.be.equal(410);
        expect(error?.message).to.be.equal("File doesn't exist or has been deleted in storage");
      });

      it('should return a 422 error storage is not set in storage factory', async () => {
        const { getCraftFile } = proxyquire
          .callThru()
          .load('../../src/controllers/StorageController.js', {
            '@cosy/axios-utils': {
              makeAxiosInstance: () => ({
                get: () =>
                  Promise.resolve({
                    data: {
                      data: {
                        storageType: 'test',
                        storagePath: 'test',
                        storageFilename: 'test'
                      }
                    }
                  })
              })
            }
          });

        const error = await getCraftFile('123', h);

        expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(error?.output?.statusCode).to.be.equal(422);
        expect(error?.message).to.be.equal('Storage type not existing');
      });
    });

    describe('remove', () => {
      it('should delete a file on local', async () => {
        const payload = {
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'local'
        };
        const result = await StorageController.addCraftFile(payload);

        const response = await StorageController.removeCraftFile({
          storageType: result.storageType,
          storagePath: result.location,
          storageFilename: result.filename
        });

        expect(response).to.deep.include({ deleted: result.filename });
      });

      it('should delete a file on aws', async () => {
        const payload = {
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'aws'
        };
        const result = await StorageController.addCraftFile(payload);

        const response = await StorageController.removeCraftFile({
          storageType: result.storageType,
          storagePath: result.location,
          storageFilename: result.filename
        });

        expect(response).to.deep.include({ deleted: result.filename });
      });

      it('should delete a file on scaleway', async () => {
        const payload = {
          filename: 'filename-test.mp3',
          file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          storageStrategy: 'scaleway'
        };
        const result = await StorageController.addCraftFile(payload);

        const response = await StorageController.removeCraftFile({
          storageType: result.storageType,
          storagePath: result.location,
          storageFilename: result.filename
        });

        expect(response).to.deep.include({ deleted: result.filename });
      });

      it('should return a 400 error if payload is invalid', async () => {
        const { removeCraftFile } = proxyquire('../../src/controllers/StorageController.js', {
          '../lib/StorageFactory': () => ({
            removeFile: () => Promise.reject(Boom.teapot())
          })
        });

        const error = await removeCraftFile();
        const error2 = await removeCraftFile({});

        expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(error2).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(error?.output?.statusCode).to.be.equal(400);
        expect(error2?.output?.statusCode).to.be.equal(400);
      });

      it('should return the thrown axios error by storage factory removeFile', async () => {
        const { removeCraftFile } = proxyquire
          .noCallThru()
          .load('../../src/controllers/StorageController.js', {
            '../lib/StorageFactory': () => ({
              removeFile: () => Promise.reject(Boom.teapot())
            })
          });

        const error = await removeCraftFile({
          storageType: 'local',
          storagePath: 'test',
          storageFilename: 'test'
        });

        expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(error?.output?.statusCode).to.be.equal(418);
      });

      it('should return a 500 error for any other error in removeFile', async () => {
        const { removeCraftFile } = proxyquire
          .noCallThru()
          .load('../../src/controllers/StorageController.js', {
            '../lib/StorageFactory': () => ({
              removeFile: () => Promise.reject(new Error())
            })
          });

        const error = await removeCraftFile({
          storageType: 'local',
          storagePath: 'test',
          storageFilename: 'test'
        });

        expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(error?.output?.statusCode).to.be.equal(422);
        expect(error?.message).to.be.equal('Unprocessable Entity');
      });
    });
  });
});
