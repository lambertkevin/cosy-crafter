import { expect } from 'chai';
import { startAuthService, accessToken } from '../utils/authUtils';
import * as SectionController from '../../src/controllers/SectionController';
import init from '../../src/server';

describe('Sections API V1 tests', () => {
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
    it('should validate if sections v1 API is reachable', () => {
      return server
        .inject({
          method: 'GET',
          url: '/v1/sections'
        })
        .then((response) => {
          expect(response).to.be.a('object');
          expect(response).to.include({ statusCode: 200 });
        });
    });
  });

  describe('Section Creation', () => {
    describe('Fails', () => {
      it('should fail trying to create section without jwt. HTTP 401', () => {
        return server
          .inject({
            method: 'POST',
            url: '/v1/sections'
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
          return server
            .inject({
              method: 'POST',
              url: '/v1/sectionsa',
              payload: {},
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

        it('should fail if name is longer than 100 characters', async () => {
          return server
            .inject({
              method: 'POST',
              url: '/v1/sections',
              payload: {
                name:
                  // 101 characters
                  'ufpF4G7Ai5FR32f8I63iAQJVV6X51eD9MCMWUmQ4VbbfLih4uFD5bzFfASJEnuOH6LnZOjySvxiyUHIctk9EIjRsnyQeLzpWgEvo3'
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
      it('should succeed to create a section', () => {
        return server
          .inject({
            method: 'POST',
            url: '/v1/sections',
            payload: {
              name: 'integration-test-section'
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
              name: 'integration-test-section'
            });
          });
      });
    });
  });

  describe('Section Update', () => {
    describe('Fails', () => {
      it('should fail trying to update section without jwt. HTTP 401', () => {
        return server
          .inject({
            method: 'POST',
            url: '/v1/sections'
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
      it('should succeed updating a section basic fields', async () => {
        const sectionToUpdate = await SectionController.create({
          name: 'integration-section-to-update'
        });

        return server
          .inject({
            method: 'PATCH',
            url: `/v1/sections/${sectionToUpdate?.data?._id?.toString()}`,
            payload: {
              name: 'integration-section-to-update-2'
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
              name: 'integration-section-to-update-2'
            });
          });
      });
    });
  });

  describe('Section Deletion', () => {
    describe('Fails', () => {
      it('should fail trying to delete section without jwt. HTTP 401', () => {
        return server
          .inject({
            method: 'DELETE',
            url: '/v1/sections/1234a1234b1234c1234d1234'
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
      it('should succeed deleting a section', async () => {
        const sectionToDelete = await SectionController.create({
          name: 'integration-section-to-delete',
          edition: 200
        });

        return server
          .inject({
            method: 'DELETE',
            url: `/v1/sections/${sectionToDelete?.data?._id?.toString()}`,
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
              sectionToDelete?.data?._id.toString()
            );
          });
      });
    });
  });
});
