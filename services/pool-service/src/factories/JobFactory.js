import humanizeDuration from 'humanize-duration';
import { v4 as uuid } from 'uuid';
import {
  JOB_STATUS_WAITING,
  JOB_STATUS_DONE,
  JOB_STATUS_ONGOING,
  JOB_STATUS_FAILED,
  JOB_PRIORITY_MEDIUM
} from '../types/JobTypes';

export const makeJob = (asyncAction, opts) => {
  const id = uuid();
  const priority = (opts && opts.priority) || JOB_PRIORITY_MEDIUM;
  let status = JOB_STATUS_WAITING;
  let startTimestamp = 0;
  let finishTimestamp = 0;
  let progress = 0;

  const getId = () => id;
  const getStatus = () => status;
  const getProgress = () => progress;
  const setProgress = (_progress) => {
    progress = _progress;
    console.log('in progress', progress);
  };
  const setStatus = (_status) => {
    status = _status;
    console.log('job status changed', status);
  };

  const getDetails = () => ({
    id: getId(),
    priority,
    status: getStatus(),
    progress: getProgress(),
    duration: humanizeDuration((finishTimestamp || Date.now()) - startTimestamp)
  });

  const process = (socket) => {
    setStatus(JOB_STATUS_ONGOING);
    startTimestamp = Date.now();
    return asyncAction(socket, id, setProgress)
      .then(() => {
        finishTimestamp = Date.now();
        setStatus(JOB_STATUS_DONE);
      })
      .catch(() => {
        finishTimestamp = Date.now();
        setStatus(JOB_STATUS_FAILED);
      });
  };

  return {
    priority,
    getId,
    getStatus,
    getProgress,
    setProgress,
    setStatus,
    getDetails,
    process
  };
};

export default makeJob;
