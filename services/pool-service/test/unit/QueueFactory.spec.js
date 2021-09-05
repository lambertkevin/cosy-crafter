import fs from 'fs';
import _ from 'lodash';
import path from 'path';
import spies from 'chai-spies';
import subset from 'chai-subset';
import proxyquire from 'proxyquire';
import { EventEmitter } from 'events';
import stringify from 'fast-safe-stringify';
import CustomError from '@cosy/custom-error';
import chai, { AssertionError, expect } from 'chai';
import { makeJob } from '../../src/lib/JobFactory';
import { makeQueue } from '../../src/lib/QueueFactory';
import { makeSocketWorker } from '../../src/lib/SocketWorkerFactory';
import { WORKER_STATUS_AVAILABLE, WORKER_STATUS_BUSY } from '../../src/lib/types/WorkerTypes';
import {
  JOB_STATUS_DONE,
  JOB_STATUS_FAILED,
  JOB_STATUS_ONGOING,
  JOB_STATUS_WAITING
} from '../../src/lib/types/JobTypes';

chai.use(spies);
chai.use(subset);

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

describe('Queue Unit Test', () => {
  describe('Init', () => {
    const JOB_LIST_SAVE_FILE = path.resolve('./', '.job-save.json');
    const JOB_LIST_SAVE_FILE_BAK = path.resolve('./', '.job-save.json.bak');

    before(() => {
      if (fs.existsSync(JOB_LIST_SAVE_FILE)) {
        fs.renameSync(JOB_LIST_SAVE_FILE, JOB_LIST_SAVE_FILE_BAK);
      }
    });

    after(() => {
      if (fs.existsSync(JOB_LIST_SAVE_FILE_BAK)) {
        fs.renameSync(JOB_LIST_SAVE_FILE_BAK, JOB_LIST_SAVE_FILE);
      }
    });

    it("should create a job list save file if it doesn't exist", () => {
      proxyquire.noPreserveCache().load('../../src/lib/QueueFactory.js', {});
      expect(fs.existsSync(JOB_LIST_SAVE_FILE)).to.be.equal(true);
    });
  });

  describe('Job Methods', () => {
    describe('Fails', () => {
      it('should fail to remove a job that is not in the queue', () => {
        const queue = makeQueue();
        const removal = queue.removeJob({});
        expect(removal).to.be.an('error').and.to.be.an.instanceOf(CustomError);
        expect(removal.name).to.be.equal('JobNotFound');
        expect(removal.message).to.be.equal('This job is not existing in this queue');
      });

      it('should fail adding a duplicated job', () => {
        const queue = makeQueue();
        const job = makeJob(successAsyncAction);

        queue.addJob(job);
        const push = queue.addJob(job);

        expect(push).to.be.an('error').and.to.be.an.instanceOf(CustomError);
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
          await queue.next();
          expect.fail('Promise should have failed');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
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

        return queue.next().then((res) => {
          expect(res).to.be.an('error').and.to.be.an.instanceOf(CustomError);
          expect(res.name).to.be.equal('JobHasNoStart');
        });
      });

      it('should fail executing a job that has no start function', async () => {
        const fakeWorker = { execute: 123, status: WORKER_STATUS_AVAILABLE };
        const fakeJob = {
          events: new EventEmitter(),
          status: JOB_STATUS_WAITING
        };
        const queue = makeQueue(false);

        queue.addWorker(fakeWorker);
        queue.addJob(fakeJob);

        return queue.next().then((res) => {
          expect(res).to.be.an('error').and.to.be.an.instanceOf(CustomError);
          expect(res.name).to.be.equal('WorkerExecuteInvalidError');
        });
      });

      it('should fail executing if worker execute is not a function', async () => {
        const fakeWorker = {
          execute: () => Promise.reject(new Error()),
          status: WORKER_STATUS_AVAILABLE
        };
        const fakeJob = {
          events: new EventEmitter(),
          status: JOB_STATUS_WAITING
        };
        const queue = makeQueue(false);

        queue.addWorker(fakeWorker);
        queue.addJob(fakeJob);

        return queue.next().then((res) => {
          expect(res).to.be.an('error').and.to.be.an.instanceOf(CustomError);
          expect(res.name).to.be.equal('UnknownError');
        });
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

        return queue.next().then((res) => {
          expect(res).to.be.an('error').and.to.be.an.instanceOf(CustomError);
          expect(res.name).to.be.equal('StartIsNotPromise');
        });
      });

      it('should fail executing a failing job', async () => {
        const job = makeJob(failAsyncAction);
        const fakeWorker = makeSocketWorker({ id: null, handshake: null });
        const queue = makeQueue(false);

        queue.addWorker(fakeWorker);
        queue.addJob(job);

        return queue.next().then((res) => {
          expect(res).to.be.an('error').and.to.be.an.instanceOf(CustomError);
          expect(res.name).to.be.equal('JobFailedError');
        });
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

      it('should succeed getting jobs in different states', () => {
        const job1 = makeJob(successAsyncAction);
        const job2 = makeJob(successAsyncAction, { status: JOB_STATUS_FAILED });
        const job3 = makeJob(successAsyncAction, { status: JOB_STATUS_WAITING });
        const job4 = makeJob(successAsyncAction, { status: JOB_STATUS_DONE });
        // job cannot be created with ongoing status
        job1.status = JOB_STATUS_ONGOING;

        const queue = makeQueue();
        queue.next = () => {};

        queue.addJob(job1);
        queue.addJob(job2);
        queue.addJob(job3);
        queue.addJob(job4);

        expect(queue.jobs.all).to.containSubset([job1, job1, job3, job4]);
        expect(queue.jobs.length).to.be.equal(4);
        expect(queue.jobs.waiting).to.include(job3);
        expect(queue.jobs.failed).to.include(job2);
        expect(queue.jobs.ongoing).to.include(job1);
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
          .map(() => makeJob(successAsyncAction, { priority: _.random(0, 1000) }));

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

      it('should succeed adding a worker to queue', () => {
        const worker1 = makeSocketWorker({
          id: '123',
          handshake: null,
          status: WORKER_STATUS_AVAILABLE
        });
        const worker2 = makeSocketWorker({
          id: '123',
          handshake: null
        });

        // worker cannot be create with status busy
        worker2.status = WORKER_STATUS_BUSY;

        const queue = makeQueue();
        queue.next = () => {};

        queue.addWorker(worker1);
        queue.addWorker(worker2);

        expect(queue.workers.all).to.containSubset([worker1, worker2]);
        expect(queue.workers.length).to.be.equal(2);
        expect(queue.workers.available).to.include(worker1);
        expect(queue.workers.busy).to.include(worker2);
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

      it('should have a list of job at start from a JSON save file', () => {
        const jobs = [
          makeJob(successAsyncAction),
          makeJob(successAsyncAction),
          makeJob(successAsyncAction),
          makeJob(successAsyncAction),
          makeJob(successAsyncAction)
        ];

        const { default: makeMockedQueue } = proxyquire('../../src/lib/QueueFactory.js', {
          fs: {
            existSync: () => true,
            readFileSync: () =>
              stringify({ jobs: jobs.map((x) => x.safe) }, (key, val) => {
                return typeof val === 'function' ? val.toString() : val;
              })
          }
        });

        const oldEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        const queue = makeMockedQueue();
        const idsInQueue = queue.jobs.all.map(({ id }) => id);
        expect(idsInQueue).to.have.members(jobs.map(({ id }) => id));

        process.env.NODE_ENV = oldEnv;
      });

      it('should default to empty job list if jobs is not an Array', () => {
        const jobs = [makeJob(successAsyncAction), makeJob(successAsyncAction)];

        const { default: makeMockedQueue } = proxyquire('../../src/lib/QueueFactory.js', {
          fs: {
            existSync: () => true,
            readFileSync: () =>
              stringify({ jobsWithOtherName: jobs.map((x) => x.safe) }, (key, val) => {
                return typeof val === 'function' ? val.toString() : val;
              })
          }
        });

        const oldEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        const queue = makeMockedQueue();
        expect(queue.jobs.length).to.be.equal(0);

        process.env.NODE_ENV = oldEnv;
      });

      it('should default to empty job list if any error', () => {
        const { default: makeMockedQueue } = proxyquire('../../src/lib/QueueFactory.js', {
          fs: {
            existSync: () => true,
            readFileSync: () => {
              throw new Error();
            }
          }
        });

        const oldEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        const queue = makeMockedQueue();
        expect(queue.jobs.length).to.be.equal(0);

        process.env.NODE_ENV = oldEnv;
      });
    });
  });
});
