import PodcastStorageApi from './PodcastStorageApi';
import CraftStorageApi from './CraftStorageApi';

export default [
  {
    plugin: PodcastStorageApi,
    routes: { prefix: '/v1/podcast-parts' }
  },
  {
    plugin: CraftStorageApi,
    routes: { prefix: '/v1/crafts' }
  }
];
