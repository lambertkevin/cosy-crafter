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

describe.only('TokenBlacklistController unit test', () => {
  let mongoServer;
  beforeEach(async () => {
    TokenBlacklistModel._backup = {};
    mongoServer = new MongoMemoryServer();
    const uri = await mongoServer.getUri();
    await mongoose.connect(uri, {
      useCreateIndex: true,
      useFindAndModify: false,
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
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

  it('shoud find 3 unsanitized tokens', async () => {
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
      expect(token.toJSON()).to.have.keys(...hiddenFields);
    });
  });

  it('shoud catch an error', async () => {
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
