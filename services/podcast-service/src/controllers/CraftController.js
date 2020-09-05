import _ from 'lodash';
import Boom from '@hapi/boom';
import calibrate from 'calibrate';
import Craft, { projection, hiddenFields } from '../models/CraftModel';

/**
 * Return a list of all crafts
 *
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object[]>} {[Craft]}
 */
export const find = (sanitized = true) =>
  Craft.find({}, sanitized ? projection : {})
    .exec()
    .then(calibrate.response)
    .catch(Boom.boomify);

/**
 * Return a specific craft
 *
 * @param {String} id
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {Craft}
 */
export const findOne = (id, sanitized = true) =>
  Craft.findOne({ _id: id }, sanitized ? projection : {})
    .exec()
    .then(calibrate.response)
    .catch(Boom.boomify);

/**
 * Create a craft
 *
 * @param {Object} data
 * @param {String} data.name
 * @param {String} data.jobId
 * @param {String} data.user
 * @param {String} data.storageType
 * @param {String} data.storagePath
 * @param {String} data.storageFilename
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {Craft}
 */
export const create = (
  { name, jobId, user, storageType, storagePath, storageFilename },
  sanitized = true
) =>
  Craft.create({ name, jobId, user, storageType, storagePath, storageFilename })
    .then((craft) =>
      calibrate.response(
        sanitized ? _.omit(craft.toObject(), hiddenFields) : craft
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
 * Update a specific craft
 *
 * @param {String} id
 * @param {Object} data
 * @param {String} data.name
 * @param {String} data.jobId
 * @param {String} data.user
 * @param {String} data.storageType
 * @param {String} data.storagePath
 * @param {String} data.storageFilename
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {Craft}
 */
export const update = (
  id,
  { name, jobId, user, storageType, storagePath, storageFilename },
  sanitized = true
) =>
  Craft.updateOne(
    { _id: id },
    _.omitBy(
      { name, jobId, user, storageType, storagePath, storageFilename },
      _.isUndefined
    )
  )
    .exec()
    .then(async (res) => {
      if (!res.n) {
        return Boom.notFound();
      }
      if (!res.nModified) {
        return Boom.expectationFailed('No changes required');
      }

      const craft = await findOne(id, sanitized);
      return craft;
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
 * Delete crafts
 *
 * @param {Arrays} ids
 *
 * @return {Promise<Object[]>}
 */
export const remove = (ids) =>
  Craft.deleteMany({ _id: { $in: ids.filter((x) => x) } })
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
