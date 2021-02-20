import { expect } from 'chai';
import { startAuthService, accessToken } from '../utils/authUtils';
import * as PodcastController from '../../src/controllers/PodcastController';
import init from '../../src/server';

describe('Podcasts API V1 tests', () => {
  let server;
  let pid;

  before(async () => {
    const authServiceChild = await startAuthService();
    pid = authServiceChild.pid;
    server = await init();
  });

  after(() => {
    process.kill(pid);
    server.stop();
  });

  describe('Server Testing', () => {
    it('should validate if podcasts v1 API is reachable', () => {
      return server
        .inject({
          method: 'GET',
          url: '/v1/podcasts'
        })
        .then((response) => {
          expect(response).to.be.a('object');
          expect(response).to.include({ statusCode: 200 });
        });
    });
  });

  describe('Podcast Creation', () => {
    describe('Fails', () => {
      it('should fail trying to create podcast without jwt. HTTP 401', () => {
        return server
          .inject({
            method: 'POST',
            url: '/v1/podcasts'
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

      describe('Required fields', () => {
        it('should fail if missing name', async () => {
          return server
            .inject({
              method: 'POST',
              url: '/v1/podcasts',
              payload: {
                edition: 12
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
                message: '"name" is required'
              });
            });
        });

        it('should fail if missing edition', async () => {
          return server
            .inject({
              method: 'POST',
              url: '/v1/podcasts',
              payload: {
                name: 'e2e-podcast-test'
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
                message: '"edition" is required'
              });
            });
        });
      });
    });

    describe('Success', () => {
      it('should succeed to create a podcast', () => {
        return server
          .inject({
            method: 'POST',
            url: '/v1/podcasts',
            payload: {
              name: 'e2e-test-podcast',
              edition: 4
            },
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
              name: 'e2e-test-podcast'
            });
          });
      });
    });
  });

  describe('Podcast Update', () => {
    describe('Fails', () => {
      it('should fail trying to update podcast without jwt. HTTP 401', () => {
        return server
          .inject({
            method: 'POST',
            url: '/v1/podcasts'
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
      it('should succeed updating a podcast basic fields', async () => {
        const podcastToUpdate = await PodcastController.create({
          name: 'e2e-podcast-to-update',
          edition: 100
        });

        return server
          .inject({
            method: 'PATCH',
            url: `/v1/podcasts/${podcastToUpdate?.data?._id?.toString()}`,
            payload: {
              name: 'e2e-podcast-to-update-2',
              edition: 101
            },
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
              name: 'e2e-podcast-to-update-2',
              edition: 101
            });
          });
      });
    });
  });

  describe('Podcast Deletion', () => {
    describe('Fails', () => {
      it('should fail trying to delete podcast without jwt. HTTP 401', () => {
        return server
          .inject({
            method: 'DELETE',
            url: '/v1/podcasts/1234a1234b1234c1234d1234'
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
      it('should succeed deleting a podcast', async () => {
        const podcastToDelete = await PodcastController.create({
          name: 'e2e-podcast-to-delete',
          edition: 200
        });

        return server
          .inject({
            method: 'DELETE',
            url: `/v1/podcasts/${podcastToDelete?.data?._id?.toString()}`,
            payload: {
              name: 'e2e-podcast-to-update-2',
              edition: 101
            },
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
              podcastToDelete?.data?._id.toString()
            );
          });
      });
    });
  });
});
