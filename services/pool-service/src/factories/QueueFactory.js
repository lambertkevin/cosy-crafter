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
} from '../types/WorkerTypes';
import {
  JOB_STATUS_WAITING,
  JOB_STATUS_FAILED,
  JOB_STATUS_ONGOING
} from '../types/JobTypes';

const JOB_LIST_SAVE_FILE = path.join(path.resolve('./'), '.job-save.json');

const prioritizeArray = (arr) => _.orderBy(arr, ['priority'], ['desc']);

export const makeQueue = () => {
  const freezeProps = ['events'];
  const workers = [];
  let jobs = (() => {
    try {
      if (!fs.existsSync(JOB_LIST_SAVE_FILE)) {
        return [];
      }

      const savedFileContent = fs.readFileSync(JOB_LIST_SAVE_FILE);
      const { jobs: savedJobs } = JSON.parse(savedFileContent);
      return Array.isArray(savedJobs)
        ? prioritizeArray(savedJobs.map((x) => makeJob(null, x)))
        : [];
    } catch (error) {
      logger.error('Error while getting job list save', error);
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

    addJob(job) {
      jobs = prioritizeArray([...jobs, job]);
      this.events.emit('jobs-updated', { jobs: jobs.length });
    },

    removeJob(job) {
      _.pull(jobs, job);
      this.events.emit('jobs-updated', { jobs: jobs.length });
    },

    addWorker(worker) {
      workers.push(worker);
      this.events.emit('workers-updated', { workers });
    },

    removeWorker(worker) {
      _.pull(this.failedJobsworkers, worker);
      this.events.emit('workers-updated', { workers });
    },

    async next() {
      if (this.availableWorkers.length && this.waitingJobs.length) {
        const availableWorker = this.availableWorkers[0];
        const job = this.waitingJobs[0];
        job.events.on('job-status-changed', () => {
          this.events.emit('jobs-updated');
        });

        try {
          await availableWorker.execute(job);
          console.log('Job finished in queue');
        } catch (e) {
          console.log('Job failed in queue');
        }

        process.nextTick(_.throttle(this.next.bind(this), 1000));
      }
    },

    onJobsUpdated() {
      fs.writeFileSync(
        JOB_LIST_SAVE_FILE,
        stringify({ jobs }, (key, val) => {
          return typeof val === 'function' ? val.toString() : val;
        })
      );

      if (this.availableWorkers.length && this.waitingJobs.length) {
        this.next();
      }
    },

    onWorkersUpdated() {
      console.log('workers: ', workers.length);
      if (this.availableWorkers.length && this.waitingJobs.length) {
        this.next();
      }
    },

    registerEvents() {
      this.events.on('jobs-updated', () => {
        console.log('Job List Updated', jobs.length);
        fs.writeFileSync(
          JOB_LIST_SAVE_FILE,
          stringify({ jobs }, (key, val) => {
            return typeof val === 'function' ? val.toString() : val;
          })
        );

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
