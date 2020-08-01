import _ from 'lodash';
import Boom from '@hapi/boom';
import calibrate from 'calibrate';
import * as PodcastController from './PodcastController';
import * as PartTypeController from './PartTypeController';
import Part, { projection, hiddenFields } from '../models/PartModel';

/**
 * Return a list of all part
 * @return {Promise<Object[]>} {[Part]}
 */
export const find = () => Part.find({}, projection)
  .exec()
  .then(calibrate.response)
  .catch(Boom.boomify);

/**
 * Return a specific part
 * @param {String} id
 * @return {Promise<Object>} {Part}
 */
export const findOne = (id) => Part.findOne({ _id: id }, projection)
  .exec()
  .then(calibrate.response)
  .catch(Boom.boomify);

/**
 * Create a part
 * @param {Object} data
 * @return {Promise<Object>} {Part}
 */
export const create = async ({
  name,
  type,
  podcast,
  tags
}) => {
  try {
    const dependencies = await Promise.all([
      PartTypeController.findOne(type),
      PodcastController.findOne(podcast)
    ]);
    const dependenciesErrors = dependencies.filter((x) => x instanceof Error);
    if (dependenciesErrors.length) {
      return Boom.notAcceptable('At least one dependency doesn\'t exist');
    }
  } catch (error) {
    return error;
  }

  return Part.create({
    name,
    type,
    podcast,
    tags
  })
    .then((part) => calibrate.response(_.omit(part.toObject(), hiddenFields)))
    .catch((error) => {
      if (error.name === 'ValidationError') {
        const response =  Boom.boomify(error, { statusCode: 409 });
        response.output.payload.data = error.errors;

        return response;
      }

      return Boom.boomify(error);
    });
};

/**
 * Update a specific part
 * @param {String} id
 * @param {Object} data
 * @return {Promise<Object>} {Part}
 */
export const update = (id, {
  name,
  type,
  podcast,
  tags
}) => Part.updateOne({ _id: id }, _.omitBy({
  name,
  type,
  podcast,
  tags
}, _.isUndefined))
  .exec()
  .then(async (res) => {
    if (!res.n) {
      return Boom.notFound();
    }
    if (!res.nModified) {
      return Boom.expectationFailed('No changes required');
    }

    const part = await findOne(id);
    return part;
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
 * Create a part
 * @param {String} id
 * @return {Promise<void>}
 */
export const remove = (id) => Part.deleteOne({ _id: id })
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
