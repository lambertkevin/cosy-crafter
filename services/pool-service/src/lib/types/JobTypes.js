export const JOB_STATUS_WAITING = 'waiting';
export const JOB_STATUS_ONGOING = 'ongoing';
export const JOB_STATUS_DONE = 'done';
export const JOB_STATUS_FAILED = 'failed';

export const JOB_STATES = [
  JOB_STATUS_WAITING,
  JOB_STATUS_ONGOING,
  JOB_STATUS_DONE,
  JOB_STATUS_FAILED
];

export const JOB_PRIORITY_LOW = 0;
export const JOB_PRIORITY_MEDIUM = 100;
export const JOB_PRIORITY_HIGH = 200;
export const JOB_PRIORITY_CRITICAL = 1000;

export const JOB_PRIORITIES = [
  JOB_PRIORITY_LOW,
  JOB_PRIORITY_MEDIUM,
  JOB_PRIORITY_HIGH,
  JOB_PRIORITY_CRITICAL
];

export default {
  JOB_STATUS_WAITING,
  JOB_STATUS_ONGOING,
  JOB_STATUS_DONE,
  JOB_STATUS_FAILED,
  JOB_PRIORITY_LOW,
  JOB_PRIORITY_MEDIUM,
  JOB_PRIORITY_HIGH,
  JOB_PRIORITY_CRITICAL
};
