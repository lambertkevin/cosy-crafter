import PodcastApi from './PodcastApi';

export default [
  { plugin: PodcastApi, routes: { prefix: '/v1/podcasts' } }
];
