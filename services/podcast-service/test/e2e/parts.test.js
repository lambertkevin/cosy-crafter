import getStream from 'get-stream';
import FormData from 'form-data';
import jwt from 'jsonwebtoken';
import { expect } from 'chai';
import init from '../../src/server';

const objectToFormData = (obj) => {
  const fd = new FormData();
  Object.keys(obj).forEach((key) => {
    fd.append(key, obj[key]);
  });
  return fd;
};

describe('Parts API tests', () => {
  const accessToken = jwt.sign(
    {
      service: 'e2e-service'
    },
    process.env.SERVICE_JWT_SECRET,
    {
      expiresIn: '10m'
    }
  );
  let server;

  before(async () => {
    server = await init();
  });

  describe('Server Testing', () => {
    it('should validate if parts v1 API is reachable', () => {
      return server
        .inject({
          method: 'GET',
          url: '/v1/parts'
        })
        .then((response) => {
          expect(response).to.be.a('object');
          expect(response).to.include({ statusCode: 200 });
        });
    });
  });

  describe('Parts Creation', () => {
    let fakePartCreationPayloadFormData;
    let fakePartCreationPayloadString;

    before(async () => {
      // Create Section here
      // Create Podcast here

      const fakePartCreationPayload = {
        name: 'part',
        section: '1234-1234-1234-1234-1234',
        podcast: '1234-1234-1234-1234-1234',
        tags: 'tag1',
        file: Buffer.alloc(1)
      };

      fakePartCreationPayloadFormData = objectToFormData(
        fakePartCreationPayload
      );
      fakePartCreationPayloadString = await getStream(
        fakePartCreationPayloadFormData
      );
    });

    it('should fail trying to create part without jwt', () => {
      return server
        .inject({
          method: 'POST',
          url: '/v1/parts',
          payload: fakePartCreationPayloadString,
          headers: {
            ...fakePartCreationPayloadFormData.getHeaders(),
            maxBodyLength: 200 * 1024 * 1024, // 200MB max part size
            maxContentLength: 200 * 1024 * 1024 // 200MB max part size
          }
        })
        .then((response) => {
          expect(response).to.be.a('object');
          expect(response).to.include({ statusCode: 401 });
          expect(response.result).to.deep.include({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Missing authentication'
          });
        });
    });

    it('should fail if creation content-type is not multipart', () => {
      return server
        .inject({
          method: 'POST',
          url: '/v1/parts',
          payload: fakePartCreationPayloadString,
          headers: {
            // No content-type is set so 'application/json' is set as default
            authorization: accessToken
          }
        })
        .then((response) => {
          expect(response).to.be.a('object');
          expect(response).to.include({ statusCode: 415 });
          expect(response.result).to.deep.include({
            statusCode: 415,
            error: 'Unsupported Media Type',
            message: 'Unsupported Media Type'
          });
        });
    });

    it("should fail if part dependencies doesn't exist", () => {
      return server
        .inject({
          method: 'POST',
          url: '/v1/parts',
          payload: fakePartCreationPayloadString,
          headers: {
            ...fakePartCreationPayloadFormData.getHeaders(),
            authorization: accessToken
          }
        })
        .then((response) => {
          expect(response).to.be.a('object');
          expect(response).to.include({ statusCode: 406 });
          expect(response.result).to.deep.include({
            statusCode: 406,
            error: 'Not Acceptable',
            message: "At least one dependency doesn't exist"
          });
        });
    });

    /**  @TODO Add creation of dependencies before creation */
    it.skip('should succeed creating part', () => {
      return server
        .inject({
          method: 'POST',
          url: '/v1/parts',
          // payload: fakePartCreationPayloadString,
          headers: {
            // ...fakePartCreationPayloadFormData.getHeaders(),
            authorization: accessToken
          }
        })
        .then((response) => {
          console.log(response.result);
          expect(response).to.be.a('object');
          expect(response).to.include({ statusCode: 200 });
          expect(response.result).to.deep.include({
            statusCode: 200
          });
        });
    });
  });
});
