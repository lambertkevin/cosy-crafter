import PodcastsApi from './PodcastsApi';

export default [
  { plugin: PodcastsApi, routes: { prefix: '/v1/podcasts' } }
];
