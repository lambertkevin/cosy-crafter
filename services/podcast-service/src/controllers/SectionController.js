import _ from 'lodash';
import Boom from '@hapi/boom';
import mongoose from 'mongoose';
import { logger } from '@cosy/logger';
import Section, { projection, hiddenFields } from '../models/SectionModel';

/**
 * Return a list of all sections
 *
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {[Section]}
 */
export const find = (sanitized = true) =>
  Section.find({}, sanitized ? projection : {})
    .exec()
    .catch((error) => {
      logger.error('Section Find Error', error);
      return Boom.boomify(error);
    });

/**
 * Return a specific section
 *
 * @param {String} id
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {Section}
 */
export const findOne = (id, sanitized = true) =>
  Section.findOne({ _id: id }, sanitized ? projection : {})
    .exec()
    .catch((error) => {
      logger.error('Section FindOne Error', error);
      return Boom.boomify(error);
    });

/**
 * Create a section
 *
 * @param {Object} data
 * @param {String} data.name
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {Section}
 */
export const create = ({ name }, sanitized = true) =>
  Section.create({ name })
    .then((section) => (sanitized ? _.omit(section.toObject(), hiddenFields) : section))
    .catch((error) => {
      if (error instanceof mongoose.Error) {
        logger.error('Section Create Validation Error', error);
        const response = Boom.boomify(error, { statusCode: 409 });
        response.output.payload.data = error.errors;

        return response;
      }

      logger.error('Section Create Error', error);
      return Boom.boomify(error);
    });

/**
 * Update a specific section
 *
 * @param {String} id
 * @param {Object} data
 * @param {String} data.name
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {Section}
 */
export const update = (id, { name }, sanitized = true) =>
  Section.updateOne({ _id: id }, _.omitBy({ name }, _.isUndefined), {
    runValidators: true,
    context: 'query'
  })
    .exec()
    .then(async (res) => {
      if (!res.n) {
        return Boom.notFound();
      }

      const section = await findOne(id, sanitized);
      return section;
    })
    .catch((error) => {
      if (error instanceof mongoose.Error) {
        logger.error('Section Update Validation Error', error);
        const response = Boom.boomify(error, { statusCode: 409 });
        response.output.payload.data = error.errors;

        return response;
      }

      logger.error('Section Update Error', error);
      return Boom.boomify(error);
    });

/**
 * Delete sections
 *
 * @param {Array<String>} ids
 *
 * @return {Promise<Object>}
 */
export const remove = (ids) =>
  Section.deleteMany({ _id: { $in: ids.filter((x) => x) } })
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
      logger.error('Section Remove Error', error);
      return Boom.boomify(error);
    });

export default {
  find,
  findOne,
  create,
  update,
  remove
};
