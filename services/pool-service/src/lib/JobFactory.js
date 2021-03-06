import joi from 'joi';
import _ from 'lodash';
import { v4 as uuid } from 'uuid';
import { logger } from '@cosy/logger';
import { EventEmitter } from 'events';
import humanizeDuration from 'humanize-duration';
import CustomError from '@cosy/custom-error';
import {
  JOB_STATES,
  JOB_STATUS_WAITING,
  JOB_STATUS_DONE,
  JOB_STATUS_ONGOING,
  JOB_STATUS_FAILED,
  JOB_PRIORITY_MEDIUM
} from './types/JobTypes';

const argsSchema = joi.object({
  asyncAction: joi.function().allow(null).required(),
  opts: joi
    .object({
      id: joi.string().guid().optional(),
      priority: joi.number().strict().optional(),
      progress: joi.number().strict().positive().allow(0).max(100).optional(),
      status: joi
        .string()
        .valid(...JOB_STATES)
        .optional(),
      addedAt: joi.date().timestamp().optional(),
      startedAt: joi.date().timestamp().optional(),
      finishedAt: joi.date().timestamp().optional(),
      retries: joi.number().strict().positive().allow(0).optional(),
      fails: joi.number().strict().positive().allow(0).optional(),
      asyncAction: joi.string().optional()
    })
    .optional()
    .when('asyncAction', {
      is: null,
      then: joi
        //
        .object({ asyncAction: joi.disallow(null).required() })
        .required()
    })
});

/**
 * Job factory
 *
 * @param {Function} asyncAction
 * @param {?Object} opts
 * @param {?Number} opts.priority
 * @param {?Number} opts.progress
 * @param {?String} opts.status
 * @param {?Number} opts.addedAt [timestamp]
 * @param {?Number} opts.startedAt [timestamp]
 * @param {?Number} opts.finishedAt [timestamp]
 * @param {?Number} opts.retries
 * @param {?String} opts.asyncAction [stringified function to save it as txt in .job-save.json]
 *
 * @return {Object}
 */
export const makeJob = (asyncAction, opts) => {
  const { error } = argsSchema.validate({ asyncAction, opts });

  if (error) {
    throw new CustomError(`Arguments are invalid: ${error?.message}`, error?.name, 406, error);
  }

  let priority = opts?.priority ?? JOB_PRIORITY_MEDIUM;
  let progress = opts?.progress || 0;
  let status =
    opts && opts.status && opts.status !== JOB_STATUS_ONGOING ? opts.status : JOB_STATUS_WAITING;

  const job = {
    id: opts?.id || uuid(),
    events: new EventEmitter(),
    addedAt: opts?.addedAt || Date.now(),
    startedAt: opts?.startedAt || undefined,
    finishedAt: opts?.finishedAt || undefined,
    asyncAction:
      (!asyncAction &&
        opts?.asyncAction &&
        // eslint-disable-next-line no-eval
        typeof eval(`(${opts.asyncAction})`) === 'function' &&
        // eslint-disable-next-line no-eval
        eval(`(${opts.asyncAction})`)) ||
      asyncAction,
    retries: opts?.retries || 0,
    fails: 0,

    /**
     * Getter for status attribute
     *
     * @return {String}
     */
    get status() {
      return status;
    },

    /**
     * Setter for status attribute
     *
     * @param {String} _status
     */
    set status(_status) {
      if (status !== _status) {
        const { error: statusError } = joi
          .string()
          .valid(...JOB_STATES)
          .validate(_status);

        if (statusError) {
          throw new CustomError(`Unknown status: ${statusError.message}`, 'StatusUnknownError');
        }

        status = _status;
        this.events.emit('job-status-changed', _status);
      }
    },

    /**
     * Getter for priority attribute
     *
     * @return {Number}
     */
    get priority() {
      return priority;
    },

    /**
     * Setter for priority attribute
     *
     * @param {Number} _priority
     */
    set priority(_priority) {
      if (priority !== _priority) {
        const { error: priorityError } = joi.number().strict().validate(_priority);

        if (priorityError) {
          throw new CustomError(
            `Invalid priority: ${priorityError.message}`,
            'PriorityInvalidError'
          );
        }

        priority = _priority;
        this.events.emit('job-priority-changed', priority);
      }
    },

    /**
     * Getter for progress attribute
     *
     * @return {Number}
     */
    get progress() {
      return progress;
    },

    /**
     * Setter for progress attribute
     *
     * @param {Number} _progress
     */
    set progress(_progress) {
      if (progress !== _progress) {
        const { error: progressError } = joi
          .number()
          .strict()
          .positive()
          .allow(0)
          .max(100)
          .validate(_progress);

        if (progressError) {
          throw new CustomError(
            `Invalid progress: ${progressError.message}`,
            'ProgressInvalidError'
          );
        }

        progress = _progress;
        this.events.emit('job-progress-changed', _progress);
      }
    },

    /**
     * Getter for duration attribute
     * Will be humanized
     *
     * @return {String}
     */
    get duration() {
      if (this.startedAt) {
        return this.finishedAt
          ? `${this.status === JOB_STATUS_FAILED ? 'Failed after ' : ''}${humanizeDuration(
              this.finishedAt - this.startedAt
            )}`
          : humanizeDuration(Date.now() - this.startedAt);
      }
      return undefined;
    },

    /**
     * Start the action of the job
     *
     * @param {Object} workerApi
     *
     * @return {Promise}
     */
    start(workerApi) {
      this.startedAt = Date.now();
      this.status = JOB_STATUS_ONGOING;

      const action = this.asyncAction(this, workerApi);

      if (!(action instanceof Promise)) {
        const asyncActionNotAsync = new CustomError(
          'asyncAction is not a Promise',
          'AsyncActionError'
        );

        return Promise.reject(asyncActionNotAsync);
      }

      return action
        .then((res) => {
          this.finishedAt = Date.now();
          this.status = JOB_STATUS_DONE;

          return res;
        })
        .catch((rejection) => {
          this.finishedAt = Date.now();
          this.status = JOB_STATUS_FAILED;

          const err = this.onFail(rejection);

          throw err;
        });
    },

    /**
     * Handle retrying of the job.
     * Will always return an error depending
     * on whether it's going to retry or not
     *
     * @param {Error} rejection
     *
     * @return {Error}
     */
    onFail(rejection) {
      this.fails += 1;

      if (this.retries > 0) {
        this.retries -= 1;
        this.status = JOB_STATUS_WAITING;
        logger.warn('Job failed but will retry', {
          jobId: job.id,
          error: rejection
        });

        const jobRetryError = new CustomError('Job failed but will retry', 'JobRetryError');
        return jobRetryError;
      }

      this.status = JOB_STATUS_FAILED;
      logger.error('Job finally failed', { jobId: job.id, error: rejection });

      const jobFailedError = new CustomError('Job finally failed', 'JobFailedError');
      return jobFailedError;
    },

    /**
     * Get a safe for stringification
     * version of the job
     *
     * @return {Object}
     */
    get safe() {
      return _.pick(this, [
        'id',
        'priority',
        'progress',
        'status',
        'addedAt',
        'startedAt',
        'finishedAt',
        'retries',
        'fails',
        'asyncAction'
      ]);
    }
  };

  const freezeProps = ['id', 'addedAt', 'asyncAction', 'process', 'retry', 'finish', 'kill'];
  freezeProps.forEach((freezeProp) => {
    Object.defineProperty(job, freezeProp, {
      writable: false,
      configurable: false
    });
  });

  return job;
};

export default makeJob;
