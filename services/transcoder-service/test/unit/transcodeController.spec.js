import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import proxyquire from 'proxyquire';
import objectID from 'bson-objectid';
import CustomError from '@cosy/custom-error';
import { AssertionError, expect } from 'chai';
import * as TranscodeController from '../../src/controllers/TranscodeController';
import { getMp3Duration, getMp3ListDuration } from '../../src/utils/Mp3Utils';
import { mockAxiosGet, mockAxiosCreate } from '../utils/AxiosUtils';

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

          expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
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

          expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
          expect(e.name).to.be.equal('FileTypeError');
        }
      });

      it('should fail if file type is unknown', async () => {
        const file = {
          id: 'test-id',
          type: 'unknown-type'
        };

        try {
          await TranscodeController.getFile(file);
          expect.fail('Promise should have failed');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
          expect(e.name).to.be.equal('FileTypeError');
        } finally {
          if (fs.existsSync(path.resolve('./', 'cache', `${file.id}`))) {
            fs.unlinkSync(path.resolve('./', 'cache', `${file.id}`));
          }
        }
      });

      it('should fail if file is not found', async () => {
        const file = {
          id: 'test-id',
          type: 'podcast-part'
        };

        const mockedTranscodeController = proxyquire(
          '../../src/controllers/TranscodeController.js',
          {
            axios: {
              get: mockAxiosGet({ getFileSuccess: false })
            }
          }
        );

        try {
          await mockedTranscodeController.getFile(file);
          expect.fail('Promise should have failed');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
          expect(e.name).to.be.equal('StorageServiceError');
          expect(e.details).to.include({ code: 404 });
          expect(e.details.message).to.be.equal('Error: Request failed with status code 404');
        } finally {
          if (fs.existsSync(path.resolve('./', 'cache', `${file.id}`))) {
            fs.unlinkSync(path.resolve('./', 'cache', `${file.id}`));
          }
        }
      });

      it('should fail if axios throws', async () => {
        const mockedTranscodeController = proxyquire(
          '../../src/controllers/TranscodeController.js',
          {
            axios: {
              get: () => {
                throw new Error('test error');
              }
            }
          }
        );

        try {
          await await mockedTranscodeController.getFile({
            type: 'podcast-part',
            id: 'test'
          });
          expect.fail('Promise should have been rejected');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }
          expect(e).to.be.an('error');
          expect(e?.message).to.be.equal('test error');
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
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      });

      after(async () => {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      });

      it('should succeed getting a file and saving it', async () => {
        const mockedTranscodeController = proxyquire(
          '../../src/controllers/TranscodeController.js',
          {
            axios: {
              get: () =>
                fs.promises.readFile(path.resolve('./test/files/10-seconds-of-silence.mp3'))
            }
          }
        );

        const filepath = await mockedTranscodeController.getFile(file);
        const fileExists = fs.existsSync(filepath);

        expect(fileExists).to.be.equal(true);
      });

      it('should succeed getting a cached file', async () => {
        const mockedTranscodeController = proxyquire(
          '../../src/controllers/TranscodeController.js',
          {
            fs: {
              existsSync: () => true
            }
          }
        );

        const response = await mockedTranscodeController.getFile({
          type: 'podcast-part',
          id: 'test'
        });

        expect(response).to.be.equal(path.resolve('./', 'cache', 'test'));
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
          expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
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
          expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
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
          expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
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
          expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
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
          expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
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
          expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
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
          expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
          expect(e.name).to.be.equal('ValidationError');
          expect(e.message).to.be.equal('"jobId" must be a valid GUID');
        }
      });

      it('should fail if socket is not defined and throw', async () => {
        try {
          await TranscodeController.joinFiles([], 'C56A4180-65AA-42EC-A945-5FD21DEC0538');
          expect.fail('Promise should have been rejected');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }
          expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
          expect(e.name).to.be.equal('ValidationError');
          expect(e.message).to.be.equal('"socket" is required');
        }
      });

      it('should fail if worker send a kill event', async () => {
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
        const fakeSocket = makeFakeSocket(true);

        try {
          await TranscodeController.joinFiles(
            files,
            'C56A4180-65AA-42EC-A945-5FD21DEC0538',
            fakeSocket
          );
          expect.fail('Promise should have been rejected');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }
          expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
          expect(e?.name).to.be.equal('TranscodingKilledError');
          expect(e?.code).to.be.equal(499);
        }
      });

      it('should fail on ffmpeg error', async () => {
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
        const mockedTranscodeController = proxyquire(
          '../../src/controllers/TranscodeController.js',
          {
            'fluent-ffmpeg': () => {
              const instance = ffmpeg();
              setTimeout(() => {
                instance.emit('error', new Error('Error thrown by ffmpeg'));
              }, 50);
              return instance;
            }
          }
        );

        try {
          await mockedTranscodeController.joinFiles(
            files,
            'C56A4180-65AA-42EC-A945-5FD21DEC0538',
            fakeSocket
          );
          expect.fail('Promise should have been rejected');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }
          expect(e).to.be.an('error');
          expect(e?.details?.message).to.be.equal('Error thrown by ffmpeg');
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
          const lastEmit = fakeSocket.responses[fakeSocket.responses.length - 1];
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
            const lastEmit = fakeSocket.responses[fakeSocket.responses.length - 1];
            expect(lastEmit?.payload).to.deep.include({ percent: 100 });
            // Duration should be 22 (10 sec + 10 sec + 10 sec - 2*4 sec of overlapping crossfade)
            expect(Math.round(duration)).to.be.equal(22);
          });
      });

      it('should succeed creating a merge of 2 mp3s with crossfade without specifying seek end', async () => {
        const files = [
          {
            id: '604fd42cbe839f3738dd7831',
            path: path.resolve('./test/files/This_is_a_test_-_voice_1.mp3'),
            type: 'podcast-part',
            seek: {
              start: 0
            }
          },
          {
            id: '604fd42cbe839f3738dd7832',
            path: path.resolve('./test/files/Beat_Thee_-_128Kbps.mp3'),
            type: 'user-input',
            seek: {
              start: 0
            }
          }
        ];
        const fakeSocket = makeFakeSocket();

        return TranscodeController.joinFiles(
          files,
          'C56A4180-65AA-42EC-A945-5FD21DEC0538',
          fakeSocket
        ).then(async (mergedFilePath) => {
          const { duration: supposedDuration } = await getMp3ListDuration([
            path.resolve('./test/files/This_is_a_test_-_voice_1.mp3'),
            path.resolve('./test/files/Beat_Thee_-_128Kbps.mp3')
          ]);
          const mergedDuration = await getMp3Duration(mergedFilePath);
          // supposed duration - 4 seconds of crossfade between the 2 files
          expect(Math.ceil(supposedDuration - 4)).to.be.equal(Math.ceil(mergedDuration));
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

          expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
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

          expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
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

          expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
          expect(e.name).to.be.equal('FileNotFound');
        }
      });

      it('should fail if jobId is undefined', async () => {
        try {
          await TranscodeController.upload(path.resolve('./test/files/10-seconds-of-silence.mp3'));
          expect.fail('Promise should have been rejected');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
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

          expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
          expect(e.name).to.be.equal('JobIdError');
        }
      });

      it('should fail if storage service returns a 404', async () => {
        const mockedTranscodeController = proxyquire(
          '../../src/controllers/TranscodeController.js',
          {
            '@cosy/axios-utils': {
              makeAxiosInstance: mockAxiosCreate({ uploadFileSuccess: false })
            }
          }
        );

        try {
          await mockedTranscodeController.upload(path.resolve('./test/files/'), 'test-id');
          expect.fail('Promise should have been rejected');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }
          expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
          expect(e.name).to.be.equal('UploadServiceError');
          expect(e.details.code).to.be.equal(404);
          expect(e.details.isAxiosError).to.be.equal(true);
        }
      });

      it('should fail if storage service returns an empty savedFile', async () => {
        const mockedTranscodeController = proxyquire(
          '../../src/controllers/TranscodeController.js',
          {
            '@cosy/axios-utils': {
              makeAxiosInstance: mockAxiosCreate({
                uploadFileSuccess: true,
                savedFileEmpty: true
              })
            }
          }
        );

        try {
          await mockedTranscodeController.upload(path.resolve('./test/files/'), 'test-id');
          expect.fail('Promise should have been rejected');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
          expect(e.name).to.be.equal('SaveError');
        }
      });
    });

    describe('Success', () => {
      it('should succeed uploading a craft', async () => {
        const mockedTranscodeController = proxyquire(
          '../../src/controllers/TranscodeController.js',
          {
            '@cosy/axios-utils': {
              makeAxiosInstance: mockAxiosCreate({ uploadFileSuccess: true })
            }
          }
        );

        return mockedTranscodeController
          .upload(path.resolve('./test/files/'), 'test-id')
          .then((response) => {
            expect(response).to.deep.include({
              filename: 'integration-craft-filename.mp3',
              location: 'crafts/integration-craft-filename.mp3',
              storageType: 'local',
              publicLink: undefined
            });
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

          expect(e).to.be.an('error').and.to.be.an.instanceOf(CustomError);
          expect(e.name).to.be.equal('PayloadError');
          expect(e.message).to.be.equal('Payload invalid: "files" is required');
        }
      });

      it('should ack error if payload undefined but ack and socket are defined', async () => {
        const fakeSocket = makeFakeSocket();
        const [response, fakeAck] = makeFakeAck();

        return TranscodeController.createTranscodeJob(undefined, fakeAck, fakeSocket).then(() => {
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

        const mockedTranscodeController = proxyquire(
          '../../src/controllers/TranscodeController.js',
          {
            axios: {
              get: mockAxiosGet({ getFileSuccess: false })
            }
          }
        );

        return mockedTranscodeController
          .createTranscodeJob(
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

        const mockedTranscodeController = proxyquire(
          '../../src/controllers/TranscodeController.js',
          {
            axios: {
              get: mockAxiosGet({ getFileSuccess: true })
            },
            '@cosy/axios-utils': {
              makeAxiosInstance: mockAxiosCreate({ uploadFileSuccess: false })
            }
          }
        );

        return mockedTranscodeController
          .createTranscodeJob(
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
            if (fs.existsSync(path.resolve(`./cache/${files[0].id}`))) {
              fs.unlinkSync(path.resolve(`./cache/${files[0].id}`));
            }
            if (fs.existsSync(path.resolve(`./cache/${files[1].id}`))) {
              fs.unlinkSync(path.resolve(`./cache/${files[1].id}`));
            }
          });
      });

      it('should ack a 500 error if a non CustomError is thrown', async () => {
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

        const mockedTranscodeController = proxyquire(
          '../../src/controllers/TranscodeController.js',
          {
            joi: {
              object: () => {
                throw new Error('Unknown error');
              }
            }
          }
        );

        return mockedTranscodeController
          .createTranscodeJob(
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
              statusCode: 500,
              errorName: 'Error',
              message: 'An error has occured'
            });
          });
      });

      it('should ack error if worker is busy', async () => {
        TranscodeController.setBusyFlag(true);
        const fakeSocket = makeFakeSocket();
        const [response, fakeAck] = makeFakeAck();
        const files = [
          {
            id: '604fd42cbe839f3738dd7831',
            type: 'podcast-part'
          }
        ];

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
              statusCode: 419,
              errorName: 'WorkerBusyError',
              message: 'Resource is busy'
            });
          })
          .finally(() => {
            TranscodeController.setBusyFlag(false);
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

        const mockedTranscodeController = proxyquire(
          '../../src/controllers/TranscodeController.js',
          {
            axios: {
              get: mockAxiosGet({ getFileSuccess: true })
            },
            '@cosy/axios-utils': {
              makeAxiosInstance: mockAxiosCreate({
                uploadFileSuccess: true,
                saveCraftSuccess: true
              })
            }
          }
        );

        return mockedTranscodeController
          .createTranscodeJob(
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
              statusCode: 201,
              data: {
                craftId: '604ffd4e5e299c61f9df5ff1'
              }
            });
          })
          .finally(() => {
            if (fs.existsSync(path.resolve(`./cache/${files[0].id}`))) {
              fs.unlinkSync(path.resolve(`./cache/${files[0].id}`));
            }
            if (fs.existsSync(path.resolve(`./cache/${files[1].id}`))) {
              fs.unlinkSync(path.resolve(`./cache/${files[1].id}`));
            }
          });
      });
    });
  });
});
