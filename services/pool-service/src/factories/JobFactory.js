import { v4 as uuid } from 'uuid';
import { EventEmitter } from 'events';
import humanizeDuration from 'humanize-duration';
import {
  JOB_STATUS_WAITING,
  JOB_STATUS_DONE,
  JOB_STATUS_ONGOING,
  JOB_STATUS_FAILED,
  JOB_PRIORITY_MEDIUM
} from '../types/JobTypes';
import { logger } from '../utils/Logger';

export const makeJob = (asyncAction, opts) => {
  let priority = (opts && opts.priority) || JOB_PRIORITY_MEDIUM;
  let progress = (opts && opts.progress) || 0;
  let status =
    opts && opts.status && opts.status !== JOB_STATUS_ONGOING
      ? opts.status
      : JOB_STATUS_WAITING;

  const job = {
    id: (opts && opts.id) || uuid(),
    events: new EventEmitter(),
    addedAt: (opts && opts.addedAt) || Date.now(),
    startedAt: (opts && opts.startedAt) || undefined,
    finishedAt: (opts && opts.finishedAt) || undefined,
    asyncAction:
      // eslint-disable-next-line no-eval
      (opts && opts.asyncAction && eval(`(${opts.asyncAction})`)) ||
      asyncAction,
    retries: (opts && opts.retries) || 0,
    fails: 0,

    get status() {
      return status;
    },

    set status(_status) {
      if (status !== _status) {
        status = _status.toString();
        this.events.emit('job-status-changed', _status);
      }
    },

    get priority() {
      return priority;
    },

    set priority(_priority) {
      if (priority !== _priority) {
        priority = Number(_priority);
        this.events.emit('job-priority-changed', priority);
      }
    },

    get progress() {
      return progress;
    },

    set progress(_progress) {
      if (progress !== _progress) {
        progress = Number(_progress);
        this.events.emit('job-progress-changed', _progress);
      }
    },

    get duration() {
      if (this.startedAt) {
        return this.finishedAt
          ? humanizeDuration(this.finishedAt - this.startedAt)
          : humanizeDuration(Date.now() - this.startedAt);
      }
      return undefined;
    },

    /**
     * Process the action of the job
     *
     * @param {Object} workerApi
     *
     * @return {Promise}
     */
    process(workerApi) {
      this.startedAt = Date.now();
      this.status = JOB_STATUS_ONGOING;

      return this.asyncAction(this, workerApi);
    },

    /**
     * Handle retrying of the job.
     * Will always return an error depending
     * on if it's going to retry or not
     *
     * @return {Error}
     */
    retry() {
      this.finishedAt = Date.now();
      if (this.retries > 0) {
        this.retries -= 1;
        this.fails += 1;
        this.status = JOB_STATUS_WAITING;
        logger.warn('Job failed but will retry', { jobId: job.id });

        const retryError = new Error('Job finally failed');
        retryError.name = 'RetryError';

        return retryError;
      }

      this.status = JOB_STATUS_FAILED;
      logger.error('Job finally failed', { jobId: job.id });
      return new Error('Job finally failed');
    },

    /**
     * Set the job as finished
     *
     * @return {void}
     */
    finish() {
      this.finishedAt = Date.now();
      this.status = JOB_STATUS_DONE;
    },

    /**
     * Set the job as failed
     *
     * @return {void}
     */
    kill() {
      this.finishedAt = Date.now();
      this.status = JOB_STATUS_FAILED;
    }
  };

  const freezeProps = ['id', 'addedAt'];
  freezeProps.forEach((freezeProp) => {
    Object.defineProperty(job, freezeProp, {
      writable: false,
      configurable: false
    });
  });

  return job;
};

export default makeJob;
