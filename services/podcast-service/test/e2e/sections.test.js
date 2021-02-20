import { expect } from 'chai';
import { startAuthService } from '../utils/authUtils';
import init from '../../src/server';

describe('Sections API tests', () => {
  let server;
  let pid;

  before(async () => {
    const authServiceChild = await startAuthService();
    pid = authServiceChild.pid;
    server = await init();
  });

  after(() => {
    process.kill(pid);
  });

  describe('Server Testing', () => {
    it('should validate if sections v1 API is reachable', () => {
      return server
        .inject({
          method: 'GET',
          url: '/v1/sections'
        })
        .then((response) => {
          expect(response).to.be.a('object');
          expect(response).to.include({ statusCode: 200 });
        });
    });
  });
});
