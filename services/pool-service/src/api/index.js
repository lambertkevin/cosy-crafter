import JobApi from './JobApi';

export default (socket) => {
  JobApi('job', socket);
};
