import { expect } from 'chai';
import { startAuthService, accessToken } from '../utils/authUtils';
import init from '../../src/server';

describe('Sections API tests', () => {
  let server;
  let pid;

  before(async () => {
    const authServiceChild = await startAuthService();
    pid = authServiceChild.pid;
    server = await init();
  });

  after(() => {
    process.kill(pid);
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

  describe('Section Creation and Deletion', () => {
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

      describe('Required fields', () => {
        it('should fail if missing name', async () => {
          return server
            .inject({
              method: 'POST',
              url: '/v1/sections',
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
      });
    });

    describe('Success', () => {
      it('should succeed to create a section', () => {
        return server
          .inject({
            method: 'POST',
            url: '/v1/sections',
            payload: {
              name: 'e2e-test-section'
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
              name: 'e2e-test-section'
            });
          });
      });
    });
  });

  describe.skip('Section Update', () => {
    it('has to be implemented');
  });
});
