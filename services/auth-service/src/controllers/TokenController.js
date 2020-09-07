import _ from 'lodash';
import Boom from '@hapi/boom';
import calibrate from 'calibrate';
import Token, { projection, hiddenFields } from '../models/TokenModel';
import { logger } from '../utils/Logger';

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
    .then(calibrate.response)
    .catch((error) => {
      logger.error('Token Find Error', error);
      return Boom.boomify(error);
    });

/**
 * Return a specific Token
 *
 * @param {String} jwtid
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {Token}
 */
export const findOne = (jwtid, sanitized = true) =>
  Token.findOne({ jwtid }, sanitized ? projection : {})
    .exec()
    .then(calibrate.response)
    .catch((error) => {
      logger.error('Token FindOne Error', error);
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
    .then((token) =>
      calibrate.response(
        sanitized ? _.omit(token.toObject(), hiddenFields) : token
      )
    )
    .catch((error) => {
      if (error.name === 'ValidationError') {
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
  Token.updateOne({ _id: id }, _.omitBy({ jwtid, type }, _.isUndefined))
    .exec()
    .then(async (res) => {
      if (!res.n) {
        return Boom.notFound();
      }
      if (!res.nModified) {
        return Boom.expectationFailed('No changes required');
      }

      const token = await findOne(id, sanitized);
      return token;
    })
    .catch((error) => {
      if (error.name === 'ValidationError') {
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
 * @param {Arrays} jwtids
 *
 * @return {Promise<void>}
 */
export const remove = (jwtids) =>
  Token.deleteMany({ jwtid: { $in: jwtids.filter((x) => x) } })
    .exec()
    .then((res) => {
      if (!res.deletedCount) {
        return Boom.notFound();
      }

      return calibrate.response({
        deleted: jwtids
      });
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