import _ from 'lodash';
import Boom from '@hapi/boom';
import calibrate from 'calibrate';
import PartType, { projection, hiddenFields } from '../models/PartTypeModel';

/**
 * Return a list of all partType
 *
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object[]>} {[PartType]}
 */
export const find = (sanitized = true) =>
  PartType.find({}, sanitized ? projection : {})
    .exec()
    .then(calibrate.response)
    .catch(Boom.boomify);

/**
 * Return a specific partType
 *
 * @param {String} id
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {PartType}
 */
export const findOne = (id, sanitized = true) =>
  PartType.findOne({ _id: id }, sanitized ? projection : {})
    .exec()
    .then(calibrate.response)
    .catch(Boom.boomify);

/**
 * Create a partType
 *
 * @param {Object} data
 * @param {String} data.name
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {PartType}
 */
export const create = ({ name }, sanitized = true) =>
  PartType.create({ name })
    .then((partType) =>
      calibrate.response(
        sanitized ? _.omit(partType.toObject(), hiddenFields) : partType
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
 * Update a specific partType
 *
 * @param {String} id
 * @param {Object} data
 * @param {String} data.name
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object[]>} {PartType}
 */
export const update = (id, { name }, sanitized = true) =>
  PartType.updateOne({ _id: id }, _.omitBy({ name }, _.isUndefined))
    .exec()
    .then(async (res) => {
      if (!res.n) {
        return Boom.notFound();
      }
      if (!res.nModified) {
        return Boom.expectationFailed('No changes required');
      }

      const partType = await findOne(id, sanitized);
      return partType;
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
 * Create a partType
 * @param {Arrays} ids
 * @return {Promise<void>}
 */
export const remove = (ids) =>
  PartType.deleteMany({ _id: { $in: ids } })
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
