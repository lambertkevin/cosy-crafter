import _ from 'lodash';
import spies from 'chai-spies';
import chai, { expect } from 'chai';
import { EventEmitter } from 'events';
import { makeJob } from '../../src/lib/JobFactory';
import { makeQueue } from '../../src/lib/QueueFactory';
import { makeSocketWorker } from '../../src/lib/SocketWorkerFactory';
import {
  JOB_STATUS_FAILED,
  JOB_STATUS_ONGOING,
  JOB_STATUS_WAITING
} from '../../src/lib/types/JobTypes';

chai.use(spies);

const successAsyncAction = () =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 5);
  });
const failAsyncAction = () =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      reject();
    }, 5);
  });

let flag = false;
const failOnceAsyncAction = () =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!flag) {
        reject();
        flag = true;
      } else {
        resolve();
      }
    }, 5);
  });

describe('Queue Unit Test', () => {
  describe('Job Methods', () => {
    describe('Fails', () => {
      it('should fail to remove a job that is not in the queue', () => {
        const queue = makeQueue();
        const removal = queue.removeJob({});
        expect(removal).to.be.an('error');
        expect(removal.name).to.be.equal('JobNotFound');
        expect(removal.message).to.be.equal(
          'This job is not existing in this queue'
        );
      });

      it('should fail adding a duplicated job', () => {
        const queue = makeQueue();
        const job = makeJob(successAsyncAction);

        queue.addJob(job);
        const push = queue.addJob(job);

        expect(push).to.be.an('error');
        expect(push.name).to.be.equal('DuplicatedJobError');
        expect(push.message).to.be.equal('This job is already in queue');
      });

      it('should fail executing a job that has no event emitter', async () => {
        const fakeWorker = makeSocketWorker({ id: null, handshake: null });
        const fakeJob = {
          status: JOB_STATUS_WAITING
        };
        const queue = makeQueue(false);

        queue.addWorker(fakeWorker);
        queue.addJob(fakeJob);

        try {
          const next = await queue.next();
          expect(next).to.throw();
        } catch (e) {
          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('JobHasNoEvents');
        }
      });

      it('should fail executing a job that has no start function', async () => {
        const fakeWorker = makeSocketWorker({ id: null, handshake: null });
        const fakeJob = {
          events: new EventEmitter(),
          status: JOB_STATUS_WAITING
        };
        const queue = makeQueue(false);

        queue.addWorker(fakeWorker);
        queue.addJob(fakeJob);

        try {
          const next = await queue.next();
          expect(next).to.throw();
        } catch (e) {
          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('JobHasNoStart');
        }
      });

      it('should fail executing a job that start function is not a promise', async () => {
        const fakeWorker = makeSocketWorker({ id: null, handshake: null });
        const fakeJob = {
          events: new EventEmitter(),
          status: JOB_STATUS_WAITING,
          start: () => {}
        };
        const queue = makeQueue(false);

        queue.addWorker(fakeWorker);
        queue.addJob(fakeJob);

        try {
          const next = await queue.next();
          expect(next).to.throw();
        } catch (e) {
          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('StartIsNotPromise');
        }
      });

      it('should fail executing a failing job', async () => {
        const job = makeJob(failAsyncAction);
        const fakeWorker = makeSocketWorker({ id: null, handshake: null });
        const queue = makeQueue(false);

        queue.addWorker(fakeWorker);
        queue.addJob(job);

        try {
          const next = await queue.next();
          expect(next).to.throw();
        } catch (e) {
          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('JobFailedError');
        }
      });
    });

    describe('Success', () => {
      it('should succeed adding a job to queue', () => {
        const job = makeJob(successAsyncAction, {
          priority: 1
        });
        const queue = makeQueue();

        queue.addJob(job);

        expect(queue.jobs.all).to.include(job);
      });

      it('should succeed adding a job to queue and emit an event', (done) => {
        const job = makeJob(successAsyncAction, {
          priority: 1
        });
        const queue = makeQueue();

        queue.events.on('jobs-updated', () => {
          expect(queue.jobs.all).to.include(job);
          done();
        });

        queue.addJob(job);
      });

      it('should succeed adding a job to queue and find it in the job status filter', () => {
        const job = makeJob(successAsyncAction, {
          priority: 1,
          status: JOB_STATUS_FAILED
        });
        const queue = makeQueue();

        queue.addJob(job);

        expect(queue.jobs.failed).to.include(job);
      });

      it('should succeed sorting jobs by priority at push', () => {
        const jobs = new Array(100)
          .fill(0)
          .map(() =>
            makeJob(successAsyncAction, { priority: _.random(0, 1000) })
          );

        const queue = makeQueue();

        jobs.forEach((job) => {
          queue.addJob(job);
        });

        queue.jobs.all.forEach((job, i) => {
          const nextJob = queue.jobs.all[i + 1];
          if (nextJob) {
            expect(job.priority).to.be.at.least(nextJob.priority);
          }
        });
      });

      it('should succeed removing a job from queue', () => {
        const job = makeJob(successAsyncAction, {
          priority: 1
        });
        const queue = makeQueue();
        queue.addJob(job);
        expect(queue.jobs.all).to.include(job);
        queue.removeJob(job);
        expect(queue.jobs.all).to.not.include(job);
      });

      it('should succeed removing a job from queue and emit an event', (done) => {
        const job = makeJob(successAsyncAction, {
          priority: 1
        });
        const queue = makeQueue();
        queue.addJob(job);
        expect(queue.jobs.all).to.include(job);

        queue.events.on('jobs-updated', () => {
          expect(queue.jobs.all).to.not.include(job);
          done();
        });

        queue.removeJob(job);
      });

      it('should trigger the next method on jobs-updated event', () => {
        const queue = makeQueue();
        const spy = chai.spy.on(queue, 'next');
        queue.events.emit('jobs-updated');
        expect(spy).to.have.been.called();
      });

      it('should trigger the next method on workers-updated event', () => {
        const queue = makeQueue();
        const spy = chai.spy.on(queue, 'next');
        queue.events.emit('workers-updated');
        expect(spy).to.have.been.called();
      });

      it('should succeed adding a worker to queue', () => {
        const worker = makeSocketWorker({ id: '123', handshake: null });
        const queue = makeQueue();

        queue.addWorker(worker);

        expect(queue.workers.all).to.include(worker);
      });

      it('should succeed removing a worker to queue', () => {
        const worker = makeSocketWorker({ id: '123', handshake: null });
        const queue = makeQueue();

        queue.addWorker(worker);
        expect(queue.workers.all).to.include(worker);

        queue.removeWorker(worker);
        expect(queue.workers.all).to.not.include(worker);
      });

      it('should execute a job that need to retry with a maximum priority', (done) => {
        const job = makeJob(failAsyncAction, {
          priority: 0,
          retries: 1
        });
        const job2 = makeJob(successAsyncAction, {
          priority: 0
        });
        const worker = makeSocketWorker({ id: null, handshake: null });
        const queue = makeQueue(false);

        queue.addWorker(worker);
        queue.addJob(job);
        queue.addJob(job2);

        const next = queue.next();
        expect(job.priority).to.be.equal(0);
        expect(job.status).to.be.equal(JOB_STATUS_ONGOING);

        next.then(() => {
          // Once the first next is done and job has failed
          expect(job.fails).to.be.equal(1);
          // Priority increased by 1
          expect(job.priority).to.be.equal(1);
          // Job has been set to waiting again
          expect(job2.status).to.be.equal(JOB_STATUS_WAITING);
          // Job has been put on top of the queue
          expect(queue.jobs.all[0]).to.be.equal(job);

          // Then on the next "next"
          queue.next();
          // Before the end of next promise
          // Job status should be ongoing again
          expect(job.status).to.be.equal(JOB_STATUS_ONGOING);

          done();
        });
      });
    });
  });
});
