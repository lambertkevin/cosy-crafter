import _ from 'lodash';
import Boom from '@hapi/boom';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import calibrate from 'calibrate';
import { v4 as uuid } from 'uuid';
import privateIp from 'private-ip';
import Service, { projection, hiddenFields } from '../models/ServiceModel';
import * as TokenController from './TokenController';
import tokensFactory from '../utils/TokensFactory';

/**
 * Return a list of all Services
 *
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object[]>} {[Service]}
 */
export const find = (sanitized = true) =>
  Service.find({}, sanitized ? projection : {})
    .exec()
    .then(calibrate.response)
    .catch(Boom.boomify);

/**
 * Return a specific Service
 *
 * @param {String} identifier
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {Service}
 */
export const findOne = (identifier, sanitized = true) =>
  Service.findOne({ identifier }, sanitized ? projection : {})
    .exec()
    .then(calibrate.response)
    .catch(Boom.boomify);

/**
 * Create a Service
 *
 * @param {Object} data
 * @param {String} data.identifier
 * @param {String} data.key
 * @param {String} data.ip
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {Service}
 */
export const create = async (
  { identifier, key, ip: _ip },
  sanitized = true
) => {
  const hashedKey = await bcrypt.hash(key, 10);
  const ip = privateIp(_ip) ? 'private' : _ip;

  return Service.create({ identifier, key: hashedKey, ip })
    .then((service) =>
      calibrate.response(
        sanitized ? _.omit(service.toObject(), hiddenFields) : service
      )
    )
    .catch((error) => {
      if (error.toString().includes('ValidationError')) {
        const response = Boom.boomify(error, { statusCode: 409 });
        response.output.payload.data = error.errors;

        return response;
      }

      return Boom.boomify(error);
    });
};

/**
 * Update a specific Service
 *
 * @param {String} identifier
 * @param {Object} data
 * @param {String} data.key
 * @param {String} data.ip
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object[]>} {Service}
 */
export const update = async (
  identifier,
  { key, ip: _ip },
  sanitized = true
) => {
  const hashedKey = key ? await bcrypt.hash(key, 10) : undefined;
  const ipPrivatizer = (ip) => (privateIp(ip) ? 'private' : ip);
  const ip = _ip ? ipPrivatizer(_ip) : undefined;

  return Service.updateOne(
    { identifier },
    _.omitBy({ identifier, key: hashedKey, ip }, _.isUndefined)
  )
    .exec()
    .then(async (res) => {
      if (!res.n) {
        return Boom.notFound();
      }
      if (!res.nModified) {
        return Boom.expectationFailed('No changes required');
      }

      const service = await findOne(identifier, sanitized);
      return service;
    })
    .catch((error) => {
      if (error.identifier === 'ValidationError') {
        const response = Boom.boomify(error, { statusCode: 409 });
        response.output.payload.data = error.errors;

        return response;
      }

      return Boom.boomify(error);
    });
};

/**
 * Remove Services
 *
 * @param {Arrays} identifiers
 *
 * @return {Promise<void>}
 */
export const remove = (identifiers = []) =>
  Service.deleteMany({ identifier: { $in: identifiers.filter((x) => x) } })
    .exec()
    .then((res) => {
      if (!res.deletedCount) {
        return Boom.notFound();
      }

      return calibrate.response({
        deleted: identifiers
      });
    })
    .catch(Boom.boomify);

/**
 * Log a service to obtain tokens
 *
 * @param {Object} data
 * @param {String} data.identifier
 * @param {String} data.key
 * @param {String} ip
 *
 * @return {Promise<Object>}
 */
export const login = async ({ identifier, key }, ip) => {
  try {
    const service = await Service.findOne({ identifier }).exec();

    if (!service) {
      throw Boom.notFound();
    }

    if (
      // If ip is matching or ip is from private network and service ip was private on creation
      (service.ip === ip || (privateIp(ip) && service.ip === 'private')) &&
      bcrypt.compareSync(key, service.key)
    ) {
      const tokens = await tokensFactory(
        {
          service: service.identifier
        },
        [uuid(), uuid()]
      );

      return calibrate.response(tokens);
    }
    throw Boom.unauthorized("Service isn't matching ip or key");
  } catch (e) {
    console.log(e);
    if (e.isBoom) {
      return e;
    }
    return Boom.boomify(e);
  }
};

/**
 * Refresh tokens lifetime
 *
 * @param {Object} data
 * @param {String} data.accessToken
 * @param {String} data.refreshToken
 *
 * @return {Promise<Object>}
 */
export const refresh = async ({ accessToken, refreshToken }) => {
  try {
    // Check accessToken signature but not expiraton
    const decodedAccessToken = await jwt.verify(
      accessToken,
      process.env.SERVICE_JWT_SECRET,
      {
        ignoreExpiration: true
      }
    );
    // Check refreshToken signature and verify its expiration
    const decodedRefreshToken = await jwt.verify(
      refreshToken,
      process.env.SERVICE_JWT_REFRESH_SECRET
    );

    // If the tokens are for the same service
    if (decodedAccessToken.service === decodedRefreshToken.service) {
      try {
        // Check if the token isn't blacklisted
        const { data: isBlackListed } = await TokenController.findOne(
          decodedRefreshToken.jti
        );
        // Check if the service is still registered
        const { data: service } = await findOne(decodedAccessToken.service);

        if (!isBlackListed && !_.isEmpty(service)) {
          // Omit JWT payload properties from spec
          const jwtProperties = ['iat', 'exp', 'jti', 'nbf'];
          // Generate new tokens with new jwtids
          const tokens = await tokensFactory(
            _.omit(decodedRefreshToken, jwtProperties),
            [uuid(), uuid()]
          );
          return calibrate.response(tokens);
        }
        // if blacklisting or not found, go to catch
        throw new Error();
      } catch (e) {
        return Boom.unauthorized(
          'Token is blacklisted or service is not existing'
        );
      }
    }
    return Boom.unauthorized('Tokens are not matching');
  } catch (e) {
    return Boom.unauthorized();
  }
};

export default {
  find,
  findOne,
  create,
  update,
  remove
};
