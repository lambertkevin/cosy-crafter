import { AssertionError, expect } from 'chai';
import { makeSocketWorker } from '../../src/lib/SocketWorkerFactory';
import {
  WORKER_STATUS_AVAILABLE,
  WORKER_STATUS_BUSY
} from '../../src/lib/types/WorkerTypes';

const fakeSocket = {
  id: '123',
  handshake: {}
};

describe('Socket Worker Unit Test', () => {
  describe('Methods', () => {
    describe('Fails', () => {
      it('should fail updating status to an unknown status', () => {
        try {
          const worker = makeSocketWorker(fakeSocket);
          worker.status = 'unknown state';
          expect(worker.status).to.throw();
        } catch (e) {
          expect(e).to.be.an('error');
          expect(e.message).to.be.equal(
            'Unkown status: "value" must be one of [available, busy]'
          );
        }
      });
    });

    describe('Success', () => {
      it('should succeed updating status', () => {
        const worker = makeSocketWorker(fakeSocket);
        worker.status = WORKER_STATUS_BUSY;

        expect(worker.status).to.be.equal(WORKER_STATUS_BUSY);
      });
    });
  });

  describe('Execution', () => {
    describe('Fails', () => {
      it('should fail executing a job without start function', async () => {
        const fakeJob = {};
        const worker = makeSocketWorker(fakeSocket);

        try {
          await worker.execute(fakeJob);
          expect.fail('Promise should have failed');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('JobHasNoStart');
        }
      });

      it('should fail executing a job with a start function not returning a Promise', async () => {
        const fakeJob = { start: () => {} };
        const worker = makeSocketWorker(fakeSocket);

        try {
          await worker.execute(fakeJob);
          expect.fail('Promise should have failed');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('StartIsNotPromise');
        }
      });
    });

    describe('Success', () => {
      it('should succeed executing a job', () => {
        const fakeJob = {
          start: () => new Promise((resolve) => setTimeout(resolve, 50))
        };
        const worker = makeSocketWorker(fakeSocket);

        const execution = worker.execute(fakeJob);
        expect(worker.status).to.be.equal(WORKER_STATUS_BUSY);

        return execution.then(() => {
          expect(worker.status).to.be.equal(WORKER_STATUS_AVAILABLE);
        });
      });
    });
  });
});
