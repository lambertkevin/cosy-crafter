import { expect } from 'chai';
import { v4 as uuid } from 'uuid';
import * as TokenBlacklistController from '../../src/controllers/TokenBlacklistController';
import init from '../../src/server';

describe('Tokens Blacklist API tests', () => {
  let server;

  before(async () => {
    server = await init();
  });

  after(() => {
    server.stop();
  });

  describe('Server Testing', () => {
    it('should validate if services API is reachable', () => {
      return server
        .inject({
          method: 'GET',
          url: '/tokens'
        })
        .then((response) => {
          expect(response).to.be.a('object');
          expect(response).to.include({ statusCode: 200 });
        });
    });
  });

  describe('Blacklisted Token Creation', () => {
    describe('Fails', () => {
      it.skip('should fail trying to create blacklisted token if user is not allowed. HTTP 401', () => {
        return server
          .inject({
            method: 'POST',
            url: '/tokens',
            payload: {
              type: 'access',
              jwtid: uuid()
            },
            headers: {
              // @TODO Add user auth here
              // authorization: ???
            },
            remoteAddress: '1.1.1.1'
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 401 });
            expect(response.result).to.deep.include({
              statusCode: 401,
              error: 'Unauthorized',
              message: 'Remote not authorized'
            });
          });
      });

      describe('Requirements', () => {
        it('fail creating if type is not refresh or access identifier', () => {
          return server
            .inject({
              method: 'POST',
              url: '/tokens',
              payload: {
                type: 'e2eToken',
                jwtid: uuid()
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response?.result).to.deep.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"type" must be one of [access, refresh]'
              });
            });
        });

        it('fail creating if jwtid is not 36 characters', () => {
          return server
            .inject({
              method: 'POST',
              url: '/tokens',
              payload: {
                type: 'access',
                // 35 Characters
                jwtid: 'alzQBV2dfdj2DFY6lkoApgoPbEGCDVdyFjz'
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response?.result).to.deep.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"jwtid" length must be 36 characters long'
              });
            });
        });
      });
    });

    describe('Success', () => {
      it('should succeed blacklisting a token', () => {
        const jwtid = uuid();

        return server
          .inject({
            method: 'POST',
            url: '/tokens',
            payload: {
              type: 'refresh',
              jwtid
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 200 });
            expect(response?.result).to.include({
              statusCode: 200
            });
            expect(response?.result?.data).to.include({
              type: 'refresh',
              jwtid
            });
          });
      });
    });
  });

  describe('Blacklisted Token Deletion', () => {
    let token;

    before(async () => {
      token = await TokenBlacklistController.create({
        type: 'refresh',
        jwtid: uuid()
      });
    });

    describe('Fails', () => {
      it.skip('should fail trying to delete a blacklisted token from not allowed user. HTTP 401', () => {
        return server
          .inject({
            method: 'DELETE',
            url: `/tokens/${token?.data?._id}`,
            headers: {
              // @TODO Add user login when feature available
              // authorization: ???
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 401 });
            expect(response.result).to.deep.include({
              statusCode: 401,
              error: 'Unauthorized',
              message: 'Unauthorized'
            });
          });
      });
    });

    describe('Success', () => {
      it('should succeed deleting a blacklisted token', () => {
        return server
          .inject({
            method: 'DELETE',
            url: `/tokens/${token?.data?._id.toString()}`,
            headers: {
              // @TODO Add user login when feature available
              // authorization: ???
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 200 });
            expect(response.result).to.include({
              statusCode: 200
            });
            expect(response.result?.data?.deleted[0]).to.be.equal(
              token?.data?._id.toString()
            );
          });
      });
    });
  });
});
