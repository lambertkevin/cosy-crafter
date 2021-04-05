import io from 'socket.io';
import boom from '@hapi/boom';
import chaiHttp from 'chai-http';
import chai, { expect } from 'chai';
import jsonServer from 'json-server';
import ioClient from 'socket.io-client';
import init from '../../src/server';

chai.use(chaiHttp);

describe('API Gateway integration tests', () => {
  let server;
  let request;
  before(async () => {
    server = await init();
    request = chai.request(server).keepOpen();
  });

  after(() => {
    server.close();
  });

  describe('Podcast Service', () => {
    let podcastServiceMock;
    before(() => {
      const mock = jsonServer.create();
      mock.use(jsonServer.defaults());
      mock.get('/anything', (req, res) => res.send({ proxy: true }));
      podcastServiceMock = mock.listen(process.env.PODCAST_SERVICE_PORT);
    });

    after(() => {
      podcastServiceMock.close();
    });

    it('should proxy the podcast service', async () => {
      const { body: response } = await request.get('/podcast/anything');

      expect(response).to.include({
        proxy: true
      });
    });
  });

  describe('Auth Service', () => {
    let authServiceMock;
    before(() => {
      const mock = jsonServer.create();
      mock.use(jsonServer.defaults());
      mock.get('/anything', (req, res) => res.send({ proxy: true }));
      authServiceMock = mock.listen(process.env.AUTH_SERVICE_PORT);
    });

    after(() => {
      authServiceMock.close();
    });

    it('should proxy the auth service', async () => {
      const { body: response } = await request.get('/auth/anything');

      expect(response).to.include({
        proxy: true
      });
    });
  });

  describe('Storage Service', () => {
    let storageServiceMock;
    before(() => {
      const mock = jsonServer.create();
      mock.use(jsonServer.defaults());
      mock.get('/anything', (req, res) => res.send({ proxy: true }));
      storageServiceMock = mock.listen(process.env.STORAGE_SERVICE_PORT);
    });

    after(() => {
      storageServiceMock.close();
    });

    it('should proxy the storage service', async () => {
      const { body: response } = await request.get('/storage/anything');

      expect(response).to.include({
        proxy: true
      });
    });
  });

  describe('Pool Service', () => {
    let poolServiceMock;
    before(() => {
      const mock = jsonServer.create();
      mock.use(jsonServer.defaults());
      mock.get('/anything', (req, res) => res.send({ proxy: true }));
      poolServiceMock = mock.listen(process.env.POOL_SERVICE_PORT);
    });

    after(() => {
      poolServiceMock.close();
    });

    it('should proxy the pool service', async () => {
      const { body: response } = await request.get('/pool/anything');

      expect(response).to.include({
        proxy: true
      });
    });
  });

  describe('Pool WS Service', () => {
    let poolServiceMock;
    before(() => {
      const mock = jsonServer.create();
      mock.use(jsonServer.defaults());
      poolServiceMock = mock.listen(process.env.POOL_SERVICE_PORT);

      const socketServer = io(poolServiceMock);
      socketServer.on('connection', (socketClient) => {
        socketClient.on('ping', (ack) => {
          ack('pong');
        });
      });
    });

    after(() => {
      poolServiceMock.close();
    });

    it('should proxy the pool ws', (done) => {
      const socketClient = ioClient(`http://localhost:${process.env.GATEWAY_SERVICE_PORT}`).on(
        'connect',
        () => {
          socketClient.emit('ping', (res) => {
            expect(res).to.be.equal('pong');
            done();
          });
        }
      );

      setTimeout(() => {
        expect.fail('Event not received');
        done();
      }, 200);
    });
  });

  describe('404', () => {
    it('should return a 404 Boom error output for any other endpoint call', async () => {
      const { body: response } = await request.get('/anything');
      const expectedError = boom.notFound();

      expect(response).to.include(expectedError?.output?.payload);
    });
  });
});
