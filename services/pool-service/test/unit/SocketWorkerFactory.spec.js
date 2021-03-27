import CustomError from '@cosy/custom-error';
import { AssertionError, expect } from 'chai';
import { makeSocketWorker } from '../../src/lib/SocketWorkerFactory';
import { WORKER_STATUS_AVAILABLE, WORKER_STATUS_BUSY } from '../../src/lib/types/WorkerTypes';

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
          expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
          expect(e?.name).to.be.equal('StatusUnknownError');
          expect(e.message).to.be.equal('Unknown status: "value" must be one of [available, busy]');
        }
      });

      it('should do nothing if updating to the same status', (done) => {
        const worker = makeSocketWorker(fakeSocket);

        worker.events.on('worker-status-changed', () => {
          expect.fail();
        });

        worker.status = WORKER_STATUS_AVAILABLE;

        setTimeout(() => {
          done();
        }, 50);
      });

      it('should not send a kill event if it has no currentJob', () => {
        const fakeSockerWithKill = {
          ...fakeSocket,
          emittedEvent: undefined,
          emit(eventName) {
            this.emittedEvent = eventName;
          }
        };
        const worker = makeSocketWorker(fakeSockerWithKill);

        worker.sendKillEvent();

        expect(fakeSockerWithKill.emittedEvent).to.be.equal(undefined);
      });
    });

    describe('Success', () => {
      it('should succeed updating status', () => {
        const worker = makeSocketWorker(fakeSocket);
        worker.status = WORKER_STATUS_BUSY;

        expect(worker.status).to.be.equal(WORKER_STATUS_BUSY);
      });

      it('should send a kill event to socket', () => {
        const fakeSockerWithKill = {
          ...fakeSocket,
          emittedEvent: undefined,
          emit(eventName) {
            this.emittedEvent = eventName;
          }
        };
        const worker = makeSocketWorker(fakeSockerWithKill);
        worker.currentJob = { id: 'id-of-the-current-job' };

        worker.sendKillEvent();

        expect(fakeSockerWithKill.emittedEvent).to.be.equal('kill-job-id-of-the-current-job');
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

          expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
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

          expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
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
