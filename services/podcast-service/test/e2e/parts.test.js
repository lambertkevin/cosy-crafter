import fs from 'fs';
import path from 'path';
import { expect } from 'chai';
import jwt from 'jsonwebtoken';
import FormData from 'form-data';
import getStream from 'get-stream';
import * as SectionController from '../../src/controllers/SectionController';
import * as PodcastController from '../../src/controllers/PodcastController';
import * as PartController from '../../src/controllers/PartController';
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
    let fakePartPayloadFormData;
    let fakePartPayloadString;
    let partPayloadFormData;
    let partPayloadString;
    let section;
    let podcast;
    let part;

    before(async () => {
      section = await SectionController.create({
        name: `e2e-test`
      });
      podcast = await PodcastController.create({
        name: `e2e-podcast`,
        edition: 1
      });

      const fakePartPayload = {
        name: `part`,
        section: '1234-1234-1234-1234-1234',
        podcast: '1234-1234-1234-1234-1234',
        tags: 'tag1',
        file: Buffer.alloc(0)
      };

      fakePartPayloadFormData = objectToFormData(fakePartPayload);
      fakePartPayloadString = await getStream(fakePartPayloadFormData);

      partPayloadFormData = objectToFormData({
        ...fakePartPayload,
        section: section.data._id.toString(),
        podcast: podcast.data._id.toString(),
        file: fs.createReadStream(
          path.join(path.resolve('./'), 'test', 'files', 'blank.mp3')
        )
      });

      partPayloadString = await getStream(partPayloadFormData);
    });

    after(async () => {
      await PartController.remove([part?.data?._id]);
      await SectionController.remove([section?.data?._id]);
      await PodcastController.remove([podcast?.data?._id]);
    });

    it('should fail trying to create part without jwt', () => {
      return server
        .inject({
          method: 'POST',
          url: '/v1/parts',
          payload: fakePartPayloadString,
          headers: {
            ...fakePartPayloadFormData.getHeaders(),
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
          payload: fakePartPayloadString,
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
          payload: fakePartPayloadString,
          headers: {
            ...fakePartPayloadFormData.getHeaders(),
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

    it('should succeed creating part', () => {
      return server
        .inject({
          method: 'POST',
          url: '/v1/parts',
          payload: partPayloadString,
          headers: {
            ...partPayloadFormData.getHeaders(),
            authorization: accessToken
          }
        })
        .then((response) => {
          part = response.result;
          expect(response).to.be.a('object');
          expect(response).to.include({ statusCode: 200 });
          expect(response?.result).to.include({
            statusCode: 200
          });
          expect(response?.result?.data).to.include({
            originalFilename: 'blank.mp3',
            contentType: 'audio/mpeg'
          });
          expect(response?.result?.data?.section?.toString()).to.be.equal(
            section?.data?._id?.toString()
          );
          expect(response?.result?.data?.podcast?.toString()).to.be.equal(
            podcast?.data?._id?.toString()
          );
        });
    });

    it('should succeed deleting part', () => {
      return server
        .inject({
          method: 'DELETE',
          url: '/v1/parts',
          payload: { ids: [part?.data?._id?.toString()] },
          headers: {
            authorization: accessToken
          }
        })
        .then((response) => {
          expect(response).to.be.a('object');
          expect(response).to.include({ statusCode: 200 });
          expect(response?.result).to.include({
            statusCode: 200
          });
          expect(response?.result?.data?.deleted[0]).to.be.equal(
            part?.data?._id?.toString()
          );
        });
    });

    it('should cascade delete part when deleting podcast', async () => {
      const part2 = await PartController.create({
        name: `part2`,
        section: section?.data?._id?.toString(),
        podcast: podcast?.data?._id?.toString(),
        tags: 'tag1',
        file: {
          path: path.join(path.resolve('./'), 'test', 'files', 'blank.mp3'),
          bytes: 61637,
          filename: 'blank.mp3',
          headers: {
            'content-disposition':
              'form-data; name="file"; filename="blank.mp3"',
            'content-type': 'audio/mpeg'
          }
        }
      });
      await PodcastController.remove([podcast.data._id]);

      return server
        .inject({
          method: 'GET',
          url: `/v1/parts/${part2.data._id.toString()}`,
          headers: {
            authorization: accessToken
          }
        })
        .then((response) => {
          expect(response).to.be.a('object');
          expect(response).to.include({ statusCode: 404 });
        });
    });
  });
});
