/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import Boom from '@hapi/boom';
import mongoose from 'mongoose';
import chai, { expect } from 'chai';
import chaiSubset from 'chai-subset';
import MongoMemoryServer from 'mongodb-memory-server';
import * as PodcastController from '../../src/controllers/PodcastController';
import PodcastModel, { hiddenFields } from '../../src/models/PodcastModel';

// const resetModuleCache = resnap();
chai.use(chaiSubset);
const mongooseOpts = {
  useCreateIndex: true,
  useFindAndModify: false,
  useNewUrlParser: true,
  useUnifiedTopology: true
};

describe('PodcastController unit test', () => {
  describe('find', () => {
    let mongoServer;
    beforeEach(async () => {
      PodcastModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      await mongoose.connect(uri, mongooseOpts);
    });

    afterEach(async () => {
      await mongoServer.stop();
      await mongoose.disconnect();
    });

    it('should find no podcast', async () => {
      const podcast = await PodcastController.find();
      expect(podcast).to.be.an('array').and.to.be.empty;
    });

    it('should find 3 santized podcasts', async () => {
      const fakePodcastsData = [
        {
          name: 'podcast-1',
          edition: 1,
          tags: ['tag1', 'tag2', 'tag3']
        },
        {
          name: 'podcast-2',
          edition: 2,
          tags: ['tag1', 'tag2', 'tag3']
        },
        {
          name: 'podcast-3',
          edition: 3,
          tags: ['tag1', 'tag2', 'tag3']
        }
      ];
      await Promise.all(fakePodcastsData.map((x) => PodcastController.create(x)));

      const podcasts = await PodcastController.find();

      expect(podcasts).to.be.an('array').and.to.have.lengthOf(3);
      expect(podcasts).to.containSubset(podcasts);

      podcasts.forEach((podcast) => {
        expect(podcast.toJSON()).to.not.have.any.keys(...hiddenFields);
      });
    });

    it('should find 3 unsanitized podcasts', async () => {
      const fakePodcastsData = [
        {
          name: 'podcast-1',
          edition: 1,
          tags: ['tag1', 'tag2', 'tag3']
        },
        {
          name: 'podcast-2',
          edition: 2,
          tags: ['tag1', 'tag2', 'tag3']
        },
        {
          name: 'podcast-3',
          edition: 3,
          tags: ['tag1', 'tag2', 'tag3']
        }
      ];
      await Promise.all(fakePodcastsData.map((x) => PodcastController.create(x)));

      const podcasts = await PodcastController.find(false);

      expect(podcasts).to.be.an('array').and.to.have.lengthOf(3);
      expect(podcasts).to.containSubset(podcasts);

      podcasts.forEach((podcast) => {
        expect(podcast.toJSON()).to.include.keys(...hiddenFields);
      });
    });

    it('should return an error', async () => {
      PodcastModel._backup.find = PodcastModel.find;
      PodcastModel.find = () => ({
        populate: () => ({
          exec: () => Promise.reject(new Error())
        })
      });

      const error = await PodcastController.find();
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      PodcastModel.find = PodcastModel._backup.find;
    });
  });

  describe('findOne', () => {
    let mongoServer;
    beforeEach(async () => {
      PodcastModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      await mongoose.connect(uri, mongooseOpts);
    });

    afterEach(async () => {
      await mongoServer.stop();
      await mongoose.disconnect();
    });

    it('should find no podcast', async () => {
      const podcast = await PodcastController.findOne();
      expect(podcast).to.be.equal(null);
    });

    it('should find one sanitized podcast', async () => {
      const podcastData = {
        name: 'podcast-1',
        edition: 1,
        tags: ['tag1', 'tag2', 'tag3']
      };
      const { _id: id } = await PodcastController.create(podcastData);
      const podcast = await PodcastController.findOne(id);

      expect(podcast.toJSON())
        .to.deep.include(_.omit(podcastData, hiddenFields))
        .and.to.not.have.any.keys(...hiddenFields);
    });

    it('should find one not sanitized podcast', async () => {
      const podcastData = {
        name: 'podcast-1',
        edition: 1,
        tags: ['tag1', 'tag2', 'tag3']
      };
      const { _id: id } = await PodcastController.create(podcastData);
      const podcast = await PodcastController.findOne(id, false);

      expect(podcast.toJSON())
        .to.deep.include(_.omit(podcastData, hiddenFields))
        .and.to.include.keys(...hiddenFields);
    });

    it('should return an error', async () => {
      PodcastModel._backup.findOne = PodcastModel.findOne;
      PodcastModel.findOne = () => ({
        populate: () => ({
          exec: () => Promise.reject(new Error())
        })
      });

      const error = await PodcastController.findOne();
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      PodcastModel.findOne = PodcastModel._backup.findOne;
    });
  });

  describe('create', () => {
    let mongoServer;
    beforeEach(async () => {
      PodcastModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      await mongoose.connect(uri, mongooseOpts);
    });

    afterEach(async () => {
      await mongoServer.stop();
      await mongoose.disconnect();
    });

    it('should create a podcast and return it sanitized', async () => {
      const podcastData = {
        name: 'podcast-1',
        edition: 1,
        tags: ['tag1', 'tag2', 'tag3']
      };
      const podcast = await PodcastController.create(podcastData);

      expect(podcast)
        .to.deep.include(_.omit(podcastData, hiddenFields))
        .and.to.not.have.any.keys(...hiddenFields);
    });

    it('should create a podcast and return it not sanitized', async () => {
      const podcastData = {
        name: 'podcast-1',
        edition: 1,
        tags: ['tag1', 'tag2', 'tag3']
      };
      const podcast = await PodcastController.create(podcastData, false);

      expect(podcast.toJSON())
        .to.deep.include(_.omit(podcastData, hiddenFields))
        .and.to.include.keys(...hiddenFields);
    });

    it('should return a verification error', async () => {
      const podcastData = {
        name: 'podcast-1',
        edition: 'abc',
        tags: ['tag1', 'tag2', 'tag3']
      };
      const error = await PodcastController.create(podcastData);
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(409);
    });

    it('should return an error', async () => {
      PodcastModel._backup.create = PodcastModel.create;
      PodcastModel.create = () => Promise.reject(new Error());

      const podcastData = {
        name: 'podcast-1',
        edition: 1,
        tags: ['tag1', 'tag2', 'tag3']
      };
      const error = await PodcastController.create(podcastData);
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      PodcastModel.create = PodcastModel._backup.create;
    });
  });

  describe('update', () => {
    let mongoServer;
    let podcastToUpdate;
    beforeEach(async () => {
      PodcastModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      await mongoose.connect(uri, mongooseOpts);
      podcastToUpdate = await PodcastController.create(
        {
          name: 'podcast-1',
          edition: 1,
          tags: ['tag1', 'tag2', 'tag3']
        },
        false
      );
    });

    afterEach(async () => {
      await mongoServer.stop();
      await mongoose.disconnect();
    });

    it('should update a podcast and return it sanitized', async () => {
      const name = 'podcast-2';
      const podcast = await PodcastController.update(podcastToUpdate._id, {
        name
      });

      expect(podcast)
        .to.deep.include({ name })
        .and.to.not.have.any.keys(...hiddenFields);
    });

    it('should update a podcast edition', async () => {
      const edition = 123;
      const podcast = await PodcastController.update(
        podcastToUpdate._id,
        {
          edition
        },
        false
      );

      expect(podcast.toJSON()).to.include.keys(...hiddenFields);
      expect(podcast.edition).to.not.be.equal(podcastToUpdate.edition);
      expect(podcast.edition).to.be.equal(edition);
    });

    it('should update a podcast and return it not sanitized', async () => {
      const name = 'podcast-2';
      const podcast = await PodcastController.update(
        podcastToUpdate._id,
        {
          name
        },
        false
      );

      expect(podcast.toJSON())
        .to.deep.include({ name })
        .and.to.include.keys(...hiddenFields);
    });

    it("should return a 404 if the podcast doesn't exist", async () => {
      const name = 'podcast-2';
      const response = await PodcastController.update('605a58c0b6c966ab548da8b1', {
        name
      });

      expect(response).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(response?.output?.statusCode).to.be.equal(404);
    });

    it('should return a verification error', async () => {
      const edition = 'new-key';
      const error = await PodcastController.update(podcastToUpdate._id, {
        edition
      });

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(409);
    });

    it('should return an error', async () => {
      PodcastModel._backup.updateOne = PodcastModel.updateOne;
      PodcastModel.updateOne = () => ({
        exec: () => Promise.reject(new Error())
      });

      const error = await PodcastController.update(podcastToUpdate._id, {
        name: 'podcast-2'
      });

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      PodcastModel.updateOne = PodcastModel._backup.updateOne;
    });
  });

  describe('remove', () => {
    let mongoServer;
    let podcastToDelete;
    beforeEach(async () => {
      PodcastModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      await mongoose.connect(uri, mongooseOpts);
      podcastToDelete = await PodcastController.create({
        name: 'podcast-1',
        edition: 1,
        tags: ['tag1', 'tag2', 'tag3']
      });
    });

    afterEach(async () => {
      await mongoServer.stop();
      await mongoose.disconnect();
    });

    it("should return a 404 if podcast doesn't exist", async () => {
      const error = await PodcastController.remove(['605a56f67ab4c26d4da8ff6b']);

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(404);
    });

    it('should update a podcast and return it not sanitized', async () => {
      const response = await PodcastController.remove([podcastToDelete._id]);
      expect(response).to.deep.include({ deleted: [podcastToDelete._id] });
    });

    it('should return an error', async () => {
      PodcastModel._backup.deleteMany = PodcastModel.deleteMany;
      PodcastModel.deleteMany = () => ({
        exec: () => Promise.reject(new Error())
      });

      const error = await PodcastController.remove([podcastToDelete._id]);

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);
      PodcastModel.deleteMany = PodcastModel._backup.deleteMany;
    });
  });
});
