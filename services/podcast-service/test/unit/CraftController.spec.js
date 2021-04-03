/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import Boom from '@hapi/boom';
import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';
import chai, { expect } from 'chai';
import chaiSubset from 'chai-subset';
import MongoMemoryServer from 'mongodb-memory-server';
import * as CraftController from '../../src/controllers/CraftController';
import CraftModel, { hiddenFields } from '../../src/models/CraftModel';

// const resetModuleCache = resnap();
chai.use(chaiSubset);
const mongooseOpts = {
  useCreateIndex: true,
  useFindAndModify: false,
  useNewUrlParser: true,
  useUnifiedTopology: true
};

describe('CraftController unit test', () => {
  describe('find', () => {
    let mongoServer;
    beforeEach(async () => {
      CraftModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      const conn = await mongoose.connect(uri, mongooseOpts);
      delete conn.connections[0].$wasForceClosed;
    });

    afterEach(async () => {
      await mongoose.connection.close(true);
      await mongoServer.stop();
    });

    it('should find no craft', async () => {
      const craft = await CraftController.find();
      expect(craft).to.be.an('array').and.to.be.empty;
    });

    it('should find 3 santized crafts', async () => {
      const fakeCraftsData = [
        {
          name: 'craft-1',
          jobId: uuid(),
          storageType: 'aws',
          storagePath: '/test/',
          storageFilename: 'craft1.mp3'
        },
        {
          name: 'craft-2',
          jobId: uuid(),
          storageType: 'local',
          storagePath: '/test/',
          storageFilename: 'craft2.mp3'
        },
        {
          name: 'craft-3',
          jobId: uuid(),
          storageType: 'scaleway',
          storagePath: '/test/',
          storageFilename: 'craft3.mp3'
        }
      ];
      await Promise.all(fakeCraftsData.map((x) => CraftController.create(x)));

      const crafts = await CraftController.find();

      expect(crafts).to.be.an('array').and.to.have.lengthOf(3);
      expect(crafts).to.containSubset(crafts);

      crafts.forEach((craft) => {
        expect(craft.toJSON()).to.not.have.any.keys(...hiddenFields);
      });
    });

    it('should find 3 unsanitized crafts', async () => {
      const fakeCraftsData = [
        {
          name: 'craft-1',
          jobId: uuid(),
          storageType: 'aws',
          storagePath: '/test/',
          storageFilename: 'craft1.mp3'
        },
        {
          name: 'craft-2',
          jobId: uuid(),
          storageType: 'local',
          storagePath: '/test/',
          storageFilename: 'craft2.mp3'
        },
        {
          name: 'craft-3',
          jobId: uuid(),
          storageType: 'scaleway',
          storagePath: '/test/',
          storageFilename: 'craft3.mp3'
        }
      ];
      await Promise.all(fakeCraftsData.map((x) => CraftController.create(x)));

      const crafts = await CraftController.find(false);

      expect(crafts).to.be.an('array').and.to.have.lengthOf(3);
      expect(crafts).to.containSubset(crafts);

      crafts.forEach((craft) => {
        expect(craft.toJSON()).to.include.keys(...hiddenFields);
      });
    });

    it('should return an error', async () => {
      CraftModel._backup.find = CraftModel.find;
      CraftModel.find = () => ({
        exec: () => Promise.reject(new Error())
      });

      const error = await CraftController.find();
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      CraftModel.find = CraftModel._backup.find;
    });
  });

  describe('findOne', () => {
    let mongoServer;
    beforeEach(async () => {
      CraftModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      const conn = await mongoose.connect(uri, mongooseOpts);
      delete conn.connections[0].$wasForceClosed;
    });

    afterEach(async () => {
      await mongoose.connection.close(true);
      await mongoServer.stop();
    });

    it('should find no craft', async () => {
      const craft = await CraftController.findOne();
      expect(craft).to.be.equal(null);
    });

    it('should find one sanitized craft', async () => {
      const craftData = {
        name: 'craft-1',
        jobId: uuid(),
        storageType: 'aws',
        storagePath: '/test/',
        storageFilename: 'craft1.mp3'
      };
      const { _id: id } = await CraftController.create(craftData);
      const craft = await CraftController.findOne(id);

      expect(craft.toJSON())
        .to.deep.include(_.omit(craftData, hiddenFields))
        .and.to.not.have.any.keys(...hiddenFields);
    });

    it('should find one not sanitized craft', async () => {
      const craftData = {
        name: 'craft-1',
        jobId: uuid(),
        storageType: 'aws',
        storagePath: '/test/',
        storageFilename: 'craft1.mp3'
      };
      const { _id: id } = await CraftController.create(craftData);
      const craft = await CraftController.findOne(id, false);

      expect(craft.toJSON())
        .to.deep.include(_.omit(craftData, hiddenFields))
        .and.to.include.keys(...hiddenFields);
    });

    it('should return an error', async () => {
      CraftModel._backup.findOne = CraftModel.findOne;
      CraftModel.findOne = () => ({
        exec: () => Promise.reject(new Error())
      });

      const error = await CraftController.findOne();
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      CraftModel.findOne = CraftModel._backup.findOne;
    });
  });

  describe('create', () => {
    let mongoServer;
    beforeEach(async () => {
      CraftModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      const conn = await mongoose.connect(uri, mongooseOpts);
      delete conn.connections[0].$wasForceClosed;
    });

    afterEach(async () => {
      await mongoose.connection.close(true);
      await mongoServer.stop();
    });

    it('should create a craft and return it sanitized', async () => {
      const craftData = {
        name: 'craft-1',
        jobId: uuid(),
        storageType: 'aws',
        storagePath: '/test/',
        storageFilename: 'craft1.mp3'
      };
      const craft = await CraftController.create(craftData);

      expect(craft)
        .to.deep.include(_.omit(craftData, hiddenFields))
        .and.to.not.have.any.keys(...hiddenFields);
    });

    it('should create a craft and return it not sanitized', async () => {
      const craftData = {
        name: 'craft-1',
        jobId: uuid(),
        storageType: 'aws',
        storagePath: '/test/',
        storageFilename: 'craft1.mp3'
      };
      const craft = await CraftController.create(craftData, false);

      expect(craft.toJSON())
        .to.deep.include(_.omit(craftData, hiddenFields))
        .and.to.include.keys(...hiddenFields);
    });

    it('should return a verification error', async () => {
      const craftData = {
        name: 'craft-1',
        ip: 123,
        key: '1234'
      };
      const error = await CraftController.create(craftData);
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(409);
    });

    it('should return an error', async () => {
      CraftModel._backup.create = CraftModel.create;
      CraftModel.create = () => Promise.reject(new Error());

      const craftData = {
        name: 'craft-1',
        jobId: uuid(),
        storageType: 'aws',
        storagePath: '/test/',
        storageFilename: 'craft1.mp3'
      };
      const error = await CraftController.create(craftData);
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      CraftModel.create = CraftModel._backup.create;
    });
  });

  describe('update', () => {
    let mongoServer;
    let craftToUpdate;
    beforeEach(async () => {
      CraftModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      const conn = await mongoose.connect(uri, mongooseOpts);
      delete conn.connections[0].$wasForceClosed;
      craftToUpdate = await CraftController.create(
        {
          name: 'craft-1',
          jobId: uuid(),
          storageType: 'aws',
          storagePath: '/test/',
          storageFilename: 'craft1.mp3'
        },
        false
      );
    });

    afterEach(async () => {
      await mongoose.connection.close(true);
      await mongoServer.stop();
    });

    it('should update a craft and return it sanitized', async () => {
      const name = 'craft-2';
      const craft = await CraftController.update(craftToUpdate._id, {
        name
      });

      expect(craft)
        .to.deep.include({ name })
        .and.to.not.have.any.keys(...hiddenFields);
    });

    it('should update a craft jobId', async () => {
      const jobId = uuid();
      const craft = await CraftController.update(
        craftToUpdate._id,
        {
          jobId
        },
        false
      );

      expect(craft.toJSON()).to.include.keys(...hiddenFields);
      expect(craft.jobId).to.not.be.equal(craftToUpdate.jobId);
      expect(craft.jobId).to.be.equal(jobId);
    });

    it('should update a craft and return it not sanitized', async () => {
      const name = 'craft-2';
      const craft = await CraftController.update(
        craftToUpdate._id,
        {
          name
        },
        false
      );

      expect(craft.toJSON())
        .to.deep.include({ name })
        .and.to.include.keys(...hiddenFields);
    });

    it("should return a 404 if the craft doesn't exist", async () => {
      const name = 'craft-2';
      const response = await CraftController.update('605a58c0b6c966ab548da8b1', {
        name
      });

      expect(response).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(response?.output?.statusCode).to.be.equal(404);
    });

    it('should return a verification error', async () => {
      const jobId = 'new-key';
      const error = await CraftController.update(craftToUpdate._id, {
        jobId
      });

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(409);
    });

    it('should return an error', async () => {
      CraftModel._backup.updateOne = CraftModel.updateOne;
      CraftModel.updateOne = () => ({
        exec: () => Promise.reject(new Error())
      });

      const error = await CraftController.update(craftToUpdate._id, {
        name: 'craft-2'
      });

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      CraftModel.updateOne = CraftModel._backup.updateOne;
    });
  });

  describe('remove', () => {
    let mongoServer;
    let craftToDelete;
    beforeEach(async () => {
      CraftModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      const conn = await mongoose.connect(uri, mongooseOpts);
      delete conn.connections[0].$wasForceClosed;
      craftToDelete = await CraftController.create({
        name: 'craft-1',
        jobId: uuid(),
        storageType: 'aws',
        storagePath: '/test/',
        storageFilename: 'craft1.mp3'
      });
    });

    afterEach(async () => {
      await mongoose.connection.close(true);
      await mongoServer.stop();
    });

    it("should return a 404 if craft doesn't exist", async () => {
      const error = await CraftController.remove(['605a56f67ab4c26d4da8ff6b']);

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(404);
    });

    it('should update a craft and return it not sanitized', async () => {
      const response = await CraftController.remove([craftToDelete._id]);
      expect(response).to.deep.include({ deleted: [craftToDelete._id] });
    });

    it('should return an error', async () => {
      CraftModel._backup.deleteMany = CraftModel.deleteMany;
      CraftModel.deleteMany = () => ({
        exec: () => Promise.reject(new Error())
      });

      const error = await CraftController.remove([craftToDelete._id]);

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);
      CraftModel.deleteMany = CraftModel._backup.deleteMany;
    });
  });
});
