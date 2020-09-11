import _ from 'lodash';
import { EventEmitter } from 'events';
import { AVAILABLE } from '../types/WorkerTypes';
import { JOB_STATUS_WAITING } from '../types/JobTypes';

export const makeQueue = () => {
  let jobList = [];
  const emitter = new EventEmitter();
  const workers = [];

  const addJob = (job) => {
    jobList.push(job);
    emitter.emit('jobs-updated', { jobs: jobList.length });
  };

  const removeJob = (job) => {
    _.pull(jobList, job);
    emitter.emit('jobs-updated', { jobs: jobList.length });
  };

  const addWorker = (worker) => {
    workers.push(worker);
    emitter.emit('workers-updated', { workers });
  };

  const removeWorker = (worker) => {
    _.pull(workers, worker);
    emitter.emit('workers-updated', { workers });
  };

  const getAvailableSlots = () => {
    return workers.filter((worker) => worker.getStatus() === AVAILABLE).length;
  };

  const getJobs = () => jobList.map((x) => ({ ...x, ...x.getDetails() }));

  const getWaitingJobs = () =>
    getJobs().filter(({ status }) => status === JOB_STATUS_WAITING);

  const getDetails = () => {
    return {
      workers: workers.map((x) => x.getDetails()),
      jobList: _.orderBy(getJobs(), ['priority'], ['desc'])
    };
  };

  const next = async () => {
    const waitingJobs = getWaitingJobs();

    if (getAvailableSlots() && waitingJobs.length) {
      const availableWorker = workers.find(
        (worker) => worker.getStatus() === AVAILABLE
      );
      const job = waitingJobs[0];

      try {
        await availableWorker.execute(job);
        console.log('Job finished in queue');
      } catch (e) {
        console.log('Job failed in queue');
      }

      process.nextTick(() => {
        next();
      });
    }
  };

  emitter.on('jobs-updated', () => {
    jobList = _.sortBy(jobList, ['priority']);
    console.log('Job List Updated', jobList);

    if (getAvailableSlots() && getWaitingJobs().length) {
      next();
    }
  });

  emitter.on('workers-updated', () => {
    console.log('workers: ', workers.length);
    if (getAvailableSlots() && getWaitingJobs().length) {
      next();
    }
  });

  next();

  return {
    next,
    addJob,
    removeJob,
    addWorker,
    removeWorker,
    getAvailableSlots,
    getDetails
  };
};

export default makeQueue;
