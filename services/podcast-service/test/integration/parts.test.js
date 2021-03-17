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

describe('Parts API V1 tests', () => {
  let section;
  let podcast;
  let server;
  let authServiceChild;

  before(async () => {
    authServiceChild = await startAuthService();
    server = await init();
    section = await SectionController.create({
      name: `integration-test`
    });
    podcast = await PodcastController.create({
      name: `integration-podcast`,
      edition: 1
    });
  });

  after(() => {
    authServiceChild.kill('SIGINT');
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

  describe('Parts Creation', () => {
    let partPayloadFormData;
    let partPayloadStream;
    let partPayload;

    before(async () => {
      partPayload = {
        name: 'part',
        section: section.data._id.toString(),
        podcast: podcast.data._id.toString(),
        // Be carefull, you can't spread this stream after it being consumed.
        // You'll have to have to manually add this property again.
        file: fs.createReadStream(
          path.resolve('./', 'test', 'files', 'blank.mp3')
        ),
        tags: 'tag1'
      };
      partPayloadFormData = objectToFormData(partPayload);
      partPayloadStream = await getStream(partPayloadFormData);
    });

    describe('Fails', () => {
      it('should fail trying to create part without jwt. HTTP 401', () => {
        return server
          .inject({
            method: 'POST',
            url: '/v1/parts',
            payload: partPayloadStream,
            headers: {
              ...partPayloadFormData.getHeaders(),
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
            payload: partPayloadStream,
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

      it("should fail if part dependencies doesn't exist (no podcast). HTTP 406", async () => {
        const partPayloadFormDataNoPodcast = objectToFormData({
          ...partPayload,
          // Redundancy because the stream of partPayload has already been consumed
          file: Buffer.alloc(0),
          section: '1234-1234-1234-1234-1234'
        });
        const partPayloadStreamNoPodcast = await getStream(
          partPayloadFormDataNoPodcast
        );

        return server
          .inject({
            method: 'POST',
            url: '/v1/parts',
            payload: partPayloadStreamNoPodcast,
            headers: {
              ...partPayloadFormDataNoPodcast.getHeaders(),
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

      it("should fail if part dependencies doesn't exist (no section). HTTP 406", async () => {
        const partPayloadFormDataNoSection = objectToFormData({
          ...partPayload,
          // Redundancy because the stream has already been consumed before
          file: Buffer.alloc(0),
          section: '1234-1234-1234-1234-1234'
        });
        const partPayloadStreamNoSection = await getStream(
          partPayloadFormDataNoSection
        );

        return server
          .inject({
            method: 'POST',
            url: '/v1/parts',
            payload: partPayloadStreamNoSection,
            headers: {
              ...partPayloadFormDataNoSection.getHeaders(),
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

      describe('Requirements', () => {
        it('should fail if missing name', async () => {
          const payloadFormData = objectToFormData({
            ...partPayload,
            file: Buffer.alloc(0),
            name: null
          });
          const payloadStream = await getStream(payloadFormData);

          return server
            .inject({
              method: 'POST',
              url: '/v1/parts',
              payload: payloadStream,
              headers: {
                ...payloadFormData.getHeaders(),
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
            ...partPayload,
            file: Buffer.alloc(0),
            section: null
          });
          const payloadStream = await getStream(payloadFormData);

          return server
            .inject({
              method: 'POST',
              url: '/v1/parts',
              payload: payloadStream,
              headers: {
                ...payloadFormData.getHeaders(),
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
            ...partPayload,
            file: Buffer.alloc(0),
            podcast: null
          });
          const payloadStream = await getStream(payloadFormData);

          return server
            .inject({
              method: 'POST',
              url: '/v1/parts',
              payload: payloadStream,
              headers: {
                ...payloadFormData.getHeaders(),
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
            ...partPayload,
            file: null
          });
          const payloadStream = await getStream(payloadFormData);

          return server
            .inject({
              method: 'POST',
              url: '/v1/parts',
              payload: payloadStream,
              headers: {
                ...payloadFormData.getHeaders(),
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

        it('should fail if name is longer than 100 characters', async () => {
          const payloadFormData = objectToFormData({
            ...partPayload,
            file: Buffer.alloc(0),
            name:
              // 101 characters
              'UbI5Of66mGLq6HBQqCnDyhBpzWpRtSKUAqvznxu3wz85vuP9iNsxBtkVoTF8PdBAQkMv45l5YAESLcBPN8NIcdzIURKmJTAJ7HaQu'
          });
          const payloadStream = await getStream(payloadFormData);

          return server
            .inject({
              method: 'POST',
              url: '/v1/parts',
              payload: payloadStream,
              headers: {
                ...payloadFormData.getHeaders(),
                authorization: accessToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response.result).to.deep.include({
                statusCode: 400,
                error: 'Bad Request',
                message:
                  '"name" length must be less than or equal to 100 characters long'
              });
            });
        });

        it('should fail if tags are longer than 200 characters', async () => {
          const payloadFormData = objectToFormData({
            ...partPayload,
            file: Buffer.alloc(0),
            tags:
              // 201 characters
              'YVynrJFfbyWe47ddFwxg4sQAvs9ptOlvT9hWy6gSf1vqABmsQ03osPrtpU56GtpKNS88LgWXpkvyRuBHf9zkC12bRYVyr5hqL31u, YzhNiKJKFn8kun974RdwMLFar9ZRDoenyYXkmSPet4BGMIMahCAYbl8ZC7xXhBqKnlnEnJab9faun4y27ISboOZc7NTnW9bXw7R1R'
          });
          const payloadStream = await getStream(payloadFormData);

          return server
            .inject({
              method: 'POST',
              url: '/v1/parts',
              payload: payloadStream,
              headers: {
                ...payloadFormData.getHeaders(),
                authorization: accessToken
              }
            })
            .then((response) => {
              expect(response).to.be.a('object');
              expect(response).to.include({ statusCode: 400 });
              expect(response.result).to.deep.include({
                statusCode: 400,
                error: 'Bad Request',
                message:
                  '"tags" length must be less than or equal to 200 characters long'
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
            payload: partPayloadStream,
            headers: {
              ...partPayloadFormData.getHeaders(),
              authorization: accessToken
            }
          })
          .then((response) => {
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
    });
  });

  describe('Parts Update', () => {
    let part;

    before(async () => {
      podcast = await PodcastController.create({
        name: `integration-podcast-2`,
        edition: 2
      });

      part = await PartController.create({
        name: 'partToUpdate',
        section: section.data._id.toString(),
        podcast: podcast.data._id.toString(),
        tags: 'tag1',
        file: {
          path: path.resolve('./', 'test', 'files', 'blank.mp3'),
          bytes: 61637,
          filename: 'blank.mp3',
          headers: {
            'content-disposition':
              'form-data; name="file"; filename="blank.mp3"',
            'content-type': 'audio/mpeg'
          }
        }
      });
    });

    describe('Fails', () => {
      it('should fail trying to create part without jwt. HTTP 401', () => {
        return server
          .inject({
            method: 'PATCH',
            url: `/v1/parts/${part?.data?._id}`,
            payload: {
              name: 'partToUpdateRename'
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
            method: 'PATCH',
            url: `/v1/parts/${part?.data?._id}`,
            payload: {
              name: 'partToUpdateRename'
            },
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

      it('should fail updating a non existent part', () => {
        const payloadUpdateFormData = objectToFormData({
          name: 'update'
        });

        return server
          .inject({
            method: 'PATCH',
            url: `/v1/parts/1234a1234b1234c1234d1234`,
            payload: payloadUpdateFormData.getBuffer(),
            headers: {
              ...payloadUpdateFormData.getHeaders(),
              authorization: accessToken
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 404 });
            expect(response.result).to.deep.include({
              statusCode: 404,
              error: 'Not Found',
              message: 'Not Found'
            });
          });
      });

      it("should fail if part dependencies doesn't exist (wrong podcast). HTTP 406", () => {
        const payloadUpdateFormData = objectToFormData({
          podcast: '1234-1234-1234-1234-1234'
        });

        return server
          .inject({
            method: 'PATCH',
            url: `/v1/parts/${part?.data?._id}`,
            payload: payloadUpdateFormData.getBuffer(),
            headers: {
              ...payloadUpdateFormData.getHeaders(),
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

      it("should fail if part dependencies doesn't exist (wrong section). HTTP 406", () => {
        const payloadUpdateFormData = objectToFormData({
          section: '1234-1234-1234-1234-1234'
        });

        return server
          .inject({
            method: 'PATCH',
            url: `/v1/parts/${part?.data?._id}`,
            payload: payloadUpdateFormData.getBuffer(),
            headers: {
              ...payloadUpdateFormData.getHeaders(),
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
    });

    describe('Success', () => {
      it('should succeed updating basic fields', () => {
        const payloadFormData = objectToFormData({
          name: 'partNameUpdated',
          tags: 'new-tag, new-tag-2'
        });

        return server
          .inject({
            method: 'PATCH',
            url: `/v1/parts/${part?.data?._id}`,
            payload: payloadFormData.getBuffer(),
            headers: {
              ...payloadFormData.getHeaders(),
              authorization: accessToken
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 200 });
            expect(response?.result).to.include({
              statusCode: 200
            });
            expect(response?.result?.data).to.include({
              name: 'partNameUpdated'
            });
            expect(response?.result?.data?.tags).to.include.members([
              'new-tag',
              'new-tag-2'
            ]);
          });
      });

      it('should succeed updating dependencies', async () => {
        const newSection = await SectionController.create({
          name: `integration-test-2`
        });
        const newPodcast = await PodcastController.create({
          name: `integration-podcast-3`,
          edition: 3
        });
        const payloadFormData = objectToFormData({
          section: newSection.data._id.toString(),
          podcast: newPodcast.data._id.toString()
        });

        return server
          .inject({
            method: 'PATCH',
            url: `/v1/parts/${part?.data?._id}`,
            payload: payloadFormData.getBuffer(),
            headers: {
              ...payloadFormData.getHeaders(),
              authorization: accessToken
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 200 });
            expect(response?.result).to.include({
              statusCode: 200
            });
            expect(response?.result?.data).to.include({
              name: 'partNameUpdated'
            });
            expect(response?.result?.data?.section?._id.toString()).to.equal(
              newSection.data._id.toString()
            );
            expect(response?.result?.data?.podcast?._id.toString()).to.equal(
              newPodcast.data._id.toString()
            );
          });
      });

      it('should succeed updating part file', async () => {
        const payloadUpdateFormData = objectToFormData({
          file: fs.createReadStream(
            path.resolve('./', 'test', 'files', 'blank2.mp3')
          )
        });
        const payloadUpdateStream = await getStream(payloadUpdateFormData);

        return server
          .inject({
            method: 'PATCH',
            url: `/v1/parts/${part?.data?._id}`,
            payload: payloadUpdateStream,
            headers: {
              ...payloadUpdateFormData.getHeaders(),
              authorization: accessToken
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 200 });
            expect(response?.result).to.include({
              statusCode: 200
            });
            expect(response?.result?.data).to.include({
              originalFilename: 'blank2.mp3'
            });
          });
      });
    });
  });

  describe('Parts Deletion', () => {
    describe('Fails', () => {
      it('should fail trying to create part without jwt. HTTP 401', () => {
        return server
          .inject({
            method: 'DELETE',
            url: '/v1/parts/1234a1234b1234c1234d1234'
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
    });

    describe('Success', () => {
      it('should succeed deleting part', async () => {
        const partToDelete = await PartController.create({
          name: `partToDelete`,
          section: section?.data?._id?.toString(),
          podcast: podcast?.data?._id?.toString(),
          tags: 'tag1',
          file: {
            path: path.resolve('./', 'test', 'files', 'blank.mp3'),
            bytes: 61637,
            filename: 'blank.mp3',
            headers: {
              'content-disposition':
                'form-data; name="file"; filename="blank.mp3"',
              'content-type': 'audio/mpeg'
            }
          }
        });

        return server
          .inject({
            method: 'DELETE',
            url: '/v1/parts',
            payload: { ids: [partToDelete?.data?._id?.toString()] },
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
              partToDelete?.data?._id?.toString()
            );
          });
      });

      it('should cascade delete part when deleting podcast', async () => {
        const podcastToDelete = await PodcastController.create({
          name: 'integration-podcast-to-cascade-delete',
          edition: 1234
        });
        const partToDelete = await PartController.create({
          name: `partToDelete`,
          section: section?.data?._id?.toString(),
          podcast: podcastToDelete?.data?._id?.toString(),
          tags: 'tag1',
          file: {
            path: path.resolve('./', 'test', 'files', 'blank.mp3'),
            bytes: 61637,
            filename: 'blank.mp3',
            headers: {
              'content-disposition':
                'form-data; name="file"; filename="blank.mp3"',
              'content-type': 'audio/mpeg'
            }
          }
        });
        await PodcastController.remove([podcastToDelete.data._id]);

        return server
          .inject({
            method: 'GET',
            url: `/v1/parts/${partToDelete.data._id.toString()}`,
            headers: {
              authorization: accessToken
            }
          })
          .then((response) => {
            expect(response).to.be.a('object');
            expect(response).to.include({ statusCode: 404 });
          });
      });

      it('should cascade delete part when deleting section', async () => {
        const sectionToDelete = await SectionController.create({
          name: 'integration-podcast-to-cascade-delete'
        });
        const partToDelete = await PartController.create({
          name: `part2`,
          section: sectionToDelete?.data?._id?.toString(),
          podcast: podcast?.data?._id?.toString(),
          tags: 'tag1',
          file: {
            path: path.resolve('./', 'test', 'files', 'blank.mp3'),
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
            url: `/v1/parts/${partToDelete.data._id.toString()}`,
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
});
