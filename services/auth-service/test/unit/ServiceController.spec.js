/* eslint-disable no-unused-expressions */
import resnap from 'resnap';
import Boom from '@hapi/boom';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import proxyquire from 'proxyquire';
import chai, { expect } from 'chai';
import chaiSubset from 'chai-subset';
import MongoMemoryServer from 'mongodb-memory-server';
import * as ServiceController from '../../src/controllers/ServiceController';
import ServiceModel, { hiddenFields } from '../../src/models/ServiceModel';
import { accessTokenFactory, refreshTokenFactory } from '../../src/utils/TokensFactory';

const resetModuleCache = resnap();
chai.use(chaiSubset);
const mongooseOpts = {
  useCreateIndex: true,
  useFindAndModify: false,
  useNewUrlParser: true,
  useUnifiedTopology: true
};

describe('ServiceController unit test', () => {
  describe('find', () => {
    let mongoServer;
    beforeEach(async () => {
      ServiceModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      await mongoose.connect(uri, mongooseOpts);
    });

    afterEach(async () => {
      await mongoServer.stop();
      await mongoose.disconnect();
    });

    it('should find no service', async () => {
      const service = await ServiceController.find();
      expect(service).to.be.an('array').and.to.be.empty;
    });

    it('should find 3 santized services', async () => {
      const fakeServicesData = [
        { identifier: 'service-1', ip: 'private', key: '1234' },
        { identifier: 'service-2', ip: '192.168.1.1', key: '5678' },
        { identifier: 'service-3', ip: '192.168.1.2', key: '91011' }
      ];
      await Promise.all(fakeServicesData.map((x) => ServiceController.create(x)));

      const services = await ServiceController.find();

      expect(services).to.be.an('array').and.to.have.lengthOf(3);
      expect(services).to.containSubset(services);

      services.forEach((service) => {
        expect(service.toJSON()).to.not.have.any.keys(...hiddenFields);
      });
    });

    it('should find 3 unsanitized services', async () => {
      const fakeServicesData = [
        { identifier: 'service-1', ip: 'private', key: '1234' },
        { identifier: 'service-2', ip: '192.168.1.1', key: '5678' },
        { identifier: 'service-3', ip: '192.168.1.2', key: '91011' }
      ];
      await Promise.all(fakeServicesData.map((x) => ServiceController.create(x)));

      const services = await ServiceController.find(false);

      expect(services).to.be.an('array').and.to.have.lengthOf(3);
      expect(services).to.containSubset(services);

      services.forEach((service) => {
        expect(service.toJSON()).to.include.keys(...hiddenFields);
      });
    });

    it('should return an error', async () => {
      ServiceModel._backup.find = ServiceModel.find;
      ServiceModel.find = () => ({
        exec: () => Promise.reject(new Error())
      });

      const error = await ServiceController.find();
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      ServiceModel.find = ServiceModel._backup.find;
    });
  });

  describe('findOne', () => {
    let mongoServer;
    beforeEach(async () => {
      ServiceModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      await mongoose.connect(uri, mongooseOpts);
    });

    afterEach(async () => {
      await mongoServer.stop();
      await mongoose.disconnect();
    });

    it('should find no service', async () => {
      const service = await ServiceController.findOne();
      expect(service).to.be.equal(null);
    });

    it('should find one sanitized service', async () => {
      const serviceData = {
        identifier: 'service-1',
        ip: 'private',
        key: '1234'
      };
      const { _id: id } = await ServiceController.create(serviceData);
      const service = await ServiceController.findOne(id);

      delete serviceData.key;

      expect(service.toJSON())
        .to.deep.include(serviceData)
        .and.to.have.key('key')
        .and.to.not.have.any.keys(...hiddenFields);
    });

    it('should find one not sanitized service', async () => {
      const serviceData = {
        identifier: 'service-1',
        ip: 'private',
        key: '1234'
      };
      const { _id: id } = await ServiceController.create(serviceData);
      const service = await ServiceController.findOne(id, false);

      delete serviceData.key;

      expect(service.toJSON())
        .to.deep.include(serviceData)
        .and.to.have.key('key')
        .and.to.include.keys(...hiddenFields);
    });

    it('should return an error', async () => {
      ServiceModel._backup.findOne = ServiceModel.findOne;
      ServiceModel.findOne = () => ({
        exec: () => Promise.reject(new Error())
      });

      const error = await ServiceController.findOne();
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      ServiceModel.findOne = ServiceModel._backup.findOne;
    });
  });

  describe('findOneByIndentifier', () => {
    let mongoServer;
    beforeEach(async () => {
      ServiceModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      await mongoose.connect(uri, mongooseOpts);
    });

    afterEach(async () => {
      await mongoServer.stop();
      await mongoose.disconnect();
    });

    it('should find no service', async () => {
      const service = await ServiceController.findOneByIndentifier();
      expect(service).to.be.equal(null);
    });

    it('should find one sanitized service by its jwtId', async () => {
      const serviceData = {
        identifier: 'service-1',
        ip: 'private',
        key: '1234'
      };
      const { identifier } = await ServiceController.create(serviceData);
      const service = await ServiceController.findOneByIndentifier(identifier);

      delete serviceData.key;

      expect(service.toJSON())
        .to.deep.include(serviceData)
        .and.to.have.key('key')
        .and.to.not.have.any.keys(...hiddenFields);
    });

    it('should find one not sanitized service', async () => {
      const serviceData = {
        identifier: 'service-1',
        ip: 'private',
        key: '1234'
      };

      const { identifier } = await ServiceController.create(serviceData);
      const service = await ServiceController.findOneByIndentifier(identifier, false);

      delete serviceData.key;

      expect(service.toJSON())
        .to.deep.include(serviceData)
        .and.to.have.key('key')
        .and.to.include.keys(...hiddenFields);
    });

    it('should return an error', async () => {
      ServiceModel._backup.findOne = ServiceModel.findOne;
      ServiceModel.findOne = () => ({
        exec: () => Promise.reject(new Error())
      });

      const error = await ServiceController.findOneByIndentifier();
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      ServiceModel.findOne = ServiceModel._backup.findOne;
    });
  });

  describe('create', () => {
    let mongoServer;
    beforeEach(async () => {
      ServiceModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      await mongoose.connect(uri, mongooseOpts);
    });

    afterEach(async () => {
      await mongoServer.stop();
      await mongoose.disconnect();
    });

    it('should create a service and return it sanitized', async () => {
      const serviceData = {
        identifier: 'service-1',
        ip: 'private',
        key: '1234'
      };
      const service = await ServiceController.create(serviceData);

      delete serviceData.key;

      expect(service)
        .to.deep.include(serviceData)
        .and.to.have.key('key')
        .and.to.not.have.any.keys(...hiddenFields);
    });

    it('should create a service and return it not sanitized', async () => {
      const serviceData = {
        identifier: 'service-1',
        ip: 'private',
        key: '1234'
      };
      const service = await ServiceController.create(serviceData, false);

      delete serviceData.key;

      expect(service.toJSON())
        .to.deep.include(serviceData)
        .and.to.have.key('key')
        .and.to.include.keys(...hiddenFields);
    });

    it('should return a verification error', async () => {
      const serviceData = {
        identifier: 'service-1',
        ip: 123,
        key: '1234'
      };
      const error = await ServiceController.create(serviceData);
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(409);
    });

    it('should return an error', async () => {
      ServiceModel._backup.create = ServiceModel.create;
      ServiceModel.create = () => Promise.reject(new Error());

      const serviceData = {
        identifier: 'service-1',
        ip: 'private',
        key: '1234'
      };
      const error = await ServiceController.create(serviceData);
      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      ServiceModel.create = ServiceModel._backup.create;
    });
  });

  describe('update', () => {
    let mongoServer;
    let serviceToUpdate;
    beforeEach(async () => {
      ServiceModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      await mongoose.connect(uri, mongooseOpts);
      serviceToUpdate = await ServiceController.create({
        identifier: 'service-1',
        ip: 'private',
        key: '1234'
      });
    });

    afterEach(async () => {
      await mongoServer.stop();
      await mongoose.disconnect();
    });

    it('should update a service and return it sanitized', async () => {
      const identifier = 'service-2';
      const service = await ServiceController.update(serviceToUpdate._id, {
        identifier
      });

      expect(service)
        .to.deep.include({ identifier })
        .and.to.not.have.any.keys(...hiddenFields);
    });

    it('should update a service key', async () => {
      const key = 'new-key';
      const service = await ServiceController.update(serviceToUpdate._id, {
        key
      });

      expect(service).to.not.have.any.keys(...hiddenFields);
      expect(service.key).to.not.be.equal(serviceToUpdate.key);
      expect(bcrypt.compareSync(key, service.key)).to.be.equal(true);
    });

    it('should update a service ip', async () => {
      const ip = '192.168.1.1';
      const service = await ServiceController.update(serviceToUpdate._id, {
        ip
      });

      expect(service)
        .to.include({ ip: 'private' })
        .and.to.not.have.any.keys(...hiddenFields);
    });

    it('should update a service and return it not sanitized', async () => {
      const identifier = 'service-2';
      const service = await ServiceController.update(
        serviceToUpdate._id,
        {
          identifier
        },
        false
      );

      expect(service.toJSON())
        .to.deep.include({ identifier })
        .and.to.include.keys(...hiddenFields);
    });

    it("should return a 404 if the service doesn't exist", async () => {
      const identifier = 'service-2';
      const response = await ServiceController.update('605a58c0b6c966ab548da8b1', {
        identifier
      });

      expect(response).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(response?.output?.statusCode).to.be.equal(404);
    });

    it('should return a verification error', async () => {
      const ip = 123;
      const error = await ServiceController.update(serviceToUpdate._id, {
        ip
      });

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(409);
    });

    it('should return an error', async () => {
      ServiceModel._backup.updateOne = ServiceModel.updateOne;
      ServiceModel.updateOne = () => ({
        exec: () => Promise.reject(new Error())
      });

      const error = await ServiceController.update(serviceToUpdate._id, {
        identifier: 'service-2'
      });

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);

      ServiceModel.updateOne = ServiceModel._backup.updateOne;
    });
  });

  describe('remove', () => {
    let mongoServer;
    let serviceToDelete;
    beforeEach(async () => {
      ServiceModel._backup = {};
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      await mongoose.connect(uri, mongooseOpts);
      serviceToDelete = await ServiceController.create({
        identifier: 'service-1',
        ip: 'private',
        key: '1234'
      });
    });

    afterEach(async () => {
      await mongoServer.stop();
      await mongoose.disconnect();
    });

    it("should return a 404 if service doesn't exist", async () => {
      const error = await ServiceController.remove(['605a56f67ab4c26d4da8ff6b']);

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(404);
    });

    it('should update a service and return it not sanitized', async () => {
      const response = await ServiceController.remove([serviceToDelete._id]);
      expect(response).to.deep.include({ deleted: [serviceToDelete._id] });
    });

    it('should return an error', async () => {
      ServiceModel._backup.deleteMany = ServiceModel.deleteMany;
      ServiceModel.deleteMany = () => ({
        exec: () => Promise.reject(new Error())
      });

      const error = await ServiceController.remove([serviceToDelete._id]);

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.output?.statusCode).to.be.equal(500);
    });
  });

  describe('login', () => {
    let mongoServer;
    before(async () => {
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      await mongoose.connect(uri, mongooseOpts);
      await ServiceController.create({
        identifier: 'service-local',
        ip: 'private',
        key: '1234'
      });
      await ServiceController.create({
        identifier: 'service-remote',
        ip: '8.8.8.8',
        key: '1234'
      });
    });

    after(async () => {
      await mongoServer.stop();
      await mongoose.disconnect();
    });

    it('should return 401 if service is remote and request ip are not matching', async () => {
      const error = await ServiceController.login(
        { identifier: 'service-remote', key: '1234' },
        '8.8.4.4'
      );

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.message).to.be.equal("Service isn't matching ip or key");
      expect(error?.output?.statusCode).to.be.equal(401);
    });

    it('should return 401 if service is local and request ip is remote', async () => {
      const error = await ServiceController.login(
        { identifier: 'service-local', key: '1234' },
        '8.8.4.4'
      );

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.message).to.be.equal("Service isn't matching ip or key");
      expect(error?.output?.statusCode).to.be.equal(401);
    });

    it('should return 401 if service ip and request ip matched but wrong key', async () => {
      const error = await ServiceController.login(
        { identifier: 'service-local', key: 'abcd' },
        '192.168.1.1'
      );

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.message).to.be.equal("Service isn't matching ip or key");
      expect(error?.output?.statusCode).to.be.equal(401);
    });

    it('should return 500 if another error is thrown during login', async () => {
      resetModuleCache();
      const { login } = proxyquire
        .noPreserveCache()
        .load('../../src/controllers/ServiceController.js', {
          bcryptjs: {
            compareSync: () => {
              throw new Error('test error');
            }
          }
        });
      const error = await login({ identifier: 'service-local', key: '1234' }, '192.168.1.1');

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.message).to.be.equal('test error');
      expect(error?.output?.statusCode).to.be.equal(500);
    });
  });

  describe('refresh', () => {
    let mongoServer;
    before(async () => {
      mongoServer = new MongoMemoryServer();
      const uri = await mongoServer.getUri();
      await mongoose.connect(uri, mongooseOpts);
      await ServiceController.create({
        identifier: 'service-1',
        ip: 'private',
        key: '1234'
      });
    });

    after(async () => {
      await mongoServer.stop();
      await mongoose.disconnect();
    });

    beforeEach(() => {
      resetModuleCache();
    });

    it('should return 401 if token are not signed with the correct secret', async () => {
      const realSecret = process.env.SERVICE_JWT_SECRET;
      process.env.SERVICE_JWT_SECRET = 'abcd';
      const [accessToken, refreshToken] = [
        accessTokenFactory({ service: 'service-1' }, '123'),
        refreshTokenFactory({ service: 'service-1' }, '456')
      ];
      process.env.SERVICE_JWT_SECRET = realSecret;

      const error = await ServiceController.refresh({ accessToken, refreshToken });

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.message).to.be.equal('Tokens verification failed');
      expect(error?.output?.statusCode).to.be.equal(401);
    });

    it('should return 401 if refreshToken is expired', async () => {
      const [accessToken, refreshToken] = [
        accessTokenFactory({ service: 'service-1' }, '123'),
        refreshTokenFactory({ service: 'service-1' }, '456', '-1h')
      ];

      const error = await ServiceController.refresh({ accessToken, refreshToken });

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.message).to.be.equal('Tokens verification failed');
      expect(error?.output?.statusCode).to.be.equal(401);
    });

    it('should return 401 if tokens are not for the same service', async () => {
      const [accessToken, refreshToken] = [
        accessTokenFactory({ service: 'service-1' }, '123'),
        refreshTokenFactory({ service: 'service-2' }, '456')
      ];

      const error = await ServiceController.refresh({ accessToken, refreshToken });

      expect(error).to.be.an('error').and.to.be.an.instanceOf(Boom.Boom);
      expect(error?.message).to.be.equal('Tokens are not matching');
      expect(error?.output?.statusCode).to.be.equal(401);
    });

    it('should refresh even with an expired accessToken', async () => {
      const [accessToken, refreshToken] = [
        accessTokenFactory({ service: 'service-1' }, '123', '-3d'),
        refreshTokenFactory({ service: 'service-1' }, '456')
      ];

      const tokens = await ServiceController.refresh({ accessToken, refreshToken });

      expect(tokens).to.have.keys('accessToken', 'refreshToken');
    });
  });
});
