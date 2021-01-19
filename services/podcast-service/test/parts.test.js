import { assert } from 'chai';
// import request from 'http';
import init from '../src/server';

describe('Parts API tests', () => {
  let server;

  before(async () => {
    server = await init();
  });

  describe('Server Testing', () => {
    it('should validate if server is reachable', () => {
      return server
        .inject({
          method: 'GET',
          url: '/'
        })
        .then((response) => {
          assert.deepEqual(response.statusCode, 404);
        });
    });
  });
});
