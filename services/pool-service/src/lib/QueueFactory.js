import fs from 'fs';
import _ from 'lodash';
import path from 'path';
import { logger } from '@cosy/logger';
import { EventEmitter } from 'events';
import stringify from 'fast-safe-stringify';
import CustomError from '@cosy/custom-error';
import { makeJob } from './JobFactory';
import { WORKER_STATUS_AVAILABLE, WORKER_STATUS_BUSY } from './types/WorkerTypes';
import { JOB_STATUS_WAITING, JOB_STATUS_FAILED, JOB_STATUS_ONGOING } from './types/JobTypes';

const JOB_LIST_SAVE_FILE = path.resolve('./', '.job-save.json');

if (!fs.existsSync(JOB_LIST_SAVE_FILE)) {
  fs.writeFileSync(JOB_LIST_SAVE_FILE, JSON.stringify({}));
}

const prioritizeArray = (arr) => _.orderBy(arr, ['priority'], ['desc']);

/**
 * Factory for the queue
 *
 * @param {Boolean} registerEvents [default = true]
 *
 * @return {Object} queue
 */
export const makeQueue = (registerEvents = true) => {
  const workers = [];
  let jobs = (() => {
    try {
      if (!fs.existsSync(JOB_LIST_SAVE_FILE) || process.env.NODE_ENV === 'test') {
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

    /**
     * Getter for the jobs
     * Jobs will be sorted by types
     *
     * @return {Object}
     */
    get jobs() {
      return {
        get all() {
          return jobs;
        },

        get waiting() {
          return jobs.filter(({ status }) => status === JOB_STATUS_WAITING);
        },

        get failed() {
          return jobs.filter(({ status }) => status === JOB_STATUS_FAILED);
        },

        get ongoing() {
          return jobs.filter(({ status }) => status === JOB_STATUS_ONGOING);
        },

        get length() {
          return jobs.length;
        }
      };
    },

    /**
     * Getter for the workers
     * Workers will be sorted by status
     */
    get workers() {
      return {
        get all() {
          return workers;
        },

        get available() {
          return workers.filter((worker) => worker.status === WORKER_STATUS_AVAILABLE);
        },

        get busy() {
          return workers.filter((worker) => worker.status === WORKER_STATUS_BUSY);
        },

        get length() {
          return workers.length;
        }
      };
    },

    /**
     * Add a job to the queue
     *
     * @param {Object} job
     *
     * @return {Array|Error}
     */
    addJob(job) {
      if (jobs.includes(job)) {
        const duplicatedJobError = new CustomError(
          'This job is already in queue',
          'DuplicatedJobError'
        );
        return duplicatedJobError;
      }

      jobs = prioritizeArray([...jobs, job]);
      logger.info('Job added to queue', { job });
      this.events.emit('jobs-updated', { jobs: jobs.length });

      return jobs;
    },

    /**
     * Remove a job from the queue
     *
     * @param {Object} job
     *
     * @return {Array|Error}
     */
    removeJob(job) {
      if (!jobs.includes(job)) {
        const jobNotFound = new CustomError(
          'This job is not existing in this queue',
          'JobNotFound'
        );
        return jobNotFound;
      }

      _.pull(jobs, job);
      logger.info('Job removed from queue', { job });
      this.events.emit('jobs-updated', { jobs: jobs.length });

      return jobs;
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
     * @return {void|Error}
     */
    async next() {
      if (this.workers.available.length && this.jobs.waiting.length) {
        const worker = this.workers.available[0];
        const job = this.jobs.waiting[0];

        // Let's imagine you feed this queue with jobs not made by the provided factory
        if (!job.events || !(job.events instanceof EventEmitter)) {
          this.removeJob(job);
          const jobHasNoEvents = new CustomError('Job has no event emitter', 'JobHasNoEvents');
          throw jobHasNoEvents;
        }

        // Let's imagine you fed this queue with workers not made by the provided factory
        if (typeof worker?.execute !== 'function') {
          this.removeWorker(worker);
          // Execute next after resolving this Promise
          setTimeout(() => {
            this.next();
          });
          return new CustomError('Worker.execute was not a function', 'WorkerExecuteInvalidError');
        }

        const onJobStatusChanged = () => {
          this.events.emit('jobs-updated');
        };
        job.events.on('job-status-changed', onJobStatusChanged);

        try {
          await worker.execute(job);
          this.removeJob(job);
        } catch (error) {
          logger.error('Queue processing job error', {
            error,
            job,
            worker
          });
          // Lib made errors can be
          // from worker execute (if job/worker not made by provided factories): JobHasNoStart, StartIsNotPromise
          // from job start bubbling to worker execute: JobRetryError, JobFailedError, AsyncActionNotAsync
          switch (error.name) {
            case 'JobHasNoStart':
            case 'StartIsNotPromise':
            case 'JobFailedError':
            case 'AsyncActionNotAsync': {
              this.removeJob(job);
              return error;
            }
            case 'JobRetryError': {
              // Get the job with the maximum priority
              const { priority: jobsMaxPriority } = _.maxBy(jobs, ({ priority }) => priority);
              // Make the retrying job the highest priority of the queue
              // for it to be the next job to be handled
              job.priority = jobsMaxPriority + 1;
              // Sort the jobs again by priority
              prioritizeArray(jobs);
              break;
            }
            default:
              this.removeJob(job);
              return new CustomError('An error has occured', 'UnknownError', null, error);
          }
        } finally {
          job.events.off('job-status-changed', onJobStatusChanged);
          // Wait before launching "next" again
          this.next();
        }
      }
      return undefined;
    },

    /**
     * Start listening the events linked to jobs & workers updates
     *
     * @return {void}
     */
    registerEvents() {
      this.events.on('jobs-updated', () => {
        // istanbul ignore if
        if (process.env.NODE_ENV === 'development') {
          console.log('Job List Updated', this.jobs.length);
        }

        // istanbul ignore if
        if (process.env.NODE_ENV !== 'test') {
          fs.writeFileSync(
            JOB_LIST_SAVE_FILE,
            stringify({ jobs: jobs.map((x) => x.safe) }, (key, val) => {
              return typeof val === 'function' ? val.toString() : val;
            })
          );
        }

        this.next();
      });

      this.events.on('workers-updated', () => {
        // istanbul ignore if
        if (process.env.NODE_ENV === 'development') {
          console.log('workers: ', this.workers.length);
        }

        this.next();
      });
    }
  };

  const freezeProps = [
    'events',
    'addJob',
    'removeJob',
    'addWorker',
    'removeWorker',
    // For test purposes with chai spies,
    // we need to be able to set next again as a different function
    /* istanbul ignore next */
    process.env.NODE_ENV === 'test' ? undefined : 'next',
    'registerEvents'
  ];
  freezeProps.forEach((freezeProp) => {
    Object.defineProperty(queue, freezeProp, {
      writable: false,
      configurable: false
    });
  });

  if (registerEvents) {
    queue.registerEvents();
  }
  queue.next();

  return queue;
};

export default makeQueue;
