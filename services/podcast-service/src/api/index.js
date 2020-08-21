import PodcastApi from './PodcastApi';
import SectionApi from './SectionApi';
import PartApi from './PartApi';

export default [
  { plugin: PodcastApi, routes: { prefix: '/v1/podcasts' } },
  { plugin: SectionApi, routes: { prefix: '/v1/sections' } },
  { plugin: PartApi, routes: { prefix: '/v1/parts' } }
];
