import _ from 'lodash';
import { EventEmitter } from 'events';
import {
  WORKER_STATUS_AVAILABLE,
  WORKER_STATUS_BUSY
} from '../types/WorkerTypes';
import { logger } from '../utils/Logger';

export const makeSocketWorker = (socket) => {
  const freezeProps = ['id', 'handshake'];
  const { id } = socket;
  const { handshake } = socket;
  let status = WORKER_STATUS_AVAILABLE;

  const worker = {
    id,
    handshake,
    events: new EventEmitter(),
    currentJob: undefined,
    get status() {
      return status;
    },
    set status(_status) {
      status = _status;
      this.events.emit('worker-status-changed', status);
    },
    execute(job) {
      logger.info('Executing job in worker', {
        job: job.id,
        worker: worker.id
      });
      this.currentJob = job;
      return new Promise((resolve, reject) => {
        this.status = WORKER_STATUS_BUSY;
        job
          .process(socket)
          .then((res) => {
            resolve(res);
          })
          .catch((error) => {
            logger.error('Error while processing job process in worker', error);
            reject();
          })
          .finally(() => {
            this.status = WORKER_STATUS_AVAILABLE;
            this.currentJob = undefined;
          });
      });
    },
    kill() {
      if (this.currentJob) {
        this.currentJob.kill();
        socket.emit(`kill-job-${this.currentJobjob.id}`);
      }
    }
  };

  freezeProps.forEach((freezeProp) => {
    Object.defineProperty(worker, freezeProp, {
      writable: false,
      configurable: false
    });
  });

  return _.omit(worker, ['currentJob']);
};

export default makeSocketWorker;
