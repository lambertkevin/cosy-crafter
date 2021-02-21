import { expect } from 'chai';
import { makeRsaPublicEncrypter } from '../../src/utils/RsaUtils';
import * as ServiceController from '../../src/controllers/ServiceController';
import {
  accessTokenFactory,
  refreshTokenFactory
} from '../../src/utils/TokensFactory';
import init from '../../src/server';

describe('Services API tests', () => {
  const publicEncrypter = makeRsaPublicEncrypter();
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
          url: '/services'
        })
        .then((response) => {
          expect(response).to.be.a('object');
          expect(response).to.include({ statusCode: 200 });
        });
    });
  });

  describe('Service Creation', () => {
    before(async () => {
      await ServiceController.create({
        identifier: '2e2-service-login',
        key: '123',
        ip: '1.2.3.4'
      });
    });

    describe('Fails', () => {
      it('should fail trying to create service without valid signature. HTTP 401', () => {
        return server
          .inject({
            method: 'POST',
            url: '/services',
            payload: {
              identifier: 'e2e-service'
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

      it('should fail trying to create service if ip is not whitelisted. HTTP 401', () => {
        return server
          .inject({
            method: 'POST',
            url: '/services',
            payload: {
              identifier: 'e2e-service'
            },
            headers: {
              'x-authorization': publicEncrypter(Date.now(), 'base64')
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

      it('should fail login as service with unencrypted key. HTTP 401', () => {
        return server
          .inject({
            method: 'POST',
            url: '/services/login',
            payload: {
              identifier: '2e2-service-login',
              key: 'wrong-password'
            },
            headers: {
              'x-authorization': publicEncrypter(Date.now(), 'base64')
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

      it('should fail login with wrong service key. HTTP 401', () => {
        return server
          .inject({
            method: 'POST',
            url: '/services/login',
            payload: {
              identifier: '2e2-service-login',
              key: publicEncrypter('wrong-password', 'base64')
            },
            headers: {
              'x-authorization': publicEncrypter(Date.now(), 'base64')
            },
            remoteAddress: '1.2.3.4'
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 401 });
            expect(response.result).to.deep.include({
              statusCode: 401,
              error: 'Unauthorized',
              message: "Service isn't matching ip or key"
            });
          });
      });

      it('should fail login as unexisting service. HTTP 404', () => {
        return server
          .inject({
            method: 'POST',
            url: '/services/login',
            payload: {
              identifier: '2e2-service-unexisting',
              key: publicEncrypter('123', 'base64')
            },
            headers: {
              'x-authorization': publicEncrypter(Date.now(), 'base64')
            },
            remoteAddress: '1.2.3.4'
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 404 });
            expect(response.result).to.deep.include({
              statusCode: 404,
              error: 'Not Found',
              message: 'Not Found'
            });
          });
      });

      it('should fail login as service with wrong ip. HTTP 401', () => {
        return server
          .inject({
            method: 'POST',
            url: '/services/login',
            payload: {
              identifier: '2e2-service-login',
              key: publicEncrypter('123', 'base64')
            },
            headers: {
              'x-authorization': publicEncrypter(Date.now(), 'base64')
            },
            remoteAddress: '1.2.3.5'
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 401 });
            expect(response.result).to.deep.include({
              statusCode: 401,
              error: 'Unauthorized',
              message: "Service isn't matching ip or key"
            });
          });
      });

      it('should fail refreshing tokens with wrong tokens. HTTP 401', () => {
        return server
          .inject({
            method: 'POST',
            url: '/services/refresh',
            payload: {
              accessToken:
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXJ2aWNlIjoiMmUyLXNlcnZpY2UtbG9naW4iLCJpYXQiOjE2MTM5MjAyNDYsImV4cCI6MTYxMzkyNzQ0NiwianRpIjoiNGQzZTViNDgtZjMwMi00ZDQ2LThmNTEtYmVkZDhkODg2ZTdiIn0.hk_DQQYpHhVLdV67lK8RE68WI3toz62MdtvqgwgFhNk',
              refreshToken:
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXJ2aWNlIjoiMmUyLXNlcnZpY2UtbG9naW4iLCJpYXQiOjE2MTM5MjAyNDYsImV4cCI6MTYxNDAwNjY0NiwianRpIjoiMmMxNWVlZDQtZTMwOC00Mzc4LTgxZjEtNjdkYTEyZTI5MWNjIn0.4sGKWPTYOyqVJO0jjv_Ewm4NHlDh2yYcfKskNEJuTmM'
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 401 });
            expect(response.result).to.deep.include({
              statusCode: 401,
              error: 'Unauthorized',
              message: 'Tokens verification failed'
            });
          });
      });

      it('should fail refreshing tokens with expired refresh token. HTTP 401', () => {
        const accessToken = accessTokenFactory(
          { service: '2e2-service-login' },
          'a',
          '5m'
        );
        const refreshToken = refreshTokenFactory(
          { service: '2e2-service-login' },
          'a',
          '-1s'
        );

        return server
          .inject({
            method: 'POST',
            url: '/services/refresh',
            payload: {
              accessToken,
              refreshToken
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 401 });
            expect(response.result).to.deep.include({
              statusCode: 401,
              error: 'Unauthorized',
              message: 'Tokens verification failed'
            });
          });
      });

      describe('Requirements', () => {
        it('fail creating if missing identifier', () => {
          return server
            .inject({
              method: 'POST',
              url: '/services',
              payload: {},
              headers: {
                'x-authorization': publicEncrypter(Date.now(), 'base64')
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response?.result).to.deep.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"identifier" is required'
              });
            });
        });

        it('fail creating if identifier is longer than 50 characters', () => {
          return server
            .inject({
              method: 'POST',
              url: '/services',
              payload: {
                identifier:
                  // 51 characters
                  'y9H0qsuue2cTBaKvT0RY2egZa9zBkWuArDWuLuAkjMFi7edugcc'
              },
              headers: {
                'x-authorization': publicEncrypter(Date.now(), 'base64')
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response?.result).to.deep.include({
                statusCode: 400,
                error: 'Bad Request',
                message:
                  '"identifier" length must be less than or equal to 50 characters long'
              });
            });
        });

        it('fail refreshing accessToken. HTTP 400', async () => {
          const { data } = await ServiceController.login(
            {
              identifier: '2e2-service-login',
              key: '123'
            },
            '1.2.3.4'
          );

          return server
            .inject({
              method: 'POST',
              url: '/services/refresh',
              payload: {
                refreshToken: data.refreshToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response.result).to.deep.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"accessToken" is required'
              });
            });
        });

        it('fail refreshing refreshToken. HTTP 400', async () => {
          const { data } = await ServiceController.login(
            {
              identifier: '2e2-service-login',
              key: '123'
            },
            '1.2.3.4'
          );

          return server
            .inject({
              method: 'POST',
              url: '/services/refresh',
              payload: {
                accessToken: data.accessToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response.result).to.deep.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"refreshToken" is required'
              });
            });
        });
      });
    });

    describe('Success', () => {
      it('should succeed creating service', () => {
        return server
          .inject({
            method: 'POST',
            url: '/services',
            payload: {
              identifier: 'e2e-service'
            },
            headers: {
              'x-authorization': publicEncrypter(Date.now(), 'base64')
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 200 });
            expect(response?.result)
              .to.be.a('string')
              .and.to.have.lengthOf(684);
          });
      });

      it('should succeed login a service', () => {
        return server
          .inject({
            method: 'POST',
            url: '/services/login',
            payload: {
              identifier: '2e2-service-login',
              key: publicEncrypter('123', 'base64')
            },
            headers: {
              'x-authorization': publicEncrypter(Date.now(), 'base64')
            },
            remoteAddress: '1.2.3.4'
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 200 });
            expect(response.result?.data).to.have.property('accessToken');
            expect(response.result?.data).to.have.property('refreshToken');
          });
      });

      it("should succeed refreshing service's tokens", async () => {
        const { data } = await ServiceController.login(
          {
            identifier: '2e2-service-login',
            key: '123'
          },
          '1.2.3.4'
        );

        return server
          .inject({
            method: 'POST',
            url: '/services/refresh',
            payload: {
              accessToken: data.accessToken,
              refreshToken: data.refreshToken
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 200 });
            expect(response.result).to.deep.include({
              statusCode: 200
            });
            expect(response?.result?.data).to.have.property('accessToken');
            expect(response?.result?.data).to.have.property('refreshToken');
          });
      });
    });
  });

  describe('Service Deletion', () => {
    let service;

    before(async () => {
      service = await ServiceController.create({
        identifier: 'e2e-service-to-delete',
        key: '123',
        ip: '1.2.3.4'
      });
    });

    describe('Fails', () => {
      it.skip('should fail trying to delete service without valid JWT. HTTP 401', () => {
        return server
          .inject({
            method: 'DELETE',
            url: `/services`,
            payload: {
              identifiers: [service?.data?.identifier]
            },
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

      it('should fail trying to delete service without whitelisted IP. HTTP 401', () => {
        return server
          .inject({
            method: 'DELETE',
            url: `/services`,
            payload: {
              identifiers: [service?.data?.identifier]
            },
            remoteAddress: '1.2.3.4'
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
    });
  });
});
