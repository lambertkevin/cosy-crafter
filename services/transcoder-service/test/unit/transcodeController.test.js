import fs from 'fs';
import path from 'path';
import axios from 'axios';
import spies from 'chai-spies';
import objectID from 'bson-objectid';
import chai, { AssertionError, expect } from 'chai';
import * as TranscodeController from '../../src/controllers/TranscodeController';
import { getMp3Duration } from '../../src/utils/Mp3Utils';
import { mockAxios } from '../utils/AxiosUtils';

chai.use(spies);

const makeFakeSocket = (killJob = false) => ({
  id: 'fake-socket',
  handshake: {},
  emit(eventName, payload) {
    this.responses.push({
      type: 'emit',
      eventName,
      payload
    });
  },
  on(eventName, cb) {
    if (eventName.includes('kill-job-') && killJob) {
      setTimeout(() => {
        cb();
      }, 50);
    }
  },
  responses: []
});

const makeFakeAck = () => {
  const response = { value: null };
  const ack = (payload) => {
    response.value = payload;
  };

  return [response, ack];
};

describe('Transcode Controller Unit tests', () => {
  describe('getFile', () => {
    describe('Fails', () => {
      it('should fail if file is undefined', async () => {
        try {
          await TranscodeController.getFile();
          expect.fail('Promise should have failed');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('FileTypeError');
        }
      });

      it('should fail if file is not an object', async () => {
        try {
          await TranscodeController.getFile('text');
          expect.fail('Promise should have failed');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('FileTypeError');
        }
      });

      it('should fail if file type is unknown', async () => {
        const file = {
          id: 'test-id',
          type: 'unkown-type'
        };

        try {
          await TranscodeController.getFile(file);
          expect.fail('Promise should have failed');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('FileTypeError');
        }
      });

      it('should fail if file is not found', async () => {
        const file = {
          id: 'test-id',
          type: 'podcast-part'
        };

        mockAxios(false, true);

        try {
          await TranscodeController.getFile(file);
          expect.fail('Promise should have failed');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('StorageServiceError');
          expect(e.details).to.include({ code: 404 });
          expect(e.details.message).to.be.equal(
            'Error: Request failed with status code 404'
          );
          chai.spy.restore();
        }
      });
    });

    describe('Success', () => {
      const file = {
        id: 'test-id',
        type: 'podcast-part'
      };
      const testFilePath = path.resolve(`./cache/${file.id}`);

      before(async () => {
        const fileExists = fs.existsSync(testFilePath);
        if (fileExists) {
          fs.unlinkSync(testFilePath);
        }
      });

      after(async () => {
        const fileExists = fs.existsSync(testFilePath);
        if (fileExists) {
          fs.unlinkSync(testFilePath);
        }
      });

      it('should succeed getting an existing file and saving it', async () => {
        chai.spy.on(axios, 'get', () =>
          fs.promises.readFile(
            path.resolve('./test/files/10-seconds-of-silence.mp3')
          )
        );

        const filepath = await TranscodeController.getFile(file);
        const fileExists = fs.existsSync(filepath);
        chai.spy.restore(axios);

        expect(fileExists).to.be.equal(true);
      });
    });
  });

  describe('joinFiles', () => {
    describe('Fails', () => {
      it('should fail if files is undefined and throw', async () => {
        try {
          await TranscodeController.joinFiles();
          expect.fail('Promise should have been rejected');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }
          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('ValidationError');
          expect(e.message).to.be.equal('"files" is required');
        }
      });

      it('should fail if files is not an array and throw', async () => {
        try {
          await TranscodeController.joinFiles('test');
          expect.fail('Promise should have been rejected');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }
          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('ValidationError');
          expect(e.message).to.be.equal('"files" must be an array');
        }
      });

      it('should fail if a file has no id field and throw', async () => {
        try {
          await TranscodeController.joinFiles([{ test: 1 }]);
          expect.fail('Promise should have been rejected');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }
          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('ValidationError');
          expect(e.message).to.be.equal('"files[0].id" is required');
        }
      });

      it('should fail if a file has no path field and throw', async () => {
        try {
          await TranscodeController.joinFiles([
            { id: '604fd42cbe839f3738dd7831', type: 'user-input', test: 1 }
          ]);
          expect.fail('Promise should have been rejected');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }
          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('ValidationError');
          expect(e.message).to.be.equal('"files[0].path" is required');
        }
      });

      it('should fail if jobId is undefined and throw', async () => {
        try {
          await TranscodeController.joinFiles([
            { id: '604fd42cbe839f3738dd7831', path: 'ok', type: 'user-input' }
          ]);
          expect.fail('Promise should have been rejected');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }
          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('ValidationError');
          expect(e.message).to.be.equal('"jobId" is required');
        }
      });

      it('should fail if jobId is not a string and throw', async () => {
        try {
          await TranscodeController.joinFiles(
            [
              {
                id: '604fd42cbe839f3738dd7831',
                path: 'ok',
                type: 'user-input'
              }
            ],
            123
          );
          expect.fail('Promise should have been rejected');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }
          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('ValidationError');
          expect(e.message).to.be.equal('"jobId" must be a string');
        }
      });

      it('should fail if jobId is not a valid GUID and throw', async () => {
        try {
          await TranscodeController.joinFiles(
            [
              {
                id: '604fd42cbe839f3738dd7831',
                path: 'ok',
                type: 'user-input'
              }
            ],
            'invalid-job-id'
          );
          expect.fail('Promise should have been rejected');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }
          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('ValidationError');
          expect(e.message).to.be.equal('"jobId" must be a valid GUID');
        }
      });

      it('should fail if socket is not defined and throw', async () => {
        try {
          await TranscodeController.joinFiles(
            [],
            'C56A4180-65AA-42EC-A945-5FD21DEC0538'
          );
          expect.fail('Promise should have been rejected');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }
          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('ValidationError');
          expect(e.message).to.be.equal('"socket" is required');
        }
      });
    });

    describe('Success', () => {
      it('should succeed creating a merge of 2 mp3s with crossfade', async () => {
        const files = [
          {
            id: '604fd42cbe839f3738dd7831',
            path: path.resolve('./test/files/This_is_a_test_-_voice_1.mp3'),
            type: 'podcast-part'
          },
          {
            id: '604fd42cbe839f3738dd7832',
            path: path.resolve('./test/files/Beat_Thee_-_128Kbps.mp3'),
            type: 'user-input'
          }
        ];
        const fakeSocket = makeFakeSocket();

        return TranscodeController.joinFiles(
          files,
          'C56A4180-65AA-42EC-A945-5FD21DEC0538',
          fakeSocket
        ).then(() => {
          const lastEmit =
            fakeSocket.responses[fakeSocket.responses.length - 1];
          expect(lastEmit?.payload).to.deep.include({ percent: 100 });
        });
      });

      it('should succeed creating a merge of 3 mp3s with crossfade and cutting them', async () => {
        const files = [
          {
            id: '604fd42cbe839f3738dd7831',
            path: path.resolve('./test/files/This_is_a_test_-_voice_1.mp3'),
            seek: {
              start: 0,
              end: 10
            },
            type: 'podcast-part'
          },
          {
            id: '604fd42cbe839f3738dd7831',
            path: path.resolve('./test/files/Beat_Thee_-_128Kbps.mp3'),
            seek: {
              start: 0,
              end: 10
            },
            type: 'user-input'
          },
          {
            id: '604fd42cbe839f3738dd7831',
            path: path.resolve('./test/files/This_is_a_test_-_voice_2.mp3'),
            seek: {
              start: 0,
              end: 10
            },
            type: 'podcast-part'
          }
        ];
        const fakeSocket = makeFakeSocket();

        return TranscodeController.joinFiles(
          files,
          'C56A4180-65AA-42EC-A945-5FD21DEC0538',
          fakeSocket
        )
          .then((res) => getMp3Duration(res))
          .then((duration) => {
            const lastEmit =
              fakeSocket.responses[fakeSocket.responses.length - 1];
            expect(lastEmit?.payload).to.deep.include({ percent: 100 });
            // Duration should be 16 (10 sec + 10 sec + 10 sec - 2*4 sec of overlapping crossfade)
            expect(Math.round(duration)).to.be.equal(22);
          });
      });
    });
  });

  describe('upload', () => {
    describe('Fails', () => {
      it('should fail if filepath is undefined', async () => {
        try {
          await TranscodeController.upload();
          expect.fail('Promise should have been rejected');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('FilePathError');
        }
      });

      it('should fail if filepath is not a string', async () => {
        try {
          await TranscodeController.upload(123);
          expect.fail('Promise should have been rejected');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('FilePathError');
        }
      });

      it("should fail if file doesn't exist", async () => {
        try {
          await TranscodeController.upload('filepath-not-existing.mp3');
          expect.fail('Promise should have been rejected');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('FileNotFound');
        }
      });

      it('should fail if jobId is undefined', async () => {
        try {
          await TranscodeController.upload(
            path.resolve('./test/files/10-seconds-of-silence.mp3')
          );
          expect.fail('Promise should have been rejected');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('JobIdError');
        }
      });

      it('should fail if jobId is an empty string', async () => {
        try {
          await TranscodeController.upload(
            path.resolve('./test/files/10-seconds-of-silence.mp3', '')
          );
          expect.fail('Promise should have been rejected');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('JobIdError');
        }
      });

      it('should fail if storage service returns a 404', async () => {
        mockAxios(true, false);

        try {
          await TranscodeController.upload(
            path.resolve('./test/files/'),
            'test-id'
          );
          expect.fail('Promise should have been rejected');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('UploadServiceError');
          expect(e.details.code).to.be.equal(404);
          expect(e.details.isAxiosError).to.be.equal(true);
        } finally {
          chai.spy.restore();
        }
      });

      it('should fail if storage service returns an empty savedFile', async () => {
        chai.spy.on(axios, 'create', () => ({
          interceptors: {
            request: {
              use: () => {}
            }
          },
          post: () => Promise.resolve({ savedFile: null })
        }));

        try {
          await TranscodeController.upload(
            path.resolve('./test/files/'),
            'test-id'
          );
          expect.fail('Promise should have been rejected');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('SaveError');
        } finally {
          chai.spy.restore();
        }
      });
    });

    describe('Success', () => {
      it('should succeed uploading a craft', async () => {
        mockAxios(false, true, false);

        return TranscodeController.upload(
          path.resolve('./test/files/'),
          'test-id'
        )
          .then((response) => {
            expect(response).to.deep.include({
              filename: 'integration-craft-filename.mp3',
              location: 'crafts/integration-craft-filename.mp3',
              storageType: 'local',
              publicLink: undefined
            });
          })
          .finally(() => {
            chai.spy.restore();
          });
      });
    });
  });

  describe('createTranscodeJob', () => {
    describe('Fails', () => {
      it('should fail if args are undefined', async () => {
        try {
          await TranscodeController.createTranscodeJob();
          expect.fail('Promise should have been rejected');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an('error');
          expect(e.name).to.be.equal('PayloadError');
          expect(e.message).to.be.equal('Payload invalid: "files" is required');
        }
      });

      it('should ack error if payload undefined but ack and socket are defined', async () => {
        const fakeSocket = makeFakeSocket();
        const [response, fakeAck] = makeFakeAck();

        return TranscodeController.createTranscodeJob(
          undefined,
          fakeAck,
          fakeSocket
        ).then(() => {
          expect(response.value).to.deep.include({
            statusCode: 400,
            errorName: 'PayloadError',
            message: 'Payload invalid: "files" is required'
          });
        });
      });

      it('should ack error if it fails getting a file from storage', async () => {
        const fakeSocket = makeFakeSocket();
        const [response, fakeAck] = makeFakeAck();
        const files = [
          {
            id: '604fd42cbe839f3738dd7831',
            seek: {
              start: 0,
              end: 10
            },
            type: 'podcast-part'
          }
        ];

        mockAxios(false, false);

        return TranscodeController.createTranscodeJob(
          {
            files,
            name: 'test-name',
            jobId: 'C56a418065aa426ca9455fd21deC0538'
          },
          fakeAck,
          fakeSocket
        )
          .then(() => {
            expect(response.value).to.deep.include({
              statusCode: 424,
              errorName: 'StorageServiceError',
              message: 'Failed to fetch a file from storage service'
            });
          })
          .finally(() => {
            chai.spy.restore();
          });
      });

      it('should ack error if it fails saving a craft', async () => {
        const fakeSocket = makeFakeSocket();
        const [response, fakeAck] = makeFakeAck();
        const files = [
          {
            id: objectID().toHexString(),
            seek: {
              start: 0,
              end: 10
            },
            type: 'podcast-part'
          },
          {
            id: objectID().toHexString(),
            seek: {
              start: 0,
              end: 10
            },
            type: 'podcast-part'
          }
        ];

        mockAxios(true, false);

        return TranscodeController.createTranscodeJob(
          {
            files,
            name: 'test-name',
            jobId: 'C56a418065aa426ca9455fd21deC0538'
          },
          fakeAck,
          fakeSocket
        )
          .then(() => {
            expect(response.value).to.deep.include({
              statusCode: 417,
              errorName: 'UploadServiceError',
              message: 'Storage service returned an error'
            });
          })
          .finally(() => {
            chai.spy.restore();
            fs.unlinkSync(path.resolve(`./cache/${files[0].id}`));
            fs.unlinkSync(path.resolve(`./cache/${files[1].id}`));
          });
      });
    });

    describe('Success', () => {
      it('should ack success', async () => {
        const fakeSocket = makeFakeSocket();
        const [response, fakeAck] = makeFakeAck();
        const files = [
          {
            id: objectID().toHexString(),
            seek: {
              start: 0,
              end: 10
            },
            type: 'podcast-part'
          },
          {
            id: objectID().toHexString(),
            seek: {
              start: 0,
              end: 10
            },
            type: 'podcast-part'
          }
        ];

        mockAxios(true, true, true);

        return TranscodeController.createTranscodeJob(
          {
            files,
            name: 'test-name',
            jobId: 'C56a418065aa426ca9455fd21deC0538'
          },
          fakeAck,
          fakeSocket
        )
          .then(() => {
            expect(response.value).to.deep.include({
              statusCode: 200,
              savedCraft: {
                data: {
                  user: '603181b5136eaf770f0949e8',
                  _id: '604ffd4e5e299c61f9df5ff1',
                  name: 'My Craft',
                  jobId: 'f32991eb-f544-40fd-ab24-93ef59ef2524',
                  storageType: 'aws',
                  storagePath: 'crafts/',
                  storageFilename: 'craft.mp3',
                  __v: 0
                },
                meta: {},
                statusCode: 200
              }
            });
          })
          .finally(() => {
            chai.spy.restore();
            fs.unlinkSync(path.resolve(`./cache/${files[0].id}`));
            fs.unlinkSync(path.resolve(`./cache/${files[1].id}`));
          });
      });
    });
  });
});
