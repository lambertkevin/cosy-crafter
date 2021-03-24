/* eslint-disable no-unused-expressions */
import Boom from '@hapi/boom';
import chai, { expect } from 'chai';
import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';
import chaiSubset from 'chai-subset';
import MongoMemoryServer from 'mongodb-memory-server';
import * as TokenBlacklistController from '../../src/controllers/TokenBlacklistController';
import TokenBlacklistModel, {
  hiddenFields
} from '../../src/models/TokenBlacklistModel';

chai.use(chaiSubset);
const mongooseOpts = {
  useCreateIndex: true,
  useFindAndModify: false,
  useNewUrlParser: true,
  useUnifiedTopology: true
};

describe('TokenBlacklistController unit test', () => {
  describe('find', () => {
    let mongoServer;
    beforeEach(async () => {
      TokenBlacklistModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      await mongoose.connect(uri, mongooseOpts);
    });

    afterEach(async () => {
      await mongoServer.stop();
      await mongoose.disconnect();
    });

    it('should find no token', async () => {
      const token = await TokenBlacklistController.find();
      expect(token).to.be.an('array').and.to.be.empty;
    });

    it('should find 3 santized tokens', async () => {
      const fakeTokensData = [
        { jwtid: uuid(), type: 'access' },
        { jwtid: uuid(), type: 'refresh' },
        { jwtid: uuid(), type: 'access' }
      ];
      await Promise.all(
        fakeTokensData.map((x) => TokenBlacklistController.create(x))
      );

      const tokens = await TokenBlacklistController.find();

      expect(tokens).to.be.an('array').and.to.have.lengthOf(3);
      expect(tokens).to.containSubset(tokens);

      tokens.forEach((token) => {
        expect(token.toJSON()).to.not.have.any.keys(...hiddenFields);
      });
    });

    it('should find 3 unsanitized tokens', async () => {
      const fakeTokensData = [
        { jwtid: uuid(), type: 'access' },
        { jwtid: uuid(), type: 'refresh' },
        { jwtid: uuid(), type: 'access' }
      ];
      await Promise.all(
        fakeTokensData.map((x) => TokenBlacklistController.create(x))
      );

      const tokens = await TokenBlacklistController.find(false);

      expect(tokens).to.be.an('array').and.to.have.lengthOf(3);
      expect(tokens).to.containSubset(tokens);

      tokens.forEach((token) => {
        expect(token.toJSON()).to.include.keys(...hiddenFields);
      });
    });

    it('should return an error', async () => {
      TokenBlacklistModel._backup.find = TokenBlacklistModel.find;
      TokenBlacklistModel.find = () => ({
        exec: () => Promise.reject(new Error())
      });

      const error = await TokenBlacklistController.find();
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      TokenBlacklistModel.find = TokenBlacklistModel._backup.find;
    });
  });

  describe('findOne', () => {
    let mongoServer;
    beforeEach(async () => {
      TokenBlacklistModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      await mongoose.connect(uri, mongooseOpts);
    });

    afterEach(async () => {
      await mongoServer.stop();
      await mongoose.disconnect();
    });

    it('should find no token', async () => {
      const token = await TokenBlacklistController.findOne();
      expect(token).to.be.equal(null);
    });

    it('should find one sanitized token', async () => {
      const tokenData = { jwtid: uuid(), type: 'access' };
      const { _id: id } = await TokenBlacklistController.create(tokenData);

      const token = await TokenBlacklistController.findOne(id);
      expect(token.toJSON())
        .to.deep.include(tokenData)
        .to.not.have.any.keys(...hiddenFields);
    });

    it('should find one not sanitized token', async () => {
      const tokenData = { jwtid: uuid(), type: 'access' };
      const { _id: id } = await TokenBlacklistController.create(tokenData);

      const token = await TokenBlacklistController.findOne(id, false);
      expect(token.toJSON())
        .to.deep.include(tokenData)
        .to.include.keys(...hiddenFields);
    });

    it('should return an error', async () => {
      TokenBlacklistModel._backup.findOne = TokenBlacklistModel.findOne;
      TokenBlacklistModel.findOne = () => ({
        exec: () => Promise.reject(new Error())
      });

      const error = await TokenBlacklistController.findOne();
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      TokenBlacklistModel.findOne = TokenBlacklistModel._backup.findOne;
    });
  });

  describe('findOneByJwtId', () => {
    let mongoServer;
    beforeEach(async () => {
      TokenBlacklistModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      await mongoose.connect(uri, mongooseOpts);
    });

    afterEach(async () => {
      await mongoServer.stop();
      await mongoose.disconnect();
    });

    it('should find no token', async () => {
      const token = await TokenBlacklistController.findOneByJwtId();
      expect(token).to.be.equal(null);
    });

    it('should find one sanitized token by its jwtId', async () => {
      const tokenData = { jwtid: uuid(), type: 'access' };
      const { jwtid } = await TokenBlacklistController.create(tokenData);

      const token = await TokenBlacklistController.findOneByJwtId(jwtid);
      expect(token.toJSON())
        .to.deep.include(tokenData)
        .to.not.have.any.keys(...hiddenFields);
    });

    it('should find one not sanitized token', async () => {
      const tokenData = { jwtid: uuid(), type: 'access' };
      const { jwtid } = await TokenBlacklistController.create(tokenData);

      const token = await TokenBlacklistController.findOneByJwtId(jwtid, false);
      expect(token.toJSON())
        .to.deep.include(tokenData)
        .to.include.keys(...hiddenFields);
    });

    it('should return an error', async () => {
      TokenBlacklistModel._backup.findOne = TokenBlacklistModel.findOne;
      TokenBlacklistModel.findOne = () => ({
        exec: () => Promise.reject(new Error())
      });

      const error = await TokenBlacklistController.findOneByJwtId();
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      TokenBlacklistModel.findOne = TokenBlacklistModel._backup.findOne;
    });
  });

  describe('create', () => {
    let mongoServer;
    beforeEach(async () => {
      TokenBlacklistModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      await mongoose.connect(uri, mongooseOpts);
    });

    afterEach(async () => {
      await mongoServer.stop();
      await mongoose.disconnect();
    });

    it('should create a token and return it sanitized', async () => {
      const tokenData = { jwtid: uuid(), type: 'access' };
      const token = await TokenBlacklistController.create(tokenData);

      expect(token)
        .to.deep.include(tokenData)
        .and.to.not.have.any.keys(...hiddenFields);
    });

    it('should create a token and return it not sanitized', async () => {
      const tokenData = { jwtid: uuid(), type: 'access' };
      const token = await TokenBlacklistController.create(tokenData, false);

      expect(token.toJSON())
        .to.deep.include(tokenData)
        .and.to.include.keys(...hiddenFields);
    });

    it('should return a verification error', async () => {
      const tokenData = { jwtid: '123', type: 'access' };

      const error = await TokenBlacklistController.create(tokenData);
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(409);
    });

    it('should return an error', async () => {
      TokenBlacklistModel._backup.create = TokenBlacklistModel.create;
      TokenBlacklistModel.create = () => Promise.reject(new Error());

      const tokenData = { jwtid: uuid(), type: 'access' };
      const error = await TokenBlacklistController.create(tokenData);
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      TokenBlacklistModel.create = TokenBlacklistModel._backup.create;
    });
  });

  describe('update', () => {
    let mongoServer;
    let tokenToUpdate;
    beforeEach(async () => {
      TokenBlacklistModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      await mongoose.connect(uri, mongooseOpts);
      tokenToUpdate = await TokenBlacklistController.create({
        jwtid: uuid(),
        type: 'access'
      });
    });

    afterEach(async () => {
      await mongoServer.stop();
      await mongoose.disconnect();
    });

    it('should update a token and return it sanitized', async () => {
      const jwtid = uuid();
      const token = await TokenBlacklistController.update(tokenToUpdate._id, {
        jwtid
      });

      expect(token)
        .to.deep.include({ jwtid })
        .and.to.not.have.any.keys(...hiddenFields);
    });

    it('should update a token and return it not sanitized', async () => {
      const jwtid = uuid();
      const token = await TokenBlacklistController.update(
        tokenToUpdate._id,
        {
          jwtid
        },
        false
      );

      expect(token.toJSON())
        .to.deep.include({ jwtid })
        .and.to.include.keys(...hiddenFields);
    });

    it("should return a 404 if the token doesn't exist", async () => {
      const jwtid = uuid();
      const response = await TokenBlacklistController.update(
        '605a58c0b6c966ab548da8b1',
        {
          jwtid
        }
      );

      expect(response).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(response?.output?.statusCode).to.be.equal(404);
    });

    it('should return a verification error', async () => {
      const jwtid = '123';
      const error = await TokenBlacklistController.update(tokenToUpdate._id, {
        jwtid
      });

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(409);
    });

    it('should return an error', async () => {
      TokenBlacklistModel._backup.updateOne = TokenBlacklistModel.updateOne;
      TokenBlacklistModel.updateOne = () => ({
        exec: () => Promise.reject(new Error())
      });

      const error = await TokenBlacklistController.update(tokenToUpdate._id, {
        jwtid: '123'
      });

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      TokenBlacklistModel.updateOne = TokenBlacklistModel._backup.updateOne;
    });
  });

  describe('remove', () => {
    let mongoServer;
    let tokenToDelete;
    beforeEach(async () => {
      TokenBlacklistModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      await mongoose.connect(uri, mongooseOpts);
      tokenToDelete = await TokenBlacklistController.create({
        jwtid: uuid(),
        type: 'access'
      });
    });

    afterEach(async () => {
      await mongoServer.stop();
      await mongoose.disconnect();
    });

    it("should return a 404 if token doesn't exist", async () => {
      const error = await TokenBlacklistController.remove([
        '605a56f67ab4c26d4da8ff6b'
      ]);

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(404);
    });

    it('should update a token and return it not sanitized', async () => {
      const response = await TokenBlacklistController.remove([
        tokenToDelete._id
      ]);

      expect(response).to.deep.include({ deleted: [tokenToDelete._id] });
    });

    it('should return an error', async () => {
      TokenBlacklistModel._backup.deleteMany = TokenBlacklistModel.deleteMany;
      TokenBlacklistModel.deleteMany = () => ({
        exec: () => Promise.reject(new Error())
      });

      const error = await TokenBlacklistController.remove([tokenToDelete._id]);

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      TokenBlacklistModel.deleteMany = TokenBlacklistModel._backup.deleteMany;
    });
  });
});
