/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import Boom from '@hapi/boom';
import mongoose from 'mongoose';
import chai, { expect } from 'chai';
import chaiSubset from 'chai-subset';
import MongoMemoryServer from 'mongodb-memory-server';
import * as SectionController from '../../src/controllers/SectionController';
import SectionModel, { hiddenFields } from '../../src/models/SectionModel';

// const resetModuleCache = resnap();
chai.use(chaiSubset);
const mongooseOpts = {
  useCreateIndex: true,
  useFindAndModify: false,
  useNewUrlParser: true,
  useUnifiedTopology: true
};

describe('SectionController unit test', () => {
  describe('find', () => {
    let mongoServer;
    beforeEach(async () => {
      SectionModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      await mongoose.connect(uri, mongooseOpts);
    });

    afterEach(async () => {
      await mongoServer.stop();
      await mongoose.disconnect();
    });

    it('should find no section', async () => {
      const section = await SectionController.find();
      expect(section).to.be.an('array').and.to.be.empty;
    });

    it('should find 3 santized sections', async () => {
      const fakeSectionsData = [
        { name: 'section-1' },
        { name: 'section-2' },
        { name: 'section-3' }
      ];
      await Promise.all(fakeSectionsData.map((x) => SectionController.create(x)));

      const sections = await SectionController.find();

      expect(sections).to.be.an('array').and.to.have.lengthOf(3);
      expect(sections).to.containSubset(sections);

      sections.forEach((section) => {
        expect(section.toJSON()).to.not.have.any.keys(...hiddenFields);
      });
    });

    it('should find 3 unsanitized sections', async () => {
      const fakeSectionsData = [
        { name: 'section-1' },
        { name: 'section-2' },
        { name: 'section-3' }
      ];
      await Promise.all(fakeSectionsData.map((x) => SectionController.create(x)));

      const sections = await SectionController.find(false);

      expect(sections).to.be.an('array').and.to.have.lengthOf(3);
      expect(sections).to.containSubset(sections);

      sections.forEach((section) => {
        expect(section.toJSON()).to.include.keys(...hiddenFields);
      });
    });

    it('should return an error', async () => {
      SectionModel._backup.find = SectionModel.find;
      SectionModel.find = () => ({
        exec: () => Promise.reject(new Error())
      });

      const error = await SectionController.find();
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      SectionModel.find = SectionModel._backup.find;
    });
  });

  describe('findOne', () => {
    let mongoServer;
    beforeEach(async () => {
      SectionModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      await mongoose.connect(uri, mongooseOpts);
    });

    afterEach(async () => {
      await mongoServer.stop();
      await mongoose.disconnect();
    });

    it('should find no section', async () => {
      const section = await SectionController.findOne();
      expect(section).to.be.equal(null);
    });

    it('should find one sanitized section', async () => {
      const sectionData = { name: 'section-1' };
      const { _id: id } = await SectionController.create(sectionData);
      const section = await SectionController.findOne(id);

      expect(section.toJSON())
        .to.deep.include(_.omit(sectionData, hiddenFields))
        .and.to.not.have.any.keys(...hiddenFields);
    });

    it('should find one not sanitized section', async () => {
      const sectionData = { name: 'section-1' };
      const { _id: id } = await SectionController.create(sectionData);
      const section = await SectionController.findOne(id, false);

      expect(section.toJSON())
        .to.deep.include(_.omit(sectionData, hiddenFields))
        .and.to.include.keys(...hiddenFields);
    });

    it('should return an error', async () => {
      SectionModel._backup.findOne = SectionModel.findOne;
      SectionModel.findOne = () => ({
        exec: () => Promise.reject(new Error())
      });

      const error = await SectionController.findOne();
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      SectionModel.findOne = SectionModel._backup.findOne;
    });
  });

  describe('create', () => {
    let mongoServer;
    beforeEach(async () => {
      SectionModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      await mongoose.connect(uri, mongooseOpts);
    });

    afterEach(async () => {
      await mongoServer.stop();
      await mongoose.disconnect();
    });

    it('should create a section and return it sanitized', async () => {
      const sectionData = { name: 'section-1' };
      const section = await SectionController.create(sectionData);

      expect(section)
        .to.deep.include(_.omit(sectionData, hiddenFields))
        .and.to.not.have.any.keys(...hiddenFields);
    });

    it('should create a section and return it not sanitized', async () => {
      const sectionData = { name: 'section-1' };
      const section = await SectionController.create(sectionData, false);

      expect(section.toJSON())
        .to.deep.include(_.omit(sectionData, hiddenFields))
        .and.to.include.keys(...hiddenFields);
    });

    it('should return a verification error', async () => {
      const sectionData = { name: {} };
      const error = await SectionController.create(sectionData);
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(409);
    });

    it('should return an error', async () => {
      SectionModel._backup.create = SectionModel.create;
      SectionModel.create = () => Promise.reject(new Error());

      const sectionData = { name: 'section-1' };
      const error = await SectionController.create(sectionData);
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      SectionModel.create = SectionModel._backup.create;
    });
  });

  describe('update', () => {
    let mongoServer;
    let sectionToUpdate;
    beforeEach(async () => {
      SectionModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      await mongoose.connect(uri, mongooseOpts);
      sectionToUpdate = await SectionController.create({ name: 'section-1' }, false);
    });

    afterEach(async () => {
      await mongoServer.stop();
      await mongoose.disconnect();
    });

    it('should update a section and return it sanitized', async () => {
      const name = 'section-2';
      const section = await SectionController.update(sectionToUpdate._id, {
        name
      });

      expect(section)
        .to.deep.include({ name })
        .and.to.not.have.any.keys(...hiddenFields);
    });

    it('should update a section and return it not sanitized', async () => {
      const name = 'section-2';
      const section = await SectionController.update(sectionToUpdate._id, { name }, false);

      expect(section.toJSON())
        .to.deep.include({ name })
        .and.to.include.keys(...hiddenFields);
    });

    it("should return a 404 if the section doesn't exist", async () => {
      const name = 'section-2';
      const response = await SectionController.update('605a58c0b6c966ab548da8b1', {
        name
      });

      expect(response).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(response?.output?.statusCode).to.be.equal(404);
    });

    it('should return a verification error', async () => {
      const name = {};
      const error = await SectionController.update(sectionToUpdate._id, {
        name
      });

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(409);
    });

    it('should return an error', async () => {
      SectionModel._backup.updateOne = SectionModel.updateOne;
      SectionModel.updateOne = () => ({
        exec: () => Promise.reject(new Error())
      });

      const error = await SectionController.update(sectionToUpdate._id, {
        name: 'section-2'
      });

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      SectionModel.updateOne = SectionModel._backup.updateOne;
    });
  });

  describe('remove', () => {
    let mongoServer;
    let sectionToDelete;
    beforeEach(async () => {
      SectionModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      await mongoose.connect(uri, mongooseOpts);
      sectionToDelete = await SectionController.create({ name: 'section-1' });
    });

    afterEach(async () => {
      await mongoServer.stop();
      await mongoose.disconnect();
    });

    it("should return a 404 if section doesn't exist", async () => {
      const error = await SectionController.remove(['605a56f67ab4c26d4da8ff6b']);

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(404);
    });

    it('should update a section and return it not sanitized', async () => {
      const response = await SectionController.remove([sectionToDelete._id]);
      expect(response).to.deep.include({ deleted: [sectionToDelete._id] });
    });

    it('should return an error', async () => {
      SectionModel._backup.deleteMany = SectionModel.deleteMany;
      SectionModel.deleteMany = () => ({
        exec: () => Promise.reject(new Error())
      });

      const error = await SectionController.remove([sectionToDelete._id]);

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);
    });
  });
});
