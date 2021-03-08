import fs from 'fs';
import path from 'path';
import axios from 'axios';
import spies from 'chai-spies';
import createAxiosError from 'axios/lib/core/createError';
import chai, { AssertionError, expect } from 'chai';
import * as TranscodeController from '../../src/controllers/TransodeController';

chai.use(spies);

describe('Transcode Controller Unit tests', () => {
  describe('getFile', () => {
    describe('Fails', () => {
      it('should fail if file type is unkown', async () => {
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
          expect(e.message).to.be.equal('File Type Error');
        }
      });

      it('should fail if file is not found', async () => {
        const file = {
          id: 'test-id',
          type: 'podcast-part'
        };
        chai.spy.on(axios, 'get', () => {
          const error = createAxiosError('Request failed with status code 404');
          const errorResponse = {
            status: 404,
            statusText: 'Not Found'
          };

          return Promise.reject(
            createAxiosError(error, null, 404, null, errorResponse)
          );
        });

        try {
          await TranscodeController.getFile(file);
          expect.fail('Promise should have failed');
        } catch (e) {
          if (e instanceof AssertionError) {
            throw e;
          }

          expect(e).to.be.an('error');
          expect(e.response).to.deep.include({ status: 404 });
          expect(e.message).to.be.equal(
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
});
