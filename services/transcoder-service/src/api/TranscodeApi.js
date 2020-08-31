import { forEach } from 'lodash';
import { createTranscodeJob } from '../controllers/TransodeController';

const routes = [
  {
    path: '/join',
    handler: createTranscodeJob
  }
];

export default (prefix, socket) => {
  forEach(routes, (route) => {
    const path = `${prefix}${route.path}`;
    const hander = (data, ack) =>
      route.handler.apply(null, [data, ack, socket]);

    socket.on(path, hander);
  });
};
