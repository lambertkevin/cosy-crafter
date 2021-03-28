import _ from 'lodash';
import chai, { expect } from 'chai';
import proxyquire from 'proxyquire';
import chaiSubset from 'chai-subset';
import CustomError from '@cosy/custom-error';

chai.use(chaiSubset);

describe('JobApi registering unit tests', () => {
  const { default: JobApiMocked } = proxyquire('../../src/api/JobApi.js', {
    '../controllers/JobController': {
      createTranscodingJob: () => {}
    },
    '../queue': {
      addJob: () => {}
    }
  });

  describe('Ping route', () => {
    let fakeSocket;
    beforeEach(() => {
      fakeSocket = {
        eventsRegistered: [],
        on(path, handler) {
          this.eventsRegistered.push({ path, handler });
        }
      };
    });

    it('should have a ping route', () => {
      JobApiMocked('test/', fakeSocket);
      expect(fakeSocket.eventsRegistered.map((x) => _.pick(x, ['path']))).to.containSubset([
        { path: 'test/ping' }
      ]);
    });

    it('should have a ping route', async () => {
      JobApiMocked('test/', fakeSocket);

      const pingRoute = fakeSocket.eventsRegistered.find((x) => x.path === 'test/ping');
      const ack = (payload) => payload;
      const response = await pingRoute.handler({}, ack);

      expect(response).to.be.equal('pong');
    });
  });

  describe('Add route', () => {
    let fakeSocket;
    beforeEach(() => {
      fakeSocket = {
        eventsRegistered: [],
        on(path, handler) {
          this.eventsRegistered.push({ path, handler });
        }
      };
    });

    it('should have a add route', () => {
      JobApiMocked('test/', fakeSocket);
      expect(fakeSocket.eventsRegistered.map((x) => _.pick(x, ['path']))).to.containSubset([
        { path: 'test/add' }
      ]);
    });

    it('should respond 400 error via ack if validation is incorrect', async () => {
      JobApiMocked('test/', fakeSocket);

      const addRoute = fakeSocket.eventsRegistered.find((x) => x.path === 'test/add');
      const ack = (payload) => payload;
      const error = await addRoute.handler({}, ack);

      expect(error).to.deep.include({
        statusCode: 400,
        error: 'Bad Request',
        message: '"name" is required'
      });
    });

    it('should respond 500 error if ack is not a function', async () => {
      JobApiMocked('test/', fakeSocket);

      const addRoute = fakeSocket.eventsRegistered.find((x) => x.path === 'test/add');
      const error = await addRoute.handler({ name: 'test-name', files: [] });

      expect(error).to.be.an('error').and.to.be.an.instanceOf(CustomError);
      expect(error?.message).to.be.equal('ack is not a function');
      expect(error?.code).to.be.equal(500);
    });
  });
});
