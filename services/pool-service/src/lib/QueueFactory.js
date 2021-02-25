import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import { EventEmitter } from 'events';
import stringify from 'fast-safe-stringify';
import { logger } from '../utils/Logger';
import { makeJob } from './JobFactory';
import {
  WORKER_STATUS_AVAILABLE,
  WORKER_STATUS_BUSY
} from './types/WorkerTypes';
import {
  JOB_STATUS_WAITING,
  JOB_STATUS_FAILED,
  JOB_STATUS_ONGOING
} from './types/JobTypes';

const JOB_LIST_SAVE_FILE = path.join(path.resolve('./'), '.job-save.json');

const prioritizeArray = (arr) => _.orderBy(arr, ['priority'], ['desc']);

export const makeQueue = () => {
  const workers = [];
  let jobs = (() => {
    try {
      if (
        !fs.existsSync(JOB_LIST_SAVE_FILE) ||
        process.env.NODE_ENV === 'test'
      ) {
        return [];
      }

      const savedFileContent = fs.readFileSync(JOB_LIST_SAVE_FILE);
      const { jobs: savedJobs } = JSON.parse(savedFileContent);
      return Array.isArray(savedJobs)
        ? prioritizeArray(savedJobs.map((x) => makeJob(null, x)))
        : [];
    } catch (error) {
      logger.debug('Error while getting job list save', error);
      return [];
    }
  })();

  const queue = {
    events: new EventEmitter(),

    get length() {
      return jobs.length;
    },

    get availableWorkers() {
      return workers.filter(
        (worker) => worker.status === WORKER_STATUS_AVAILABLE
      );
    },

    get busyWorkers() {
      return workers.filter((worker) => worker.status === WORKER_STATUS_BUSY);
    },

    get waitingJobs() {
      return jobs.filter(({ status }) => status === JOB_STATUS_WAITING);
    },

    get failedJobs() {
      return jobs.filter(({ status }) => status === JOB_STATUS_FAILED);
    },

    get ongoingJobs() {
      return jobs.filter(({ status }) => status === JOB_STATUS_ONGOING);
    },

    /**
     * Add a job to the queue
     *
     * @param {Object} job
     *
     * @return {void}
     */
    addJob(job) {
      jobs = prioritizeArray([...jobs, job]);
      logger.info('Job added to queue', { job });
      this.events.emit('jobs-updated', { jobs: jobs.length });
    },

    /**
     * Remove a job from the queue
     *
     * @param {Object} job
     *
     * @return {void}
     */
    removeJob(job) {
      _.pull(jobs, job);
      logger.info('Job removed from queue', { job });
      this.events.emit('jobs-updated', { jobs: jobs.length });
    },

    /**
     * Add a worker to the queue
     *
     * @param {Object} worker
     *
     * @return {void}
     */
    addWorker(worker) {
      workers.push(worker);
      logger.info('Worker added to queue', { worker });
      this.events.emit('workers-updated', { workers });
    },

    /**
     * Remove a worker from the queue
     *
     * @param {Object} worker
     *
     * @return {void}
     */
    removeWorker(worker) {
      _.pull(workers, worker);
      logger.info('Worker removed from queue', { worker });
      this.events.emit('workers-updated', { workers });
    },

    /**
     * Launch the next job
     *
     * @return {void}
     */
    async next() {
      if (this.availableWorkers.length && this.waitingJobs.length) {
        const availableWorker = this.availableWorkers[0];
        const job = this.waitingJobs[0];
        const onJobStatusChanged = () => {
          this.events.emit('jobs-updated');
        };
        job.events.on('job-status-changed', onJobStatusChanged);

        try {
          await availableWorker.execute(job);
          job.finish();
          this.removeJob(job);
        } catch {
          const error = job.retry();

          if (error.name !== 'RetryError') {
            this.removeJob(job);
          }
        }

        job.events.off('job-status-changed', onJobStatusChanged);
        process.nextTick(
          _.throttle(
            this.next.bind(this),
            process.env.NODE_ENV === 'development' ? 2000 : 500
          )
        );
      }
    },

    /**
     * Start listening the events linked to jobs & workers updates
     *
     * @return {void}
     */
    registerEvents() {
      this.events.on('jobs-updated', () => {
        console.log('Job List Updated', jobs.length);
        if (process.env.NODE_ENV !== 'test') {
          fs.writeFileSync(
            JOB_LIST_SAVE_FILE,
            stringify({ jobs }, (key, val) => {
              return typeof val === 'function' ? val.toString() : val;
            })
          );
        }

        if (this.availableWorkers.length && this.waitingJobs.length) {
          this.next();
        }
      });

      this.events.on('workers-updated', () => {
        console.log('workers: ', workers.length);
        if (this.availableWorkers.length && this.waitingJobs.length) {
          this.next();
        }
      });
    }
  };

  const freezeProps = ['events'];
  freezeProps.forEach((freezeProp) => {
    Object.defineProperty(queue, freezeProp, {
      writable: false,
      configurable: false
    });
  });

  queue.registerEvents();
  queue.next();

  return queue;
};

export default makeQueue;
