import { AVAILABLE, BUSY } from '../types/WorkerTypes';

export const makeWorker = (socket) => {
  const { id } = socket;
  const { handshake } = socket;
  let status = AVAILABLE;

  const setStatus = (_status) => {
    status = _status;
    console.log('worker status changed', status);
  };
  const getStatus = () => status;

  const getDetails = () => ({
    id,
    handshake,
    status: getStatus()
  });

  const execute = (job) =>
    new Promise((resolve, reject) => {
      setStatus(BUSY);
      job
        .process(socket)
        .then((res) => resolve(res))
        .catch((err) => {
          console.log('err while execute process', err);
          reject();
        })
        .finally(() => {
          setStatus(AVAILABLE);
        });
    });

  return {
    id,
    handshake,
    execute,
    getStatus,
    getDetails
  };
};

export default makeWorker;
