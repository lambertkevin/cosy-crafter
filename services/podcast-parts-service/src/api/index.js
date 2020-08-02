import PodcastApi from './PodcastApi';
import PartTypeApi from './PartTypeApi';
import PartApi from './PartApi';

export default [
  { plugin: PodcastApi, routes: { prefix: '/v1/podcasts' } },
  { plugin: PartTypeApi, routes: { prefix: '/v1/part-types' } },
  { plugin: PartApi, routes: { prefix: '/v1/parts' } }
];
