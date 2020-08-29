import ServiceApi from './ServiceApi';
import TokenApi from './TokenApi';

export default [
  { plugin: ServiceApi, routes: { prefix: '/services' } },
  { plugin: TokenApi, routes: { prefix: '/tokens' } }
  //
];
