import { makeQueue } from './lib/QueueFactory';
import { makeSocketWorker } from './lib/SocketWorkerFactory';

export const transcodingQueue = makeQueue();

export const workerHandler = (socket) => {
  const worker = makeSocketWorker(socket);
  transcodingQueue.addWorker(worker);

  // istanbul ignore if
  if (process.env.NODE_ENV === 'development') {
    console.log('worker added!');
  }

  socket.on('disconnect', () => {
    transcodingQueue.removeWorker(worker);

    // istanbul ignore if
    if (process.env.NODE_ENV === 'development') {
      console.log('worker removed!');
    }
  });
};

export default {
  transcodingQueue,
  workerHandler
};
