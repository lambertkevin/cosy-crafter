import { expect } from 'chai';
import { v4 as uuid } from 'uuid';
import { startAuthService, accessToken } from '../utils/authUtils';
import * as CraftController from '../../src/controllers/CraftController';
import init from '../../src/server';

describe('Crafts API V1 tests', () => {
  let server;
  let authServiceChild;

  before(async () => {
    authServiceChild = await startAuthService();
    server = await init();
  });

  after(() => {
    authServiceChild.kill('SIGINT');
    server.stop();
  });

  describe('Server Testing', () => {
    it('should validate if crafts v1 API is reachable', () => {
      return server
        .inject({
          method: 'GET',
          url: '/v1/crafts'
        })
        .then((response) => {
          expect(response).to.be.a('object');
          expect(response).to.include({ statusCode: 200 });
        });
    });
  });

  describe('Craft Creation', () => {
    const craftPayload = {
      name: 'My Craft',
      jobId: uuid(),
      user: '603181b5136eaf770f0949e8',
      storageType: 'aws',
      storagePath: 'crafts/',
      storageFilename: 'craft.mp3'
    };

    describe('Fails', () => {
      it('should fail trying to create craft without jwt. HTTP 401', () => {
        return server
          .inject({
            method: 'POST',
            url: '/v1/crafts'
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 401 });
            expect(response.result).to.include({
              statusCode: 401,
              error: 'Unauthorized',
              message: 'Missing authentication'
            });
          });
      });

      describe('Requirements', () => {
        it('should fail if missing name', async () => {
          const { name, ...craftPayloadWithoutName } = craftPayload;

          return server
            .inject({
              method: 'POST',
              url: '/v1/crafts',
              payload: craftPayloadWithoutName,
              headers: {
                authorization: accessToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response.result).to.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"name" is required'
              });
            });
        });

        it('should fail if missing jobId', async () => {
          const { jobId, ...craftPayloadWithoutJobId } = craftPayload;

          return server
            .inject({
              method: 'POST',
              url: '/v1/crafts',
              payload: craftPayloadWithoutJobId,
              headers: {
                authorization: accessToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response.result).to.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"jobId" is required'
              });
            });
        });

        it('user is not required yet');

        it('should fail if missing storageType', async () => {
          const {
            storageType,
            ...craftPayloadWithoutStorageType
          } = craftPayload;

          return server
            .inject({
              method: 'POST',
              url: '/v1/crafts',
              payload: craftPayloadWithoutStorageType,
              headers: {
                authorization: accessToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response.result).to.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"storageType" is required'
              });
            });
        });

        it('should fail if missing storagePath', async () => {
          const {
            storagePath,
            ...craftPayloadWithoutStoragePath
          } = craftPayload;

          return server
            .inject({
              method: 'POST',
              url: '/v1/crafts',
              payload: craftPayloadWithoutStoragePath,
              headers: {
                authorization: accessToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response.result).to.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"storagePath" is required'
              });
            });
        });

        it('should fail if missing storageFilename', async () => {
          const {
            storageFilename,
            ...craftPayloadWithoutStorageFilename
          } = craftPayload;

          return server
            .inject({
              method: 'POST',
              url: '/v1/crafts',
              payload: craftPayloadWithoutStorageFilename,
              headers: {
                authorization: accessToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response.result).to.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"storageFilename" is required'
              });
            });
        });

        it('should fail if storageType is something other than local, aws or scaleway', async () => {
          return server
            .inject({
              method: 'POST',
              url: '/v1/crafts',
              payload: {
                ...craftPayload,
                storageType: 'abc'
              },
              headers: {
                authorization: accessToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response.result).to.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"storageType" must be one of [local, aws, scaleway]'
              });
            });
        });

        it('should fail if name is longer than 100 characters', async () => {
          return server
            .inject({
              method: 'POST',
              url: '/v1/crafts',
              payload: {
                ...craftPayload,
                name:
                  // 101 Characters
                  'fNmp9CCRAPkAyPEDPZJJyNJ91eghbVpW97IORoeDO0rCvkABooqwrEyK5vxKJGHoV4kGAba3gUourcXmKQgsN7OdDx7X0RJ4R8cVR'
              },
              headers: {
                authorization: accessToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response.result).to.include({
                statusCode: 400,
                error: 'Bad Request',
                message:
                  '"name" length must be less than or equal to 100 characters long'
              });
            });
        });
      });
    });

    describe('Success', () => {
      it('should succeed to create a craft', () => {
        return server
          .inject({
            method: 'POST',
            url: '/v1/crafts',
            payload: craftPayload,
            headers: {
              authorization: accessToken
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 200 });
            expect(response.result).to.include({
              statusCode: 200
            });
            expect(response.result.data).to.include({
              ...craftPayload
            });
          });
      });
    });
  });

  describe('Craft Update', () => {
    const craftPayload = {
      name: 'integration-craft-to-update',
      jobId: uuid(),
      user: '603181b5136eaf770f0949e8',
      storageType: 'aws',
      storagePath: 'crafts/',
      storageFilename: 'craft.mp3'
    };
    let craft;

    before(async () => {
      craft = await CraftController.create(craftPayload);
    });

    describe('Fails', () => {
      it('should fail trying to update craft without jwt. HTTP 401', () => {
        return server
          .inject({
            method: 'POST',
            url: '/v1/crafts'
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 401 });
            expect(response.result).to.include({
              statusCode: 401,
              error: 'Unauthorized',
              message: 'Missing authentication'
            });
          });
      });

      describe('Requirements', () => {
        it('should fail if storageType is something other than local, aws or scaleway', async () => {
          return server
            .inject({
              method: 'PATCH',
              url: `/v1/crafts/${craft?._id.toString()}`,
              payload: {
                storageType: 'abc'
              },
              headers: {
                authorization: accessToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response.result).to.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"storageType" must be one of [local, aws, scaleway]'
              });
            });
        });

        it('should fail if name is longer than 100 characters', async () => {
          return server
            .inject({
              method: 'PATCH',
              url: `/v1/crafts/${craft?._id.toString()}`,
              payload: {
                name:
                  'fNmp9CCRAPkAyPEDPZJJyNJ91eghbVpW97IORoeDO0rCvkABooqwrEyK5vxKJGHoV4kGAba3gUourcXmKQgsN7OdDx7X0RJ4R8cVR'
                // 101 Characters
              },
              headers: {
                authorization: accessToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response.result).to.include({
                statusCode: 400,
                error: 'Bad Request',
                message:
                  '"name" length must be less than or equal to 100 characters long'
              });
            });
        });
      });
    });

    describe('Success', () => {
      it("should succeed updating all craft's fields", async () => {
        const updatedCraftPayload = {
          name: 'integration-craft-to-update-2',
          jobId: uuid(),
          user: '603181b5136eaf770f0949a8',
          storageType: 'scaleway',
          storagePath: 'crafts2/',
          storageFilename: 'craft2.mp3'
        };

        return server
          .inject({
            method: 'PATCH',
            url: `/v1/crafts/${craft?._id?.toString()}`,
            payload: updatedCraftPayload,
            headers: {
              authorization: accessToken
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 200 });
            expect(response?.result).to.include({
              statusCode: 200
            });
            expect(response?.result?.data).to.include({
              ...updatedCraftPayload
            });
          });
      });
    });
  });

  describe('Craft Deletion', () => {
    const craftPayload = {
      name: 'integration-craft-to-delete',
      jobId: uuid(),
      user: '603181b5136eaf770f0949e8',
      storageType: 'aws',
      storagePath: 'crafts/',
      storageFilename: 'craft.mp3'
    };
    let craft;

    before(async () => {
      craft = await CraftController.create(craftPayload);
    });

    describe('Fails', () => {
      it('should fail trying to delete craft without jwt. HTTP 401', () => {
        return server
          .inject({
            method: 'DELETE',
            url: '/v1/crafts/1234a1234b1234c1234d1234'
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 401 });
            expect(response.result).to.include({
              statusCode: 401,
              error: 'Unauthorized',
              message: 'Missing authentication'
            });
          });
      });
    });

    describe('Success', () => {
      it('should succeed deleting a craft', async () => {
        return server
          .inject({
            method: 'DELETE',
            url: `/v1/crafts/${craft?._id?.toString()}`,
            headers: {
              authorization: accessToken
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 200 });
            expect(response?.result).to.include({
              statusCode: 200
            });
            expect(response?.result?.data?.deleted[0]).to.equal(
              craft?._id.toString()
            );
          });
      });
    });
  });
});
