import PodcastApi from './PodcastApi';
import PartTypeApi from './PartTypeApi';

export default [
  { plugin: PodcastApi, routes: { prefix: '/v1/podcasts' } },
  { plugin: PartTypeApi, routes: { prefix: '/v1/part-types' } }
];
