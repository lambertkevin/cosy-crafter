import _ from 'lodash';
import { expect } from 'chai';
import proxyquire from 'proxyquire';
import CustomError from '@cosy/custom-error';

describe('JobApi registering unit tests', () => {
  const { default: JobApiMocked } = proxyquire('../../src/api/JobApi.js', {
    '../controllers/JobController': {
      createTranscodingJob: () => {}
    },
    '../queue': {
      addJob: () => {}
    }
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
      expect(fakeSocket.eventsRegistered.map((x) => _.pick(x, ['path']))).to.deep.have.members([
        { path: 'test/add' }
      ]);
    });

    it('should respond 400 error via ack if validation is incorrect', async () => {
      JobApiMocked('test/', fakeSocket);

      const [addRoute] = fakeSocket.eventsRegistered;
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

      const [addRoute] = fakeSocket.eventsRegistered;
      const error = await addRoute.handler({ name: 'test-name', files: [] });

      expect(error).to.be.an('error').and.to.be.an.instanceOf(CustomError);
      expect(error?.message).to.be.equal('ack is not a function');
      expect(error?.code).to.be.equal(500);
    });
  });
});
