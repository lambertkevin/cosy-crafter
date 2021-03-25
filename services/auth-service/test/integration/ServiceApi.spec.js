import Boom from '@hapi/boom';
import { expect } from 'chai';
import { makeRsaPublicEncrypter } from '@cosy/rsa-utils';
import * as ServiceController from '../../src/controllers/ServiceController';
import * as TokenBlacklistController from '../../src/controllers/TokenBlacklistController';
import { accessTokenFactory, refreshTokenFactory } from '../../src/utils/TokensFactory';
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

  describe('Service Find', () => {
    let service;
    before(async () => {
      service = await ServiceController.create({
        identifier: '2e2-service-login',
        key: '123',
        ip: '1.2.3.4'
      });
    });

    after(async () => {
      await ServiceController.remove([service._id]);
    });

    describe('Fails', () => {
      it('should fail returning a non existing service', () => {
        return server
          .inject({
            method: 'GET',
            url: `/services/605c806536ff1ff7465c32ca`
          })
          .then((response) => {
            expect(response).to.be.an('object');
            expect(response).to.include({ statusCode: 404 });
            expect(response.result).to.deep.include({
              statusCode: 404,
              error: 'Not Found',
              message: 'The resource with that ID does not exist or has already been deleted.'
            });
          });
      });
    });

    describe('Success', () => {
      it('should succeed finding and returung a service', () => {
        return server
          .inject({
            method: 'GET',
            url: `/services/${service._id}`
          })
          .then((response) => {
            expect(response).to.be.an('object');
            expect(response).to.include({ statusCode: 200 });
            expect(response.result).to.deep.include({ statusCode: 200 });
            expect(response.result?.data).to.deep.include(service);
          });
      });
    });
  });

  describe('Service Creation', () => {
    before(async () => {
      await TokenBlacklistController.create({
        jwtid: 'c674cda4-cf9f-4337-a198-4e7fe2e18e67',
        type: 'refresh'
      });
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
              identifier: 'integration-service'
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
              identifier: 'integration-service'
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

      it('should fail trying to create service if controller throws. HTTP 500', () => {
        const oldCreate = ServiceController.create;
        ServiceController.create = () => Promise.reject();
        return server
          .inject({
            method: 'POST',
            url: '/services',
            payload: {
              identifier: 'integration-service'
            },
            headers: {
              'x-authorization': publicEncrypter(Date.now(), 'base64')
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 500 });
            expect(response.result).to.deep.include({
              statusCode: 500,
              error: 'Internal Server Error',
              message: 'An internal server error occurred'
            });
          })
          .finally(() => {
            ServiceController.create = oldCreate;
          });
      });

      it('should fail trying to create service if controller return a Boom error. HTTP 418', () => {
        const oldCreate = ServiceController.create;
        ServiceController.create = () => Promise.resolve(Boom.teapot());
        return server
          .inject({
            method: 'POST',
            url: '/services',
            payload: {
              identifier: 'integration-service'
            },
            headers: {
              'x-authorization': publicEncrypter(Date.now(), 'base64')
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 418 });
            expect(response.result).to.deep.include({
              statusCode: 418,
              error: "I'm a teapot",
              message: "I'm a teapot"
            });
          })
          .finally(() => {
            ServiceController.create = oldCreate;
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
                message: '"identifier" length must be less than or equal to 50 characters long'
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
              identifier: 'integration-service'
            },
            headers: {
              'x-authorization': publicEncrypter(Date.now(), 'base64')
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 201 });
            expect(response?.result?.data).to.be.a('string').and.to.have.lengthOf(684);
          });
      });
    });
  });

  describe('Service Deletion', () => {
    let service;

    before(async () => {
      service = await ServiceController.create({
        identifier: 'integration-service-to-delete',
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
              identifiers: [service?._id]
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

      it('should fail trying to delete a non existing. HTTP 404', () => {
        return server
          .inject({
            method: 'DELETE',
            url: `/services`,
            payload: {
              ids: ['605c806536ff1ff7465c32ca']
            }
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

      it('should fail trying to delete service without whitelisted IP. HTTP 401', () => {
        return server
          .inject({
            method: 'DELETE',
            url: `/services`,
            payload: {
              ids: [service?._id?.toString()]
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

    describe('Success', () => {
      it('should succeed to delete a service', () => {
        return server
          .inject({
            method: 'DELETE',
            url: `/services`,
            payload: {
              ids: [service?._id?.toString()]
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 202 });
            expect(response.result).to.deep.include({
              statusCode: 202,
              data: {
                deleted: [service._id.toString()]
              }
            });
          });
      });
    });
  });

  describe('Service Login', () => {
    before(async () => {
      await ServiceController.create({
        identifier: '2e2-service-login',
        key: '123',
        ip: '1.2.3.4'
      });
    });

    describe('Fails', () => {
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
    });

    describe('Success', () => {
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
    });
  });

  describe('Service Refresh', () => {
    before(async () => {
      await TokenBlacklistController.create({
        jwtid: 'c674cda4-cf9f-4337-a198-4e7fe2e18e67',
        type: 'refresh'
      });
      await ServiceController.create({
        identifier: '2e2-service-login',
        key: '123',
        ip: '1.2.3.4'
      });
    });

    describe('Fails', () => {
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
        const accessToken = accessTokenFactory({ service: '2e2-service-login' }, 'a', '5m');
        const refreshToken = refreshTokenFactory({ service: '2e2-service-login' }, 'a', '-1s');

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

      it('should fail refresh if token is blacklisted. HTTP 401', () => {
        const accessToken = accessTokenFactory({ service: '2e2-service-login' }, 'a', '5m');
        const refreshToken = refreshTokenFactory(
          { service: '2e2-service-login' },
          'c674cda4-cf9f-4337-a198-4e7fe2e18e67',
          '1m'
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
              message: 'Token is blacklisted or service is not existing'
            });
          });
      });

      describe('Requirements', () => {
        it('fail refreshing without accessToken. HTTP 400', async () => {
          const service = await ServiceController.login(
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
                refreshToken: service.refreshToken
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

        it('fail refreshing without refreshToken. HTTP 400', async () => {
          const service = await ServiceController.login(
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
                accessToken: service.accessToken
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
      it("should succeed refreshing service's tokens", async () => {
        const service = await ServiceController.login(
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
              accessToken: service.accessToken,
              refreshToken: service.refreshToken
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
});
