/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import path from 'path';
import resnap from 'resnap';
import Boom from '@hapi/boom';
import mongoose from 'mongoose';
import proxyquire from 'proxyquire';
import chai, { expect } from 'chai';
import chaiSubset from 'chai-subset';
import MongoMemoryServer from 'mongodb-memory-server';
import createAxiosError from 'axios/lib/core/createError';
import * as PartController from '../../src/controllers/PartController';
import { create as createSection } from '../../src/controllers/SectionController';
import { create as createPodcast } from '../../src/controllers/PodcastController';
import PartModel, { hiddenFields } from '../../src/models/PartModel';
import PodcastModel from '../../src/models/PodcastModel';

const resetModuleCache = resnap();
chai.use(chaiSubset);
const mongooseOpts = {
  useCreateIndex: true,
  useFindAndModify: false,
  useNewUrlParser: true,
  useUnifiedTopology: true
};

const changeEnv = (newEnv) => {
  const oldEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = newEnv;

  return () => {
    process.env.NODE_ENV = oldEnv;
  };
};

describe('PartController unit test', () => {
  const file = {
    headers: { 'content-type': 'audio/mpeg' },
    filename: 'blank.mp3',
    path: path.resolve('../files/blank.mp3')
  };
  let section;
  let podcast;
  describe('find', () => {
    let mongoServer;
    beforeEach(async () => {
      PartModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      const conn = await mongoose.connect(uri, mongooseOpts);
      delete conn.connections[0].$wasForceClosed;
      section = await createSection({ name: 'section-test ' });
      podcast = await createPodcast({ name: 'podcast-test', edition: 12 });
    });

    afterEach(async () => {
      await mongoose.connection.close(true);
      await mongoServer.stop();
    });

    it('should find no part', async () => {
      const part = await PartController.find();
      expect(part).to.be.an('array').and.to.be.empty;
    });

    it('should find 3 santized parts', async () => {
      const fakePartsData = [
        {
          name: 'part-1',
          section: section._id,
          podcast: podcast._id,
          tags: ['tag1'],
          file
        },
        {
          name: 'part-2',
          section: section._id,
          podcast: podcast._id,
          tags: ['tag1'],
          file
        },
        {
          name: 'part-3',
          section: section._id,
          podcast: podcast._id,
          tags: ['tag1'],
          file
        }
      ];
      await Promise.all(fakePartsData.map((x) => PartController.create(x)));

      const parts = await PartController.find();

      expect(parts).to.be.an('array').and.to.have.lengthOf(3);
      expect(parts).to.containSubset(parts);

      parts.forEach((part) => {
        expect(part.toJSON()).to.not.have.any.keys(...hiddenFields);
      });
    });

    it('should find 3 unsanitized parts', async () => {
      const fakePartsData = [
        {
          name: 'part-1',
          section: section._id,
          podcast: podcast._id,
          tags: ['tag1'],
          file
        },
        {
          name: 'part-2',
          section: section._id,
          podcast: podcast._id,
          tags: ['tag1'],
          file
        },
        {
          name: 'part-3',
          section: section._id,
          podcast: podcast._id,
          tags: ['tag1'],
          file
        }
      ];
      await Promise.all(fakePartsData.map((x) => PartController.create(x)));

      const parts = await PartController.find(false);

      expect(parts).to.be.an('array').and.to.have.lengthOf(3);
      expect(parts).to.containSubset(parts);

      parts.forEach((part) => {
        expect(part.toJSON()).to.include.keys(...hiddenFields);
      });
    });

    it('should return an error', async () => {
      PartModel._backup.find = PartModel.find;
      PartModel.find = () => ({
        populate: () => ({
          populate: () => ({
            exec: () => Promise.reject(new Error())
          })
        })
      });

      const error = await PartController.find();
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      PartModel.find = PartModel._backup.find;
    });
  });

  describe('findOne', () => {
    let mongoServer;
    beforeEach(async () => {
      PartModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      const conn = await mongoose.connect(uri, mongooseOpts);
      delete conn.connections[0].$wasForceClosed;
      section = await createSection({ name: 'section-test ' });
      podcast = await createPodcast({ name: 'podcast-test', edition: 12 });
    });

    afterEach(async () => {
      await mongoose.connection.close(true);
      await mongoServer.stop();
    });

    it('should find no part', async () => {
      const part = await PartController.findOne();
      expect(part).to.be.equal(null);
    });

    it('should find one sanitized part', async () => {
      const partData = {
        name: 'part-1',
        section: section._id,
        podcast: podcast._id,
        tags: ['tag1'],
        file
      };
      const { _id: id } = await PartController.create(partData);
      const part = await PartController.findOne(id);

      partData.section = section;
      partData.podcast = podcast;
      delete partData.podcast.parts;
      delete partData.file;

      expect(part.toJSON())
        .to.deep.include(_.omit(partData, hiddenFields))
        .and.to.not.have.any.keys(...hiddenFields);
    });

    it('should find one not sanitized part', async () => {
      const partData = {
        name: 'part-1',
        section: section._id,
        podcast: podcast._id,
        tags: ['tag1'],
        file
      };
      const { _id: id } = await PartController.create(partData);
      const part = await PartController.findOne(id, false);

      partData.section = section;
      partData.podcast = podcast;
      delete partData.podcast.parts;
      delete partData.file;

      expect(part.toJSON())
        .to.deep.include(_.omit(partData, hiddenFields))
        .and.to.include.keys(...hiddenFields);
    });

    it('should return an error', async () => {
      PartModel._backup.findOne = PartModel.findOne;
      PartModel.findOne = () => ({
        populate: () => ({
          populate: () => ({
            exec: () => Promise.reject(new Error())
          })
        })
      });

      const error = await PartController.findOne();
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      PartModel.findOne = PartModel._backup.findOne;
    });
  });

  describe('create', () => {
    let mongoServer;
    beforeEach(async () => {
      PartModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      const conn = await mongoose.connect(uri, mongooseOpts);
      delete conn.connections[0].$wasForceClosed;
      section = await createSection({ name: 'section-test ' });
      podcast = await createPodcast({ name: 'podcast-test', edition: 12 });
    });

    afterEach(async () => {
      await mongoose.connection.close(true);
      await mongoServer.stop();
    });

    it('should create a part and return it sanitized', async () => {
      const partData = {
        name: 'part-1',
        section: section._id,
        podcast: podcast._id,
        tags: ['tag1'],
        file
      };
      const part = await PartController.create(partData);

      delete partData.file;

      expect(part)
        .to.deep.include(_.omit(partData, hiddenFields))
        .and.to.not.have.any.keys(...hiddenFields);
    });

    it('should create a part without tags and return it sanitized', async () => {
      const partData = {
        name: 'part-1',
        section: section._id,
        podcast: podcast._id,
        file
      };
      const part = await PartController.create(partData);

      delete partData.file;

      expect(part)
        .to.deep.include(_.omit(partData, hiddenFields))
        .and.to.not.have.any.keys(...hiddenFields);
    });

    it('should create a part and return it not sanitized', async () => {
      const partData = {
        name: 'part-1',
        section: section._id,
        podcast: podcast._id,
        tags: ['tag1'],
        file
      };
      const part = await PartController.create(partData, false);
      delete partData.file;

      expect(part.toJSON())
        .to.deep.include(_.omit(partData, hiddenFields))
        .and.to.include.keys(...hiddenFields);
    });

    it("should return a 406 if depencies doesn't exist", async () => {
      const partData = {
        name: 'part-1',
        section: '605bb3919ebb3d825e935e0c',
        podcast: podcast._id,
        tags: ['tag1'],
        file
      };
      const error = await PartController.create(partData);

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(406);
    });

    it('should return a verification error', async () => {
      const partData = {
        name: {},
        section: section._id,
        podcast: podcast._id,
        tags: ['tag1'],
        file
      };
      const error = await PartController.create(partData);
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(409);
    });

    it('should return an error', async () => {
      PartModel._backup.create = PartModel.create;
      PartModel.create = () => Promise.reject(new Error());

      const partData = {
        name: 'part-1',
        section: section._id,
        podcast: podcast._id,
        tags: ['tag1'],
        file
      };
      const error = await PartController.create(partData);
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      PartModel.create = PartModel._backup.create;
    });

    it('should return a 410 error if podcast cannot be updated with the id of the part as post validate hook', async () => {
      const oldFindOneAndUpdate = PodcastModel.findOneAndUpdate;
      PodcastModel.findOneAndUpdate = () => {
        throw new Error();
      };
      const partData = {
        name: 'part-1',
        section: section._id,
        podcast: podcast._id,
        tags: ['tag1'],
        file
      };
      const error = await PartController.create(partData);

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(410);
      PodcastModel.findOneAndUpdate = oldFindOneAndUpdate;
    });

    it('should return a 503 error due to dependencies failing', async () => {
      resetModuleCache();
      const partData = {
        name: 'part-1',
        section: section._id,
        podcast: podcast._id,
        tags: ['tag1'],
        file
      };
      const { create } = proxyquire('../../src/controllers/PartController.js', {
        './PodcastController': {
          findOne: () => Promise.reject(Boom.badImplementation())
        }
      });
      const error = await create(partData);
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(503);
    });

    it('should return a 404 error due to storage', async () => {
      resetModuleCache();
      const partData = {
        name: 'part-1',
        section: section._id,
        podcast: podcast._id,
        tags: ['tag1'],
        file
      };

      const restoreEnv = changeEnv('development');
      const { create } = proxyquire('../../src/controllers/PartController.js', {
        '@cosy/axios-utils': {
          makeAxiosInstance: () => ({
            post: () => Promise.reject(new Error())
          })
        }
      });
      const error = await create(partData);
      restoreEnv();

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);
    });

    it('should return a 418 error due to storage', async () => {
      resetModuleCache();
      const partData = {
        name: 'part-1',
        section: section._id,
        podcast: podcast._id,
        tags: ['tag1'],
        file
      };

      const restoreEnv = changeEnv('development');
      const { create } = proxyquire('../../src/controllers/PartController.js', {
        '@cosy/axios-utils': {
          makeAxiosInstance: () => ({
            post: () => {
              const error = createAxiosError("I'm a tea pot");
              const errorResponse = {
                statusCode: 418,
                data: {
                  statusCode: 418,
                  message: "I'm a tea pot"
                }
              };
              return Promise.reject(createAxiosError(error, null, 418, null, errorResponse));
            }
          })
        }
      });
      const error = await create(partData);
      restoreEnv();

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(418);
    });

    it('should return a 503 due to storage returning empty data', async () => {
      resetModuleCache();
      const partData = {
        name: 'part-1',
        section: section._id,
        podcast: podcast._id,
        tags: ['tag1'],
        file
      };

      const restoreEnv = changeEnv('development');
      const { create } = proxyquire('../../src/controllers/PartController.js', {
        '@cosy/axios-utils': {
          makeAxiosInstance: () => ({
            post: () =>
              Promise.resolve({
                data: {
                  data: {}
                }
              })
          })
        }
      });
      const error = await create(partData);
      restoreEnv();

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(503);
    });
  });

  describe('update', () => {
    let mongoServer;
    let partToUpdate;
    beforeEach(async () => {
      PartModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      const conn = await mongoose.connect(uri, mongooseOpts);
      delete conn.connections[0].$wasForceClosed;
      section = await createSection({ name: 'section-test' });
      podcast = await createPodcast({ name: 'podcast-test', edition: 12 });
      partToUpdate = await PartController.create(
        {
          name: 'part-1',
          section: section._id,
          podcast: podcast._id,
          tags: ['tag1'],
          file
        },
        false
      );
    });

    afterEach(async () => {
      await mongoose.connection.close(true);
      await mongoServer.stop();
    });

    it('should update a part and return it sanitized', async () => {
      const name = 'part-2';
      const part = await PartController.update(partToUpdate._id, {
        name
      });
      expect(part)
        .to.deep.include({ name })
        .and.to.not.have.any.keys(...hiddenFields);
    });

    it('should update a part and return it not sanitized', async () => {
      const name = 'part-2';
      const part = await PartController.update(partToUpdate._id, { name }, false);

      expect(part.toJSON())
        .to.deep.include({ name })
        .and.to.include.keys(...hiddenFields);
    });

    it("should update a part's tags from string", async () => {
      const tags = 'new-tag, new-tag-2';
      const part = await PartController.update(partToUpdate._id, {
        tags
      });

      expect(part)
        .to.deep.include({ tags: tags.split(',').map((x) => x.trim()) })
        .and.to.not.have.any.keys(...hiddenFields);
    });

    it("should update a part's tags from string", async () => {
      const tags = ['new-tag-3', 'new-tag-4'];
      const part = await PartController.update(partToUpdate._id, {
        tags
      });

      expect(part)
        .to.deep.include({ tags })
        .and.to.not.have.any.keys(...hiddenFields);
    });

    it("should update a part's section from string", async () => {
      const section2 = await createSection({ name: 'section-test-2' });
      const part = await PartController.update(partToUpdate._id, {
        section: section2._id
      });

      expect(part).to.not.have.any.keys(...hiddenFields);
      expect(part?.section).to.deep.include({
        _id: section2._id
      });
    });

    it("should update a part's podcast from string", async () => {
      const podcast2 = await createPodcast({ name: 'podcast-test-2', edition: 14 });
      const part = await PartController.update(partToUpdate._id, {
        podcast: podcast2._id
      });

      expect(part).to.not.have.any.keys(...hiddenFields);
      expect(part?.podcast).to.deep.include({
        _id: podcast2._id
      });
    });

    it("should update a part's file", async () => {
      const file2 = {
        headers: { 'content-type': 'audio/mpeg' },
        filename: 'blank2.mp3',
        path: path.resolve('../files/blank2.mp3')
      };

      const part = await PartController.update(
        partToUpdate._id,
        {
          file: file2
        },
        false
      );

      expect(part?.originalFilename).to.be.equal(file2.filename);
    });

    it("should update a part's file and old file deletion works", async () => {
      const file2 = {
        headers: { 'content-type': 'audio/mpeg' },
        filename: 'blank2.mp3',
        path: path.resolve('../files/blank2.mp3')
      };

      const restoreEnv = changeEnv('development');
      const { update } = proxyquire('../../src/controllers/PartController.js', {
        '@cosy/axios-utils': {
          makeAxiosInstance: () => ({
            delete: () => Promise.resolve(),
            post: () =>
              Promise.resolve({
                data: {
                  data: {
                    storageType: 'local',
                    location: 'integration-test',
                    filename: 'integration-test.mp3',
                    publicLink: 'integration-test'
                  }
                }
              })
          })
        }
      });
      const part = await update(
        partToUpdate._id,
        {
          file: file2
        },
        false
      );
      restoreEnv();

      expect(part).to.not.be.an('error');
      expect(part?.originalFilename).to.be.equal(file2.filename);
    });

    it("should update a part's file and old file deletion doesn't work", async () => {
      const file2 = {
        headers: { 'content-type': 'audio/mpeg' },
        filename: 'blank2.mp3',
        path: path.resolve('../files/blank2.mp3')
      };

      const restoreEnv = changeEnv('development');
      const { update } = proxyquire('../../src/controllers/PartController.js', {
        '@cosy/axios-utils': {
          makeAxiosInstance: () => ({
            delete: () => Promise.reject(),
            post: () =>
              Promise.resolve({
                data: {
                  data: {
                    storageType: 'local',
                    location: 'integration-test',
                    filename: 'integration-test.mp3',
                    publicLink: 'integration-test'
                  }
                }
              })
          })
        }
      });
      const part = await update(
        partToUpdate._id,
        {
          file: file2
        },
        false
      );
      restoreEnv();

      expect(part).to.not.be.an('error');
      expect(part?.originalFilename).to.be.equal(file2.filename);
    });

    it("should return a 500 error if part's file post throws", async () => {
      const file2 = {
        headers: { 'content-type': 'audio/mpeg' },
        filename: 'blank2.mp3',
        path: path.resolve('../files/blank2.mp3')
      };

      const restoreEnv = changeEnv('development');
      const { update } = proxyquire('../../src/controllers/PartController.js', {
        '@cosy/axios-utils': {
          makeAxiosInstance: () => ({
            delete: () => Promise.reject(),
            post: () => Promise.reject(new Error())
          })
        }
      });
      const error = await update(
        partToUpdate._id,
        {
          file: file2
        },
        false
      );
      restoreEnv();

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);
    });

    it('should return a 417 error with an empty update payload', async () => {
      const error = await PartController.update(partToUpdate._id);
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(417);
    });

    it('should return a 500 error if Part model fails', async () => {
      PartModel._backup.findById = PartModel.findById;
      PartModel.findById = () => Promise.reject(new Error());

      const error = await PartController.update(partToUpdate._id, { name: 'test ' });
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      PartModel.findById = PartModel._backup.findById;
    });

    it("should return error if podcast doesn't exist", async () => {
      const error = await PartController.update(partToUpdate._id, {
        podcast: '605b9d99168b72e9878f0891'
      });

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(406);
    });

    it("should return error if section doesn't exist", async () => {
      const error = await PartController.update(partToUpdate._id, {
        section: '605b9d99168b72e9878f0891'
      });

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(406);
    });

    it("should return a 404 if the part doesn't exist", async () => {
      const name = 'part-2';
      const response = await PartController.update('605a58c0b6c966ab548da8b1', {
        name
      });

      expect(response).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(response?.output?.statusCode).to.be.equal(404);
    });

    it('should return a verification error', async () => {
      const name = {};
      const error = await PartController.update(partToUpdate._id, {
        name
      });

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(409);
    });

    it('should return an error', async () => {
      PartModel._backup.updateOne = PartModel.updateOne;
      PartModel.updateOne = () => ({
        exec: () => Promise.reject(new Error())
      });

      const error = await PartController.update(partToUpdate._id, {
        name: 'part-2'
      });

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      PartModel.updateOne = PartModel._backup.updateOne;
    });
  });

  describe('remove', () => {
    let mongoServer;
    let partToDelete;
    beforeEach(async () => {
      PartModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      const conn = await mongoose.connect(uri, mongooseOpts);
      delete conn.connections[0].$wasForceClosed;
      section = await createSection({ name: 'section-test' });
      podcast = await createPodcast({ name: 'podcast-test', edition: 12 });
      partToDelete = await PartController.create({
        name: 'part-1',
        section: section._id,
        podcast: podcast._id,
        tags: ['tag1'],
        file
      });
    });

    afterEach(async () => {
      await mongoose.connection.close(true);
      await mongoServer.stop();
    });

    it("should return a 404 if part doesn't exist", async () => {
      const error = await PartController.remove(['605a56f67ab4c26d4da8ff6b']);

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(404);
    });

    it('should update a part and return it not sanitized', async () => {
      const response = await PartController.remove([partToDelete._id]);
      expect(response).to.deep.include({ deleted: [partToDelete._id] });
    });

    it('should return an error', async () => {
      PartModel._backup.deleteMany = PartModel.deleteMany;
      PartModel.deleteMany = () => ({
        exec: () => Promise.reject(new Error())
      });

      const error = await PartController.remove([partToDelete._id]);

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);
      PartModel.deleteMany = PartModel._backup.deleteMany;
    });
  });
});
