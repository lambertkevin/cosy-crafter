import { expect } from 'chai';
import io from 'socket.io-client';
import {
  startAuthService,
  accessTokenExpired,
  accessToken
} from '../utils/authUtils';
import { transcodingQueue } from '../../src/queue';
import init from '../../src/server';

describe('Socket Workers Api tests', () => {
  let server;
  let pid;

  before(async () => {
    const authServiceChild = await startAuthService();
    pid = authServiceChild.pid;
    server = await init();
  });

  after(() => {
    process.kill(pid);
    server.close();
  });

  describe('Server Testing', () => {
    describe('Fails', () => {
      it('should fail to connect to pool as worker without JWT', (done) => {
        io(
          `http://${process.env.POOL_SERVICE_NAME}:${process.env.POOL_SERVICE_PORT}/workers`
        ).on('connect_error', function cb(error) {
          expect(error?.data).to.deep.include({
            name: 'JsonWebTokenError',
            message: 'jwt must be provided'
          });
          this.close();
          done();
        });
      });

      it('should fail to connect to pool as worker with invalid JWT', (done) => {
        io(
          `http://${process.env.POOL_SERVICE_NAME}:${process.env.POOL_SERVICE_PORT}/workers`,
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

      it('should fail to connect to pool as worker with expired JWT', (done) => {
        io(
          `http://${process.env.POOL_SERVICE_NAME}:${process.env.POOL_SERVICE_PORT}/workers`,
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
      it('should successfully connect to pool WS as worker', (done) => {
        io(
          `http://${process.env.POOL_SERVICE_NAME}:${process.env.POOL_SERVICE_PORT}/workers`,
          {
            auth: {
              token: accessToken
            }
          }
        ).on('connect', function cb() {
          expect(this.connected).to.be.equal(true);
          expect(transcodingQueue?.workers?.available?.length).to.be.equal(1);
          this.close();
          done();
        });
      });

      it('should successfully refresh token if worker accessToken is expired and retry', (done) => {
        let token = accessTokenExpired;
        io(
          `http://${process.env.POOL_SERVICE_NAME}:${process.env.POOL_SERVICE_PORT}/workers`,
          {
            auth: (cb) =>
              cb({
                token
              })
          }
        )
          .on('connect', function cb() {
            expect(this.connected).to.be.equal(true);
            expect(transcodingQueue?.workers?.available?.length).to.be.equal(1);
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
});
