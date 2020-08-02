import _ from 'lodash';
import Boom from '@hapi/boom';
import calibrate from 'calibrate';
import Podcast, { projection, hiddenFields } from '../models/PodcastModel';
import { projection as partProjection } from '../models/PartModel';

/**
 * Return a list of all podcasts
 * @return {Promise<Object[]>} {[Podcast]}
 */
export const find = () => Podcast.find({}, projection)
  .populate('parts', { ...partProjection, podcast: false })
  .exec()
  .then(calibrate.response)
  .catch(Boom.boomify);

/**
 * Return a specific podcast
 * @param {String} id
 * @return {Promise<Object>} {Podcast}
 */
export const findOne = (id) => Podcast.findOne({ _id: id }, projection)
  .populate('parts', { ...partProjection, podcast: false })
  .exec()
  .then(calibrate.response)
  .catch(Boom.boomify);

/**
 * Create a podcast
 * @param {Object} data
 * @return {Promise<Object>} {Podcast}
 */
export const create = ({
  name,
  edition,
  parts,
  tags
}) => Podcast.create({
  name,
  edition,
  parts,
  tags
}).then((podcast) => calibrate.response(_.omit(podcast.toObject(), hiddenFields)))
  .catch((error) => {
    if (error.name === 'ValidationError') {
      const response =  Boom.boomify(error, { statusCode: 409 });
      response.output.payload.data = error.errors;

      return response;
    }

    return Boom.boomify(error);
  });

/**
 * Update a specific podcast
 * @param {String} id
 * @param {Object} data
 * @return {Promise<Object>} {Podcast}
 */
export const update = (id, {
  name,
  edition,
  parts,
  tags
}) => Podcast.updateOne({ _id: id }, _.omitBy({
  name,
  edition,
  parts,
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

    const podcast = await findOne(id);
    return podcast;
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
 * Create a podcast
 * @param {Array<String>} ids
 * @return {Promise<void>}
 */
export const remove = (ids) => Podcast.deleteMany({ _id: { $in: ids } })
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
