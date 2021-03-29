import Boom from '@hapi/boom';
import proxyquire from 'proxyquire';
import { expect, AssertionError } from 'chai';
import { makeRsaPublicEncrypter } from '@cosy/rsa-utils';
import { checkSignature } from '../../src/middlewares/ServiceMiddleware';

const h = {
  continue: Symbol('h.continue')
};

describe('ServiceMiddleware unit tests', () => {
  describe('checkSignature', () => {
    it('should fail if authorization is invalid', () => {
      const headers = {
        'x-authorization': Date.now()
      };

      try {
        checkSignature({ headers }, h);
        expect.fail('Function should have been thrown');
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }

        expect(e).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(e?.message).to.be.equal('Signature Check Failed');
        expect(e?.output?.statusCode).to.be.equal(401);
      }
    });

    it('should fail if authorization is too old', () => {
      const privateEncrypter = makeRsaPublicEncrypter();
      const headers = {
        'x-authorization': privateEncrypter(Date.now() - 1000)
      };

      try {
        checkSignature({ headers }, h);
        expect.fail('Function should have been thrown');
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }

        expect(e).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(e?.message).to.be.equal('Signature Check Failed');
        expect(e?.output?.statusCode).to.be.equal(401);
      }
    });

    it('should succedd if authorization is invalid', () => {
      const privateEncrypter = makeRsaPublicEncrypter();
      const headers = {
        'x-authorization': privateEncrypter(Date.now())
      };

      const response = checkSignature({ headers }, h);

      expect(response).to.be.equal(h.continue);
    });
  });

  describe('checkIpWhiteList', () => {
    let checkIpWhiteList;
    before(() => {
      const ServiceMiddlewareProxyfied = proxyquire('../../src/middlewares/ServiceMiddleware.js', {
        fs: {
          readFileSync: () => ({ whitelist: ['1.2.3.4'] })
        }
      });
      checkIpWhiteList = ServiceMiddlewareProxyfied.checkIpWhiteList;
    });

    it('should fail if ip is not whitelisted', () => {
      const request = {
        info: {
          remoteAddress: '5.6.7.8'
        }
      };
      try {
        checkIpWhiteList(request, h);
        expect.fail('Function should have thrown');
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }
        expect(e).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(e?.message).to.be.equal('Remote not authorized');
        expect(e?.output?.statusCode).to.be.equal(401);
      }
    });

    it('should succeed if ip is private', () => {
      const request = {
        info: {
          remoteAddress: '192.168.1.1'
        }
      };

      const response = checkIpWhiteList(request, h);
      expect(response).to.be.equal(h.continue);
    });

    it('should succeed if ip is whitelisted', () => {
      const request = {
        info: {
          remoteAddress: '1.2.3.4'
        }
      };

      const response = checkIpWhiteList(request, h);
      expect(response).to.be.equal(h.continue);
    });
  });
});
