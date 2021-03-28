import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import init from '../../src/server';
import { startAuthService } from '../utils/authUtils';

chai.use(chaiHttp);

describe('Service global api integration tests', () => {
  let server;
  let authServiceChild;

  before(async () => {
    authServiceChild = await startAuthService();
    server = await init();
  });

  after(() => {
    authServiceChild.kill('SIGINT');
  });

  it('should respond the details of the transcoding queue', async () => {
    const { body: response } = await chai.request(server).get('/details');

    expect(response).to.deep.include({
      events: { _events: {}, _eventsCount: 2 },
      jobs: { all: [], waiting: [], failed: [], ongoing: [], length: 0 },
      workers: { all: [], available: [], busy: [], length: 0 }
    });
  });
});
