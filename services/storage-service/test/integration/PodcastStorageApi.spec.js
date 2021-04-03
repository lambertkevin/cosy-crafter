import fs from 'fs';
import path from 'path';
import { expect } from 'chai';
import getStream from 'get-stream';
import * as StorageController from '../../src/controllers/StorageController';
import { startAuthService, accessToken } from '../utils/authUtils';
import { objectToFormData } from '../utils/formUtils';
import mockS3 from '../utils/mockS3';
import init from '../../src/server';

describe('Podcast Part Storage API V1 tests', () => {
  let s3FakeServers;
  let server;
  let authServiceChild;

  before(async () => {
    authServiceChild = await startAuthService();
    server = await init();
    s3FakeServers = await mockS3();
  });

  after(async () => {
    await authServiceChild.kill();
    server.stop();
    fs.rmdirSync(path.resolve('./bucket/tests/'), { recursive: true });
    s3FakeServers.forEach((s3) => s3.close());
  });

  describe('Podcast Part Get', () => {
    it('should get a buffer as string', async () => {
      const filepath = path.resolve('./', 'test', 'files', 'blank.mp3');
      const partPayload = {
        podcastName: 'podcast-test',
        filename: 'integration-filename.mp3',
        file: fs.createReadStream(filepath)
      };
      const bufferedFile = fs.readFileSync(filepath);
      const part = await StorageController.addPodcastPartFile(partPayload);
      return server
        .inject({
          method: 'GET',
          url: `/v1/podcast-parts/605e3daaf96692bb3780009e`,
          headers: {
            'X-Mock': JSON.stringify({
              storageType: part.storageType,
              storagePath: part.location,
              storageFilename: part.filename
            })
          }
        })
        .then((response) => {
          expect(response).to.include({ statusCode: 200 });
          expect(response?.result).to.be.equal(bufferedFile.toString());
        });
    });
  });

  describe('Podcast Part Upload', () => {
    const podcastPartPayload = {
      podcastName: 'integration-podcast',
      filename: 'integration-filename.mp3',
      file: Buffer.alloc(0)
    };

    describe('Fails', () => {
      it('should fail uploading a podcast part without jwt. HTTP 401', () => {
        return server
          .inject({
            method: 'POST',
            url: '/v1/podcast-parts'
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 401 });
            expect(response.result).to.deep.include({
              statusCode: 401,
              error: 'Unauthorized',
              message: 'Missing authentication'
            });
          });
      });

      it('should fail if request content-type is not multipart. HTTP 415', () => {
        return server
          .inject({
            method: 'POST',
            url: '/v1/podcast-parts',
            headers: {
              contentType: 'application/json',
              authorization: accessToken
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 415 });
            expect(response.result).to.deep.include({
              statusCode: 415,
              error: 'Unsupported Media Type',
              message: 'Unsupported Media Type'
            });
          });
      });

      it('should fail if podcast part file is not a stream. HTTP 422', async () => {
        const payloadFormData = objectToFormData({
          ...podcastPartPayload,
          // Returns string and not ReadableStream
          file: fs.readFileSync(path.resolve('./', 'test', 'files', 'blank.mp3'))
        });
        const payloadStream = await getStream(payloadFormData);

        return server
          .inject({
            method: 'POST',
            url: '/v1/podcast-parts',
            payload: payloadStream,
            headers: {
              ...payloadFormData.getHeaders(),
              authorization: accessToken
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 422 });
            expect(response?.result).to.include({
              statusCode: 422,
              error: 'Unprocessable Entity',
              message: 'File is not a stream'
            });
          });
      });

      it('should fail if storageType is defined but with unknow storage. HTTP 422', async () => {
        const payloadFormData = objectToFormData({
          ...podcastPartPayload,
          storageStrategy: 'unknown-storage'
        });
        const payloadStream = await getStream(payloadFormData);

        return server
          .inject({
            method: 'POST',
            url: '/v1/podcast-parts',
            payload: payloadStream,
            headers: {
              ...payloadFormData.getHeaders(),
              authorization: accessToken
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 422 });
            expect(response.result).to.deep.include({
              statusCode: 422,
              error: 'Unprocessable Entity',
              message: "At least one storage type doesn't exist"
            });
          });
      });

      describe('Requirements', () => {
        it('should fail if missing podcastName', async () => {
          const payloadFormData = objectToFormData({
            ...podcastPartPayload,
            podcastName: null
          });
          const payloadStream = await getStream(payloadFormData);

          return server
            .inject({
              method: 'POST',
              url: '/v1/podcast-parts',
              payload: payloadStream,
              headers: {
                ...payloadFormData.getHeaders(),
                authorization: accessToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response.result).to.deep.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"podcastName" is required'
              });
            });
        });

        it('should fail if missing filename', async () => {
          const payloadFormData = objectToFormData({
            ...podcastPartPayload,
            filename: null
          });
          const payloadStream = await getStream(payloadFormData);

          return server
            .inject({
              method: 'POST',
              url: '/v1/podcast-parts',
              payload: payloadStream,
              headers: {
                ...payloadFormData.getHeaders(),
                authorization: accessToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response.result).to.deep.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"filename" is required'
              });
            });
        });

        it('should fail if missing file', async () => {
          const payloadFormData = objectToFormData({
            ...podcastPartPayload,
            file: null
          });
          const payloadStream = await getStream(payloadFormData);

          return server
            .inject({
              method: 'POST',
              url: '/v1/podcast-parts',
              payload: payloadStream,
              headers: {
                ...payloadFormData.getHeaders(),
                authorization: accessToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response.result).to.deep.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"file" is required'
              });
            });
        });
      });
    });

    describe('Success', () => {
      it('should succeed uploading podcast part on local', async () => {
        const payloadFormData = objectToFormData({
          ...podcastPartPayload,
          file: fs.createReadStream(path.resolve('./', 'test', 'files', 'blank.mp3'))
        });
        const payloadStream = await getStream(payloadFormData);

        return server
          .inject({
            method: 'POST',
            url: '/v1/podcast-parts',
            payload: payloadStream,
            headers: {
              ...payloadFormData.getHeaders(),
              authorization: accessToken
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 200 });
            expect(response?.result).to.include({
              statusCode: 200
            });
            expect(response?.result?.data).to.have.property('filename');
            expect(response?.result?.data).to.include({
              location: 'podcasts/integration-podcast',
              storageType: 'local',
              publicLink: undefined
            });
          });
      });

      it('should succeed uploading podcast part on aws', async () => {
        const payloadFormData = objectToFormData({
          ...podcastPartPayload,
          file: fs.createReadStream(path.resolve('./', 'test', 'files', 'blank.mp3')),
          storageStrategy: 'aws'
        });
        const payloadStream = await getStream(payloadFormData);

        return server
          .inject({
            method: 'POST',
            url: '/v1/podcast-parts',
            payload: payloadStream,
            headers: {
              ...payloadFormData.getHeaders(),
              authorization: accessToken
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 200 });
            expect(response?.result).to.include({
              statusCode: 200
            });
            expect(response?.result?.data).to.have.property('filename');
            expect(response?.result?.data).to.include({
              location: 'podcasts/integration-podcast',
              storageType: 'aws',
              publicLink: `https://cosy-crafter-backup.s3.eu-west-3.amazonaws.com/podcasts/integration-podcast/${response?.result?.data?.filename}`
            });
          });
      });

      it('should succeed uploading podcast part on scaleway', async () => {
        const payloadFormData = objectToFormData({
          ...podcastPartPayload,
          file: fs.createReadStream(path.resolve('./', 'test', 'files', 'blank.mp3')),
          storageStrategy: 'scaleway'
        });
        const payloadStream = await getStream(payloadFormData);

        return server
          .inject({
            method: 'POST',
            url: '/v1/podcast-parts',
            payload: payloadStream,
            headers: {
              ...payloadFormData.getHeaders(),
              authorization: accessToken
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 200 });
            expect(response?.result).to.include({
              statusCode: 200
            });
            expect(response?.result?.data).to.have.property('filename');
            expect(response?.result?.data).to.include({
              location: 'podcasts/integration-podcast',
              storageType: 'scaleway',
              publicLink: `https://cosy-crafter.s3.fr-par.scw.cloud/podcasts/integration-podcast/${response?.result?.data?.filename}`
            });
          });
      });
    });
  });

  describe('Podcast Part Deletion', () => {
    let localStoredFile;
    let awsStoredFile;
    let scalewayStoredFile;

    before(async () => {
      localStoredFile = await StorageController.addPodcastPartFile({
        file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
        podcastName: 'integration-podcast',
        filename: 'integration-filename.mp3',
        storageStrategy: 'local'
      });
      awsStoredFile = await StorageController.addPodcastPartFile({
        file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
        podcastName: 'integration-podcast',
        filename: 'integration-filename.mp3',
        storageStrategy: 'aws'
      });
      scalewayStoredFile = await StorageController.addPodcastPartFile({
        file: fs.createReadStream(path.resolve('./test/files/blank.mp3')),
        podcastName: 'integration-podcast',
        filename: 'integration-filename.mp3',
        storageStrategy: 'scaleway'
      });
    });

    describe('Fails', () => {
      it('should fail deleting a podcast part without jwt. HTTP 401', () => {
        return server
          .inject({
            method: 'DELETE',
            url: '/v1/podcast-parts',
            payload: {
              storageType: localStoredFile?.storageType,
              storagePath: localStoredFile?.location,
              storageFilename: localStoredFile?.filename
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 401 });
            expect(response.result).to.deep.include({
              statusCode: 401,
              error: 'Unauthorized',
              message: 'Missing authentication'
            });
          });
      });

      describe('Requirements', () => {
        it('should fail if missing storageType', async () => {
          return server
            .inject({
              method: 'DELETE',
              url: '/v1/podcast-parts',
              payload: {
                storageFilename: localStoredFile?.filename,
                storageFilename: localStoredFile?.filename
              },
              headers: {
                authorization: accessToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response.result).to.deep.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"storageType" is required'
              });
            });
        });

        it('should fail if missing storagePath', async () => {
          return server
            .inject({
              method: 'DELETE',
              url: '/v1/podcast-parts',
              payload: {
                storageType: localStoredFile?.storageType,
                storageFilename: localStoredFile?.filename
              },
              headers: {
                authorization: accessToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response.result).to.deep.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"storagePath" is required'
              });
            });
        });

        it('should fail if missing storageFilename', async () => {
          return server
            .inject({
              method: 'DELETE',
              url: '/v1/podcast-parts',
              payload: {
                storageType: localStoredFile?.storageType,
                storagePath: localStoredFile?.location
              },
              headers: {
                authorization: accessToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response.result).to.deep.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"storageFilename" is required'
              });
            });
        });
      });
    });

    describe('Success', () => {
      it('should succeed deleting podcast part on local', () => {
        return server
          .inject({
            method: 'DELETE',
            url: '/v1/podcast-parts',
            payload: {
              storageType: localStoredFile?.storageType,
              storagePath: localStoredFile?.location,
              storageFilename: localStoredFile?.filename
            },
            headers: {
              authorization: accessToken
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 200 });
            expect(response?.result).to.deep.include({
              statusCode: 200,
              data: { deleted: localStoredFile?.filename }
            });
          });
      });

      it('should succeed deleting podcast part on aws', () => {
        return server
          .inject({
            method: 'DELETE',
            url: '/v1/podcast-parts',
            payload: {
              storageType: awsStoredFile?.storageType,
              storagePath: awsStoredFile?.location,
              storageFilename: awsStoredFile?.filename
            },
            headers: {
              authorization: accessToken
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 200 });
            expect(response?.result).to.deep.include({
              statusCode: 200,
              data: {
                deleted: awsStoredFile?.filename
              }
            });
          });
      });

      it('should succeed deleting podcast part on scaleway', () => {
        return server
          .inject({
            method: 'DELETE',
            url: '/v1/podcast-parts',
            payload: {
              storageType: scalewayStoredFile?.storageType,
              storagePath: scalewayStoredFile?.location,
              storageFilename: scalewayStoredFile?.filename
            },
            headers: {
              authorization: accessToken
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 200 });
            expect(response?.result).to.deep.include({
              statusCode: 200,
              data: {
                deleted: scalewayStoredFile?.filename
              }
            });
          });
      });
    });
  });
});
