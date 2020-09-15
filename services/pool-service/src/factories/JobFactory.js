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

export const makeJob = (asyncAction, opts) => {
  const freezeProps = ['id', 'addedAt'];
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
    get status() {
      return status;
    },
    set status(_status) {
      status = _status.toString();
      this.events.emit('job-status-changed', _status);
    },
    get priority() {
      return priority;
    },
    set priority(_priority) {
      priority = Number(_priority);
      this.events.emit('job-priority-changed', priority);
    },
    get progress() {
      return progress;
    },
    set progress(_progress) {
      progress = Number(_progress);
      this.events.emit('job-progress-changed', _progress);
    },
    get duration() {
      if (this.startedAt) {
        return this.finishedAt
          ? humanizeDuration(this.finishedAt - this.startedAt)
          : humanizeDuration(Date.now() - this.startedAt);
      }
      return undefined;
    },
    process(socket) {
      this.startedAt = Date.now();
      this.status = JOB_STATUS_ONGOING;
      return this.asyncAction(socket, this)
        .then(() => {
          this.finishedAt = Date.now();
          this.status = JOB_STATUS_DONE;
        })
        .catch(() => {
          this.finishedAt = Date.now();
          this.status = JOB_STATUS_FAILED;
        });
    },
    kill() {
      this.finishedAt = Date.now();
      this.status = JOB_STATUS_FAILED;
    }
  };

  freezeProps.forEach((freezeProp) => {
    Object.defineProperty(job, freezeProp, {
      writable: false,
      configurable: false
    });
  });

  job.events.on('job-status-changed', () => {
    console.log('changed in job fac');
  });

  return job;
};

export default makeJob;
