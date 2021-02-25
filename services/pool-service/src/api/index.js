import JobApi from './JobApi';

export default (socket) => {
  JobApi('/v1/jobs', socket);
};
