import PodcastStorageApi from './PodcastStorageApi';

export default [
  {
    plugin: PodcastStorageApi,
    routes: { prefix: '/v1/podcast-parts' }
  }
];
