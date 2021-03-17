import { expect } from 'chai';
import io from 'socket.io-client';
import {
  startAuthService,
  accessToken,
  accessTokenExpired
} from '../utils/authUtils';
import { transcodingQueue } from '../../src/queue';
import init from '../../src/server';

describe('Socket Clients Api tests', () => {
  let server;
  let authServiceChild;

  before(async () => {
    authServiceChild = await startAuthService();
    server = await init();
  });

  after(() => {
    authServiceChild.kill('SIGINT');
    server.close();
  });

  describe('Server Testing', () => {
    describe('Fails', () => {
      it('should fail to connect to pool without JWT', (done) => {
        io(
          `http://${process.env.POOL_SERVICE_NAME}:${process.env.POOL_SERVICE_PORT}/clients`
        ).on('connect_error', function cb(error) {
          expect(error?.data).to.deep.include({
            name: 'JsonWebTokenError',
            message: 'jwt must be provided'
          });
          this.close();
          done();
        });
      });

      it('should fail to connect to pool with invalid JWT', (done) => {
        io(
          `http://${process.env.POOL_SERVICE_NAME}:${process.env.POOL_SERVICE_PORT}/clients`,
          {
            auth: {
              token: 'wrong-token'
            }
          }
        ).on('connect_error', function cb(error) {
          expect(error?.data).to.deep.include({
            name: 'JsonWebTokenError',
            message: 'jwt malformed'
          });
          this.close();
          done();
        });
      });

      it('should fail to connect to pool with expired JWT', (done) => {
        io(
          `http://${process.env.POOL_SERVICE_NAME}:${process.env.POOL_SERVICE_PORT}/clients`,
          {
            auth: {
              token: accessTokenExpired
            }
          }
        ).on('connect_error', function cb(error) {
          expect(error?.data).to.deep.include({
            name: 'TokenExpiredError',
            message: 'jwt expired'
          });
          this.close();
          done();
        });
      });
    });

    describe('Success', () => {
      it('should successfully connect to pool WS', (done) => {
        io(
          `http://${process.env.POOL_SERVICE_NAME}:${process.env.POOL_SERVICE_PORT}/clients`,
          {
            auth: {
              token: accessToken
            }
          }
        ).on('connect', function cb() {
          expect(this.connected).to.be.equal(true);
          this.close();
          done();
        });
      });

      it('should successfully refresh token if accessToken is expired and retry', (done) => {
        let token = accessTokenExpired;
        io(
          `http://${process.env.POOL_SERVICE_NAME}:${process.env.POOL_SERVICE_PORT}/clients`,
          {
            auth: (cb) =>
              cb({
                token
              })
          }
        )
          .on('connect', function cb() {
            expect(this.connected).to.be.equal(true);
            done();
          })
          .on('connect_error', async function cb(error) {
            if (error.data.name === 'TokenExpiredError') {
              // simulate refreshing the token
              await new Promise((resolve) => {
                setTimeout(() => {
                  token = accessToken;
                  resolve();
                }, 10);
              });
              this.connect();
            }
          });
      });
    });
  });

  describe('Job Addition', () => {
    let filePodcast;
    let jobPayload;
    let userInput;
    let pool;

    before(() => {
      pool = io(
        `http://${process.env.POOL_SERVICE_NAME}:${process.env.POOL_SERVICE_PORT}/clients`,
        {
          auth: {
            token: accessToken
          }
        }
      );
      filePodcast = {
        id: '1234a1234b1234c1234d1234',
        type: 'podcast-part',
        seek: {
          start: 0,
          end: 10
        }
      };
      userInput = {
        id: '1234e1234f1234g1234h1234',
        type: 'user-input',
        seek: {
          start: 0,
          end: 10
        }
      };
      jobPayload = {
        name: 'integration-job',
        files: [filePodcast, userInput]
      };
    });

    describe('Fails', () => {
      describe('Requirements', () => {
        it('should fail without name. ERROR CODE 400', (done) => {
          pool.emit(
            '/v1/jobs/add',
            { ...jobPayload, name: null },
            (response) => {
              expect(response).to.deep.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"name" must be a string'
              });
              done();
            }
          );
        });

        it('should fail without files. ERROR CODE 400', (done) => {
          pool.emit(
            '/v1/jobs/add',
            { ...jobPayload, files: null },
            (response) => {
              expect(response).to.deep.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"files" must be an array'
              });
              done();
            }
          );
        });

        it("should fail if file don't have id. ERROR CODE 400", (done) => {
          const payload = {
            ...jobPayload,
            files: [{ ...filePodcast, id: null }]
          };

          pool.emit('/v1/jobs/add', payload, (response) => {
            expect(response).to.deep.include({
              statusCode: 400,
              error: 'Bad Request',
              message: '"files[0].id" must be a string'
            });
            done();
          });
        });

        it('should fail if file id is not 24 characters long. ERROR CODE 400', (done) => {
          const payload = {
            ...jobPayload,
            files: [{ ...filePodcast, id: '1' }]
          };

          pool.emit('/v1/jobs/add', payload, (response) => {
            expect(response).to.deep.include({
              statusCode: 400,
              error: 'Bad Request',
              message: '"files[0].id" length must be 24 characters long'
            });
            done();
          });
        });

        it('should fail if file type is not podcast-part or user-input. ERROR CODE 400', (done) => {
          const payload = {
            ...jobPayload,
            files: [{ ...filePodcast, type: 'integration-type' }]
          };

          pool.emit('/v1/jobs/add', payload, (response) => {
            expect(response).to.deep.include({
              statusCode: 400,
              error: 'Bad Request',
              message:
                '"files[0].type" must be one of [podcast-part, user-input]'
            });
            done();
          });
        });

        it('should fail if file seek is not an object. ERROR CODE 400', (done) => {
          const payload = {
            ...jobPayload,
            files: [
              {
                ...filePodcast,
                seek: false
              }
            ]
          };

          pool.emit('/v1/jobs/add', payload, (response) => {
            expect(response).to.deep.include({
              statusCode: 400,
              error: 'Bad Request',
              message: '"files[0].seek" must be of type object'
            });
            done();
          });
        });

        it('should fail if file seek contains a property other than start and end. ERROR CODE 400', (done) => {
          const payload = {
            ...jobPayload,
            files: [
              {
                ...filePodcast,
                seek: {
                  test: 'integration'
                }
              }
            ]
          };

          pool.emit('/v1/jobs/add', payload, (response) => {
            expect(response).to.deep.include({
              statusCode: 400,
              error: 'Bad Request',
              message: '"files[0].seek.test" is not allowed'
            });
            done();
          });
        });
      });
    });

    describe('Success', () => {
      it('should succeed adding a job', (done) => {
        pool.emit('/v1/jobs/add', jobPayload, (response) => {
          expect(response?.data).to.have.property('location');
          expect(response?.data).to.have.property('storageType');
          expect(response?.data).to.have.property('publicLink');
          expect(transcodingQueue.jobs.length).to.be.equal(1);
          transcodingQueue.removeJob(transcodingQueue.jobs.all[0]);
          done();
        });
      });
    });
  });
});
