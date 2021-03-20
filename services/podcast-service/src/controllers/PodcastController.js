import _ from 'lodash';
import Boom from '@hapi/boom';
import { logger } from '@cosy/logger';
import Podcast, { projection, hiddenFields } from '../models/PodcastModel';
import { projection as partProjection } from '../models/PartModel';

/**
 * Return a list of all podcasts
 *
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {[Podcast]}
 */
export const find = (sanitized = true) =>
  Podcast.find({}, sanitized ? projection : null)
    .populate(
      'parts',
      sanitized ? { ...partProjection, podcast: false } : { podcast: false }
    )
    .exec()
    .catch((error) => {
      logger.error('Podcast Find Error', error);
      return Boom.boomify(error);
    });
/**
 * Return a specific podcast
 *
 * @param {String} id
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {Podcast}
 */
export const findOne = (id, sanitized = true) =>
  Podcast.findOne({ _id: id }, sanitized ? projection : null)
    .populate(
      'parts',
      sanitized ? { ...partProjection, podcast: false } : { podcast: false }
    )
    .exec()
    .catch((error) => {
      logger.error('Podcast FindOne', error);
      return Boom.boomify(error);
    });

/**
 * Create a podcast
 *
 * @param {Object} data
 * @param {String} data.name
 * @param {Number} data.edition
 * @param {Array<String>} data.parts
 * @param {Array<String>} data.tags
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {Podcast}
 */
export const create = (
  { name, edition, parts = [], tags = [] },
  sanitized = true
) =>
  Podcast.create({
    name,
    edition,
    parts,
    tags
  })
    .then((podcast) =>
      sanitized ? _.omit(podcast.toObject(), hiddenFields) : podcast
    )
    .catch((error) => {
      if (error.name === 'ValidationError') {
        logger.error('Podcast Create Validation Error', error);
        const response = Boom.boomify(error, { statusCode: 409 });
        response.output.payload.data = error.errors;

        return response;
      }

      logger.error('Podcast Create Error', error);
      return Boom.boomify(error);
    });

/**
 * Update a specific podcast
 *
 * @param {String} id
 * @param {Object} data
 * @param {String} data.name
 * @param {Number} data.edition
 * @param {Array<String>} data.parts
 * @param {Array<String>} data.tags
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {Podcast}
 */
export const update = (id, { name, edition, parts, tags }, sanitized = true) =>
  Podcast.updateOne(
    { _id: id },
    _.omitBy(
      {
        name,
        edition,
        parts,
        tags
      },
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

      const podcast = await findOne(id, sanitized);
      return podcast;
    })
    .catch((error) => {
      if (error.name === 'ValidationError') {
        logger.error('Podcast Update Validation Error', error);
        const response = Boom.boomify(error, { statusCode: 409 });
        response.output.payload.data = error.errors;

        return response;
      }

      logger.error('Podcast Update Error', error);
      return Boom.boomify(error);
    });

/**
 * Delete podcasts
 *
 * @param {Array<String>} ids
 *
 * @return {Promise<Object>}
 */
export const remove = (ids) =>
  Podcast.deleteMany({ _id: { $in: ids.filter((x) => x) } })
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
      logger.error('Podcast Remove Error', error);
      return Boom.boomify(error);
    });

export default {
  find,
  findOne,
  create,
  update,
  remove
};
