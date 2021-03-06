import _ from 'lodash';
import Boom from '@hapi/boom';
import mongoose from 'mongoose';
import { logger } from '@cosy/logger';
import Token, { projection, hiddenFields } from '../models/TokenBlacklistModel';

/**
 * Return a list of all Token
 *
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object[]>} {[Token]}
 */
export const find = (sanitized = true) =>
  Token.find({}, sanitized ? projection : {})
    .exec()
    .catch((error) => {
      logger.error('Token Find Error', error);
      return Boom.boomify(error);
    });

/**
 * Return a specific Token
 *
 * @param {String} id
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {Token}
 */
export const findOne = (id, sanitized = true) =>
  Token.findOne({ _id: id }, sanitized ? projection : {})
    .exec()
    .catch((error) => {
      logger.error('Token FindOne Error', error);
      return Boom.boomify(error);
    });

/**
 * Return a specific Token by its jwtid
 *
 * @param {String} jwtid [GUID]
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {Token}
 */
export const findOneByJwtId = (jwtid, sanitized = true) =>
  Token.findOne({ jwtid }, sanitized ? projection : {})
    .exec()
    .catch((error) => {
      logger.error('Token FindOneByJwtId Error', error);
      return Boom.boomify(error);
    });

/**
 * Create a Token
 *
 * @param {Object} data
 * @param {String} data.jwtid
 * @param {String} data.type
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {Token}
 */
export const create = ({ jwtid, type }, sanitized = true) =>
  Token.create({ jwtid, type })
    .then((token) => (sanitized ? _.omit(token.toObject(), hiddenFields) : token))
    .catch((error) => {
      if (error instanceof mongoose.Error) {
        logger.error('Token Create Validation Error', error);
        const response = Boom.boomify(error, { statusCode: 409 });
        response.output.payload.data = error.errors;

        return response;
      }

      logger.error('Token Create Error', error);
      return Boom.boomify(error);
    });

/**
 * Update a specific Token
 *
 * @param {String} id
 * @param {Object} data
 * @param {String} data.jwtid
 * @param {String} data.type
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object[]>} {Token}
 */
export const update = (id, { jwtid, type }, sanitized = true) =>
  Token.updateOne({ _id: id }, _.omitBy({ jwtid, type }, _.isUndefined), {
    runValidators: true,
    context: 'query'
  })
    .exec()
    .then(async (res) => {
      if (!res.n) {
        return Boom.notFound();
      }

      const token = await findOne(id, sanitized);
      return token;
    })
    .catch((error) => {
      if (error instanceof mongoose.Error) {
        logger.error('Token Update Validation Error', error);
        const response = Boom.boomify(error, { statusCode: 409 });
        response.output.payload.data = error.errors;

        return response;
      }

      logger.error('Token Update Error', error);
      return Boom.boomify(error);
    });

/**
 * Remove Tokens
 *
 * @param {Array} ids
 *
 * @return {Promise<void>}
 */
export const remove = (ids) =>
  Token.deleteMany({ _id: { $in: ids.filter((x) => x) } })
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
      logger.error('Token Remove Error', error);
      return Boom.boomify(error);
    });

export default {
  find,
  findOne,
  create,
  update,
  remove
};
