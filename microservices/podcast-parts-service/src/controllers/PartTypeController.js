import _ from 'lodash';
import Boom from '@hapi/boom';
import calibrate from 'calibrate';
import PartType, { projection, hiddenFields } from '../models/PartTypeModel';

/**
 * Return a list of all partType
 * @return {Promise<Object[]>} {[PartType]}
 */
export const find = () => PartType.find({}, projection)
  .exec()
  .then(calibrate.response)
  .catch(Boom.boomify);

/**
 * Return a specific partType
 * @param {String} id
 * @return {Promise<Object>} {PartType}
 */
export const findOne = (id) => PartType.findOne({ _id: id }, projection)
  .exec()
  .then(calibrate.response)
  .catch(Boom.boomify);

/**
 * Create a partType
 * @param {Object} data
 * @return {Promise<Object>} {PartType}
 */
export const create = ({ name }) => PartType.create({ name })
  .then((partType) => calibrate.response(_.omit(partType.toObject(), hiddenFields)))
  .catch((error) => {
    console.log(error);
    if (error.name === 'ValidationError') {
      const response =  Boom.boomify(error, { statusCode: 409 });
      response.output.payload.data = error.errors;

      return response;
    }

    return Boom.boomify(error);
  });

/**
 * Update a specific partType
 * @param {String} id
 * @param {Object} data
 * @return {Promise<Object[]>} {PartType}
 */
export const update = (id, { name }) => PartType
  .updateOne({ _id: id }, _.omitBy({ name }, _.isUndefined))
  .exec()
  .then(async (res) => {
    if (!res.n) {
      return Boom.notFound();
    }
    if (!res.nModified) {
      return Boom.expectationFailed('No changes required');
    }

    const partType = await findOne(id);
    return partType;
  })
  .catch((error) => {
    if (error.name === 'ValidationError') {
      const response =  Boom.boomify(error, { statusCode: 409 });
      response.output.payload.data = error.errors;

      return response;
    }

    return Boom.boomify(error);
  });

/**
 * Create a partType
 * @param {String} id
 * @return {Promise<void>}
 */
export const remove = (id) => PartType.deleteOne({ _id: id })
  .exec()
  .then((res) => {
    if (!res.deletedCount) {
      return Boom.notFound();
    }

    return calibrate.response({
      deleted: id
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
