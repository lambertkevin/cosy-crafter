import fs from 'fs';
import path from 'path';
import Boom from '@hapi/boom';
import { Readable } from 'stream';
import test from 'aws-sdk/lib/core';
import proxyquire from 'proxyquire';
import { expect, AssertionError } from 'chai';
import storageFactory from '../../src/lib/StorageFactory';
import mockS3 from '../utils/mockS3';

const storages = storageFactory();

describe('StorageFactory unit tests', () => {
  let s3FakeServers;

  before(async () => {
    s3FakeServers = await mockS3();
  });

  after(() => {
    fs.rmdirSync(path.resolve('./bucket/tests/'), { recursive: true });
    s3FakeServers.forEach((s3) => s3.close());
  });

  describe('storagesAvailable', () => {
    it('should have contain local aws and scaleway', () => {
      expect(storages.storagesAvailable)
        .to.be.lengthOf(3)
        .and.to.have.members(['aws', 'scaleway', 'local']);
    });
  });
  describe('setFileFromReadable', () => {
    it("should throw a 503 error if storages don't exist", async () => {
      try {
        await storages.setFileFromReadable(
          ['unkown'],
          fs.createReadStream(path.resolve('./test/files/blank.mp3')),
          'test.mp3'
        );
        expect.fail('Promise should have been rejected');
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }
        expect(e).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(e?.message).to.be.equal('All storage options have failed');
        expect(e?.output?.statusCode).to.be.equal(503);
      }
    });

    it('should throw a 422 error if stream is not a stream', async () => {
      try {
        await storages.setFileFromReadable(['unkown'], 'not-a-stream', 'test.mp3');
        expect.fail('Promise should have been rejected');
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }
        expect(e).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(e?.message).to.be.equal('File is not a stream');
        expect(e?.output?.statusCode).to.be.equal(422);
      }
    });

    it("should use the third storage if the first two doesn't exist", async () => {
      const { storageName, publicLink } = await storages.setFileFromReadable(
        ['unkown', 'not-existing', 'local'],
        fs.createReadStream(path.resolve('./test/files/blank.mp3')),
        'test.mp3'
      );
      expect(storageName).to.be.equal('local');
      expect(publicLink).to.be.equal(undefined);
      expect(fs.existsSync(path.resolve('./bucket/tests/local/test.mp3')));
    });

    it('should use the second storage on 3 if the first fail', async () => {
      const { default: mockedStorageFactory } = proxyquire
        .callThru()
        .load('../../src/lib/StorageFactory.js', {
          '@tweedegolf/storage-abstraction': {
            Storage: ({ endpoint }) => ({
              addFileFromReadable: () => {
                return endpoint === 'http://localhost:4500'
                  ? Promise.resolve()
                  : Promise.reject(new Error('test error'));
              }
            })
          }
        });

      const mockedStorages = mockedStorageFactory();
      const { storageName, publicLink } = await mockedStorages.setFileFromReadable(
        ['aws', 'scaleway', 'local'],
        fs.createReadStream(path.resolve('./test/files/blank.mp3')),
        'test.mp3'
      );
      expect(storageName).to.be.equal('scaleway');
      expect(publicLink).to.be.equal('https://cosy-crafter.s3.fr-par.scw.cloud/test.mp3');
    });
  });
  describe('getFileAsReadable', () => {
    it("should throw a 422 error if storage doesn't exist", async () => {
      try {
        await storages.getFileAsReadable();
        expect.fail('Promise should have been rejected');
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }
        expect(e).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(e?.message).to.be.equal('Storage type not existing');
        expect(e?.output?.statusCode).to.be.equal(422);
      }
    });

    it('should throw a 404 error if filepath is undefined', async () => {
      try {
        await storages.getFileAsReadable('aws');
        expect.fail('Promise should have been rejected');
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }
        expect(e).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(e?.message).to.be.equal('Not Found');
        expect(e?.output?.statusCode).to.be.equal(404);
      }
    });

    it('should throw a 404 error if filename is undefined', async () => {
      try {
        await storages.getFileAsReadable('aws', 'test');
        expect.fail('Promise should have been rejected');
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }
        expect(e).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(e?.message).to.be.equal('Not Found');
        expect(e?.output?.statusCode).to.be.equal(404);
      }
    });

    it("should throw a 404 error if file doesn't exist", async () => {
      try {
        await storages.getFileAsReadable('aws', 'location-not-existing', 'test.mp3');
        expect.fail('Promise should have been rejected');
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }
        expect(e).to.be.an('error').and.to.include({
          statusCode: 404,
          code: 'NotFound'
        });
        expect(e?.name).to.be.equal('NotFound');
      }
    });

    it('should return a stream', async () => {
      await storages.setFileFromReadable(
        ['aws'],
        fs.createReadStream(path.resolve('./test/files/blank.mp3')),
        'location/test.mp3'
      );
      const stream = await storages.getFileAsReadable('aws', 'location', 'test.mp3');
      expect(stream).to.be.an.instanceOf(Readable);
    });
  });
  describe('removeFile', () => {
    it("should throw a 422 error if storage doesn't exist", async () => {
      try {
        await storages.removeFile();
        expect.fail('Promise should have been rejected');
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }
        expect(e).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(e?.message).to.be.equal('Storage type not existing');
        expect(e?.output?.statusCode).to.be.equal(422);
      }
    });

    it('should throw a 404 error if filepath is undefined', async () => {
      try {
        await storages.removeFile('aws');
        expect.fail('Promise should have been rejected');
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }
        expect(e).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(e?.message).to.be.equal('Not Found');
        expect(e?.output?.statusCode).to.be.equal(404);
      }
    });

    it('should throw a 404 error if filename is undefined', async () => {
      try {
        await storages.removeFile('aws', 'test');
        expect.fail('Promise should have been rejected');
      } catch (e) {
        if (e instanceof AssertionError) {
          throw e;
        }
        expect(e).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
        expect(e?.message).to.be.equal('Not Found');
        expect(e?.output?.statusCode).to.be.equal(404);
      }
    });

    it("should not throw if the file doesn't exist", async () => {
      const removed = await storages.removeFile('aws', 'location-not-existing', 'test.mp3');
      expect(removed).to.be.equal('file removed');
    });

    it('should delete a file', async () => {
      await storages.setFileFromReadable(
        ['aws'],
        fs.createReadStream(path.resolve('./test/files/blank.mp3')),
        'location/test.mp3'
      );
      const removed = await storages.removeFile('aws', 'location', 'test.mp3');
      expect(removed).to.be.equal('file removed');
    });
  });
});
