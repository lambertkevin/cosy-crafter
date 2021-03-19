import joi from 'joi';
import { logger } from '@cosy/logger';
import { EventEmitter } from 'events';
import {
  WORKER_STATES,
  WORKER_STATUS_AVAILABLE,
  WORKER_STATUS_BUSY
} from './types/WorkerTypes';

/**
 * Factory for the WebSocket Worker with Socket.io
 *
 * @param {Socket} socket
 *
 * @return {Object} worker
 */
export const makeSocketWorker = (socket) => {
  const { id } = socket;
  const { handshake } = socket;
  let status = WORKER_STATUS_AVAILABLE;

  const worker = {
    id,
    handshake,
    events: new EventEmitter(),
    currentJob: undefined,

    /**
     * Getter for the worker status
     *
     * @return {String}
     */
    get status() {
      return status;
    },

    /**
     * Setter for the worker status
     *
     * @param {String} _status
     *
     * @return {String|Error}
     */
    set status(_status) {
      if (status !== _status) {
        const { error: statusError } = joi
          .string()
          .valid(...WORKER_STATES)
          .validate(_status);

        if (statusError) {
          throw new Error(`Unkown status: ${statusError.message}`);
        }

        status = _status;
        this.events.emit('worker-status-changed', status);
      }
    },

    /**
     * Execute a job in the worker
     *
     * @param {Object} job
     *
     * @return {Promise}
     */
    execute(job) {
      logger.info('Executing job in worker', {
        job: job.id,
        worker: worker.id
      });

      this.currentJob = job;
      this.status = WORKER_STATUS_BUSY;

      let start;
      try {
        if (!job.start || typeof job.start !== 'function') {
          const jobHasNoStart = new Error('This job has no start function');
          jobHasNoStart.name = 'JobHasNoStart';

          throw jobHasNoStart;
        }

        start = job.start(socket);

        if (!(start instanceof Promise)) {
          const startIsNotPromise = new Error(
            "This job start doesn't return a promise"
          );
          startIsNotPromise.name = 'StartIsNotPromise';

          throw startIsNotPromise;
        }
      } catch (e) {
        return Promise.reject(e);
      }

      return start.finally(() => {
        this.status = WORKER_STATUS_AVAILABLE;
        this.currentJob = undefined;
      });
    },

    /**
     * Send a stop signal to the current job before removing a worker
     *
     * @return {void}
     */
    sendKillEvent() {
      if (this.currentJob) {
        socket.emit(`kill-job-${this.currentJob.id}`);
      }
    }
  };

  const freezeProps = ['id', 'handshake', 'events', 'execute', 'sendKillEvent'];
  freezeProps.forEach((freezeProp) => {
    Object.defineProperty(worker, freezeProp, {
      writable: false,
      configurable: false
    });
  });

  return worker;
};

export default makeSocketWorker;
