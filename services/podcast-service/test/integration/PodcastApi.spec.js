import { expect } from 'chai';
import { startAuthService, accessToken } from '../utils/authUtils';
import * as PodcastController from '../../src/controllers/PodcastController';
import { hiddenFields } from '../../src/models/PodcastModel';
import init from '../../src/server';

describe('Podcasts API V1 tests', () => {
  let server;
  let authServiceChild;

  before(async () => {
    authServiceChild = await startAuthService();
    server = await init();
  });

  after(async () => {
    await authServiceChild.kill();
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

  describe('Podcasts Get', () => {
    let podcast;

    before(async () => {
      const podcastPayload = {
        name: 'integration-podcast-to-get',
        edition: 12983
      };
      podcast = await PodcastController.create(podcastPayload);
    });

    it('should return a sanitized podcast', () => {
      return server
        .inject({
          method: 'GET',
          url: `/v1/podcasts/${podcast._id.toString()}`
        })
        .then((response) => {
          expect(response).to.be.a('object');
          expect(response).to.include({ statusCode: 200 });
          expect(response?.result).to.include({
            statusCode: 200
          });
          expect(response?.result?.data?._id?.toString()).to.be.equal(podcast._id?.toString());
          expect(response?.result?.data).to.not.have.keys(...hiddenFields);
        });
    });

    it('should return a non sanitized podcast', () => {
      return server
        .inject({
          method: 'GET',
          url: `/v1/podcasts/${podcast._id.toString()}`,
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
          expect(response?.result?.data?._id?.toString()).to.be.equal(podcast._id?.toString());
          expect(response?.result?.data?.toJSON()).to.include.keys(...hiddenFields);
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
            expect(response?.result).to.include({
              statusCode: 401,
              error: 'Unauthorized',
              message: 'Missing authentication'
            });
          });
      });

      describe('Requirements', () => {
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
              expect(response?.result).to.include({
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
                name: 'integration-podcast-test'
              },
              headers: {
                authorization: accessToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response?.result).to.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"edition" is required'
              });
            });
        });

        it('should fail if edition is not a number', async () => {
          return server
            .inject({
              method: 'POST',
              url: '/v1/podcasts',
              payload: {
                name: 'integration-podcast-not-number-edition',
                edition: -1
              },
              headers: {
                authorization: accessToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response?.result).to.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"edition" must be a positive number'
              });
            });
        });

        it('should fail if edition is not a positive number', async () => {
          return server
            .inject({
              method: 'POST',
              url: '/v1/podcasts',
              payload: {
                name:
                  // 101 characters
                  'ufpF4G7Ai5FR32f8I63iAQJVV6X51eD9MCMWUmQ4VbbfLih4uFD5bzFfASJEnuOH6LnZOjySvxiyUHIctk9EIjRsnyQeLzpWgEvo3',
                edition: 300
              },
              headers: {
                authorization: accessToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response?.result).to.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"name" length must be less than or equal to 100 characters long'
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
              name: 'integration-test-podcast',
              edition: 4
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
              name: 'integration-test-podcast'
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
            expect(response?.result).to.include({
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
          name: 'integration-podcast-to-update',
          edition: 100
        });

        return server
          .inject({
            method: 'PATCH',
            url: `/v1/podcasts/${podcastToUpdate?._id?.toString()}`,
            payload: {
              name: 'integration-podcast-to-update-2',
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
              name: 'integration-podcast-to-update-2',
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
            expect(response?.result).to.include({
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
          name: 'integration-podcast-to-delete',
          edition: 200
        });

        return server
          .inject({
            method: 'DELETE',
            url: `/v1/podcasts/${podcastToDelete?._id?.toString()}`,
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
            expect(response?.result?.data?.deleted[0]).to.equal(podcastToDelete?._id.toString());
          });
      });

      it('should also succeed deleting a podcast', async () => {
        const podcastToDelete = await PodcastController.create({
          name: 'integration-podcast-to-delete',
          edition: 200
        });

        return server
          .inject({
            method: 'DELETE',
            url: `/v1/podcasts`,
            payload: {
              ids: [podcastToDelete?._id?.toString()]
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
            expect(response?.result?.data?.deleted[0]).to.equal(podcastToDelete?._id.toString());
          });
      });
    });
  });
});
