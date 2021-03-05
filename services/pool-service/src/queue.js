import { makeQueue } from './lib/QueueFactory';
import { makeSocketWorker } from './lib/SocketWorkerFactory';

export const transcodingQueue = makeQueue();

export const workerHandler = (socket) => {
  const worker = makeSocketWorker(socket);
  transcodingQueue.addWorker(worker);
  console.log('worker added!');

  socket.on('disconnect', async () => {
    transcodingQueue.removeWorker(worker);
    console.log('worker removed!');
  });
};

export default {
  transcodingQueue,
  workerHandler
};
