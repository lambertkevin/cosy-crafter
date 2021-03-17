import ServiceApi from './ServiceApi';
import TokenBlacklistApi from './TokenBlacklistApi';

export default [
  { plugin: ServiceApi, routes: { prefix: '/services' } },
  { plugin: TokenBlacklistApi, routes: { prefix: '/tokens' } }
  //
];
