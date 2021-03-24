import _ from 'lodash';
import Boom from '@hapi/boom';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';
import privateIp from 'private-ip';
import { logger } from '@cosy/logger';
import Service, { projection, hiddenFields } from '../models/ServiceModel';
import * as TokenBlacklistController from './TokenBlacklistController';
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
    .catch((error) => {
      logger.error('Service Find Error', error);
      return Boom.boomify(error);
    });

/**
 * Return a specific Service
 *
 * @param {String} id
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {Service}
 */
export const findOne = (id, sanitized = true) =>
  Service.findOne({ _id: id }, sanitized ? projection : {})
    .exec()
    .catch((error) => {
      logger.error('Service FindOne Error', error);
      return Boom.boomify(error);
    });

/**
 * Return a specific Service
 *
 * @param {String} identifier
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {Service}
 */
export const findOneByIndentifier = (identifier, sanitized = true) =>
  Service.findOne({ identifier }, sanitized ? projection : {})
    .exec()
    .catch((error) => {
      logger.error('Service FindOne Error', error);
      return Boom.boomify(error);
    });

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
      sanitized ? _.omit(service.toObject(), hiddenFields) : service
    )
    .catch((error) => {
      if (error instanceof mongoose.Error.ValidationError) {
        logger.error('Service Create Validation Error', error);
        const response = Boom.boomify(error, { statusCode: 409 });
        response.output.payload.data = error.errors;

        return response;
      }

      logger.error('Service Create Error', error);
      return Boom.boomify(error);
    });
};

/**
 * Update a specific Service
 *
 * @param {String} id
 * @param {Object} data
 * @param {String} data.key
 * @param {String} data.ip
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object[]>} {Service}
 */
export const update = async (
  id,
  { identifier, key, ip: _ip },
  sanitized = true
) => {
  const hashedKey = key ? await bcrypt.hash(key, 10) : undefined;
  const ipPrivatizer = (ip) => (privateIp(ip) ? 'private' : ip);
  const ip = _ip ? ipPrivatizer(_ip) : undefined;

  return Service.updateOne(
    { _id: id },
    _.omitBy({ identifier, key: hashedKey, ip }, _.isUndefined),
    { runValidators: true, context: 'query' }
  )
    .exec()
    .then(async (res) => {
      if (!res.n) {
        return Boom.notFound();
      }

      const service = await findOne(id, sanitized);
      return service;
    })
    .catch((error) => {
      if (error instanceof mongoose.Error.ValidationError) {
        logger.error('Service Update Validation Error', error);
        const response = Boom.boomify(error, { statusCode: 409 });
        response.output.payload.data = error.errors;

        return response;
      }

      logger.error('Service Update Error', error);
      return Boom.boomify(error);
    });
};

/**
 * Remove Services
 *
 * @param {Array} ids
 *
 * @return {Promise<void>}
 */
export const remove = (ids = []) =>
  Service.deleteMany({ _id: { $in: ids.filter((x) => x) } })
    .exec()
    .then((res) => {
      if (!res.deletedCount) {
        return Boom.notFound();
      }

      return {
        deleted: ids
      };
    })
    .catch((error) => {
      logger.error('Service Remove Error', error);
      return Boom.boomify(error);
    });

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
    const service = await (() => {
      if (process.env.NODE_ENV === 'mock') {
        return {
          identifier
        };
      }
      return Service.findOne({ identifier }).exec();
    })();

    if (!service) {
      throw Boom.notFound();
    }

    if (
      // If ip is matching or ip is from private network and service ip was private on creation
      ((service.ip === ip || (privateIp(ip) && service.ip === 'private')) &&
        bcrypt.compareSync(key, service.key)) ||
      process.env.NODE_ENV === 'mock'
    ) {
      const tokens = await tokensFactory(
        {
          service: service.identifier
        },
        [uuid(), uuid()]
      );

      return tokens;
    }
    throw Boom.unauthorized("Service isn't matching ip or key");
  } catch (error) {
    logger.error('Service Login Error', error);
    if (error.isBoom) {
      return error;
    }
    return Boom.boomify(error);
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
        const isBlackListed = await TokenBlacklistController.findOneByJwtId(
          decodedRefreshToken.jti
        );

        // Check if the service is still registered
        const service = await (() => {
          if (process.env.NODE_ENV === 'mock') {
            return {
              data: {
                identifier: decodedAccessToken.service
              }
            };
          }
          return findOneByIndentifier(decodedAccessToken.service);
        })();

        if (!isBlackListed && !_.isEmpty(service)) {
          // Omit JWT payload properties from spec
          const jwtProperties = ['iat', 'exp', 'jti', 'nbf'];
          // Generate new tokens with new jwtids
          const tokens = await tokensFactory(
            _.omit(decodedRefreshToken, jwtProperties),
            [uuid(), uuid()]
          );
          return tokens;
        }
        // if blacklisting or not found, go to catch
        throw new Error();
      } catch (error) {
        logger.error('Service Token Refresh Error', error);
        return Boom.unauthorized(
          'Token is blacklisted or service is not existing'
        );
      }
    }
    logger.error('Service Token Refresh Error: Using wrong tokens', {
      accessToken,
      refreshToken
    });
    return Boom.unauthorized('Tokens are not matching');
  } catch (error) {
    logger.error(
      'Service Token Refresh Error: Tokens verification failed',
      error
    );
    return Boom.unauthorized('Tokens verification failed');
  }
};

export default {
  find,
  findOne,
  create,
  update,
  remove
};
