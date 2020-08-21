import _ from 'lodash';
import Boom from '@hapi/boom';
import calibrate from 'calibrate';
import Section, { projection, hiddenFields } from '../models/SectionModel';

/**
 * Return a list of all Section
 *
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object[]>} {[Section]}
 */
export const find = (sanitized = true) =>
  Section.find({}, sanitized ? projection : {})
    .exec()
    .then(calibrate.response)
    .catch(Boom.boomify);

/**
 * Return a specific Section
 *
 * @param {String} id
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {Section}
 */
export const findOne = (id, sanitized = true) =>
  Section.findOne({ _id: id }, sanitized ? projection : {})
    .exec()
    .then(calibrate.response)
    .catch(Boom.boomify);

/**
 * Create a Section
 *
 * @param {Object} data
 * @param {String} data.name
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {Section}
 */
export const create = ({ name }, sanitized = true) =>
  Section.create({ name })
    .then((section) =>
      calibrate.response(
        sanitized ? _.omit(section.toObject(), hiddenFields) : section
      )
    )
    .catch((error) => {
      if (error.name === 'ValidationError') {
        const response = Boom.boomify(error, { statusCode: 409 });
        response.output.payload.data = error.errors;

        return response;
      }

      return Boom.boomify(error);
    });

/**
 * Update a specific Section
 *
 * @param {String} id
 * @param {Object} data
 * @param {String} data.name
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object[]>} {Section}
 */
export const update = (id, { name }, sanitized = true) =>
  Section.updateOne({ _id: id }, _.omitBy({ name }, _.isUndefined))
    .exec()
    .then(async (res) => {
      if (!res.n) {
        return Boom.notFound();
      }
      if (!res.nModified) {
        return Boom.expectationFailed('No changes required');
      }

      const section = await findOne(id, sanitized);
      return section;
    })
    .catch((error) => {
      if (error.name === 'ValidationError') {
        const response = Boom.boomify(error, { statusCode: 409 });
        response.output.payload.data = error.errors;

        return response;
      }

      return Boom.boomify(error);
    });

/**
 * Create a Section
 * @param {Arrays} ids
 * @return {Promise<void>}
 */
export const remove = (ids) =>
  Section.deleteMany({ _id: { $in: ids.filter((x) => x) } })
    .exec()
    .then((res) => {
      if (!res.deletedCount) {
        return Boom.notFound();
      }

      return calibrate.response({
        deleted: ids
      });
    })
    .catch(Boom.boomify);

export default {
  find,
  findOne,
  create,
  update,
  remove
};
