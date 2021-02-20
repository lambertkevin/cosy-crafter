import fs from 'fs';
import path from 'path';
import { expect } from 'chai';
import getStream from 'get-stream';
import * as SectionController from '../../src/controllers/SectionController';
import * as PodcastController from '../../src/controllers/PodcastController';
import * as PartController from '../../src/controllers/PartController';
import { startAuthService, accessToken } from '../utils/authUtils';
import { objectToFormData } from '../utils/formUtils';
import init from '../../src/server';

describe('Parts API tests', () => {
  let server;
  let pid;

  before(async () => {
    const authServiceChild = await startAuthService();
    pid = authServiceChild.pid;
    server = await init();
  });

  after(() => {
    process.kill(pid);
    server.stop();
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

  describe('Parts Creation and Deletion', () => {
    let fakePartPayloadFormData;
    let fakePartPayloadString;
    let partPayloadFormData;
    let partPayloadString;
    let fakePartPayload;
    let section;
    let podcast;
    let part;

    before(async () => {
      fakePartPayload = {
        name: `part`,
        section: '1234-1234-1234-1234-1234',
        podcast: '1234-1234-1234-1234-1234',
        tags: 'tag1',
        file: Buffer.alloc(0)
      };

      section = await SectionController.create({
        name: `e2e-test`
      });
      podcast = await PodcastController.create({
        name: `e2e-podcast`,
        edition: 1
      });

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

    describe('Fails', () => {
      it('should fail trying to create part without jwt. HTTP 401', () => {
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

      it('should fail if creation content-type is not multipart. HTTP 415', () => {
        return server
          .inject({
            method: 'POST',
            url: '/v1/parts',
            payload: fakePartPayloadString,
            headers: {
              contentType: 'application/json',
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

      it("should fail if part dependencies doesn't exist. HTTP 406", () => {
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

      describe('Required fields', () => {
        it('should fail if missing name', async () => {
          const payloadFormData = objectToFormData({
            ...fakePartPayload,
            name: null
          });
          const payloadString = await getStream(payloadFormData);

          return server
            .inject({
              method: 'POST',
              url: '/v1/parts',
              payload: payloadString,
              headers: {
                ...payloadFormData.getHeaders(),
                maxBodyLength: 200 * 1024 * 1024, // 200MB max part size
                maxContentLength: 200 * 1024 * 1024, // 200MB max part size
                authorization: accessToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response.result).to.deep.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"name" is required'
              });
            });
        });

        it('should fail if missing section', async () => {
          const payloadFormData = objectToFormData({
            ...fakePartPayload,
            section: null
          });
          const payloadString = await getStream(payloadFormData);

          return server
            .inject({
              method: 'POST',
              url: '/v1/parts',
              payload: payloadString,
              headers: {
                ...payloadFormData.getHeaders(),
                maxBodyLength: 200 * 1024 * 1024, // 200MB max part size
                maxContentLength: 200 * 1024 * 1024, // 200MB max part size
                authorization: accessToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response.result).to.deep.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"section" is required'
              });
            });
        });

        it('should fail if missing podcast', async () => {
          const payloadFormData = objectToFormData({
            ...fakePartPayload,
            podcast: null
          });
          const payloadString = await getStream(payloadFormData);

          return server
            .inject({
              method: 'POST',
              url: '/v1/parts',
              payload: payloadString,
              headers: {
                ...payloadFormData.getHeaders(),
                maxBodyLength: 200 * 1024 * 1024, // 200MB max part size
                maxContentLength: 200 * 1024 * 1024, // 200MB max part size
                authorization: accessToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response.result).to.deep.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"podcast" is required'
              });
            });
        });

        it('tag is not required');

        it('should fail if missing file', async () => {
          const payloadFormData = objectToFormData({
            ...fakePartPayload,
            file: null
          });
          const payloadString = await getStream(payloadFormData);

          return server
            .inject({
              method: 'POST',
              url: '/v1/parts',
              payload: payloadString,
              headers: {
                ...payloadFormData.getHeaders(),
                maxBodyLength: 200 * 1024 * 1024, // 200MB max part size
                maxContentLength: 200 * 1024 * 1024, // 200MB max part size
                authorization: accessToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response.result).to.deep.include({
                statusCode: 400,
                error: 'Bad Request',
                message: '"file" is required'
              });
            });
        });
      });
    });

    describe('Success', () => {
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

  describe('Parts Update', () => {
    it('has to be implemented');
  });
});
