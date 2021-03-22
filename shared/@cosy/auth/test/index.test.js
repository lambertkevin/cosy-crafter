import fs from 'fs';
import path from 'path';
import resnap from 'resnap';
import proxyquire from 'proxyquire';
import CustomError from '@cosy/custom-error';
import { expect, AssertionError } from 'chai';
import { startAuthService } from './utils/authUtils';

const reset = resnap();

describe('@cosy/auth unit tests', () => {
  let authServiceChild;
  before(async () => {
    authServiceChild = await startAuthService();
  })

  after(() => {
    authServiceChild.kill('SIGINT');
  })

  describe('Require', () => {
    beforeEach(() => {
      reset();
      delete process.env.AUTH_SERVICE_NAME
      delete process.env.AUTH_SERVICE_PORT
    })

    it('should throw if env vars are not set', () => {
      try {
        require('../index');
        expect.fail('Function should have thrown');
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }

        expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
        expect(e?.name).to.be.equal('EnvVariableNotSet')
      }
    })

    it('should throw if no config file is found', () => {
      try {
        process.env.AUTH_SERVICE_NAME = 'test';
        process.env.AUTH_SERVICE_PORT = '123';

        require('../');
        expect.fail('Function should have thrown');
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }
        expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
        expect(e?.name).to.be.equal('RequireConfigError')
      }
    })
  })

  describe('register', () => {
    let credentialsPath;
    before(() => {
      credentialsPath = path.resolve('./.credentials');
      if (fs.existsSync(credentialsPath)) {
        fs.unlinkSync(credentialsPath);
      }
    })

    beforeEach(() => {
      reset();
      process.env.AUTH_SERVICE_NAME = 'localhost';
      process.env.AUTH_SERVICE_PORT = '3002';
      process.env.RSA_KEYS_LOCATION = path.resolve('./test/config/keys/');
      process.env.AUTH_RSA_KEYS_NAME = 'test';
    })

    it('should exit process if the service couldn\'t register', async () => {
      // noCallThru necessary since the file doesn't exist at all
      const { register } = proxyquire.noCallThru().load('../index', {
        [path.resolve("./src/config")]: {
          identifier: 'test-identifier'
        },
        axios: {
          post: () => Promise.resolve({
            data: {
              data: ''
            }
          })
        }
      });

      try {
        await register();
        expect.fail('Promise should have been rejected');
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }

        expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
        expect(e?.name).to.be.equal('ProcessExitError');
        expect(e?.details?.message).to.be.equal("Couldn't get a key");
      }
    })

    it('should exit process if the service couldn\'t register', async () => {
      process.env.AUTH_RSA_KEYS_NAME = 'other';
      // noCallThru necessary since the file doesn't exist at all
      const { register } = proxyquire.noCallThru().load('../index', {
        [path.resolve("./src/config")]: {
          identifier: 'test-identifier'
        }
      });

      try {
        await register();
        expect.fail('Promise should have been rejected');
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }

        expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
        expect(e?.name).to.be.equal('ProcessExitError')
      }
    })

    it('should register and create credentials file', () => {
      // noCallThru necessary since the file doesn't exist at all
      const { register } = proxyquire.noCallThru().load('../index', {
        [path.resolve("./src/config")]: {
          identifier: 'test-identifier'
        }
      });

      return register()
        .then(() => {
          const credentials = JSON.parse(
            fs.readFileSync(credentialsPath, "utf8")
          )
          expect(credentials).to.have.keys('identifier', 'key');
          expect(credentials?.identifier).to.be.equal('test-identifier');
        })
    })
  })
});
