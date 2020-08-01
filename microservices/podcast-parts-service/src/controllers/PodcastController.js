import _ from 'lodash';
import Boom from '@hapi/boom';
import mongoose from 'mongoose';
import calibrate from 'calibrate';
import Podcast, { projection, hiddenFields } from '../models/PodcastModel';

/**
 * Return a list of all podcasts
 * @return {Promise<Object[]>} {[Podcast]}
 */
export const find = () => Podcast.find({}, projection)
  .exec()
  .then(calibrate.response)
  .catch(Boom.boomify);

/**
 * Return a specific podcast
 * @param {String} id
 * @return {Promise<Object>} {Podcast}
 */
export const findOne = (id) => Podcast.findOne({ _id: id }, projection)
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
}) => Podcast.updateOne({ _id: id }, {
  name,
  edition,
  parts,
  tags
})
  .exec()
  .then((podcast) => calibrate.response(_.omit(podcast.toObject(), hiddenFields)))
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
 * @param {String} id
 * @return {Promise<void>}
 */
export const remove = (id) => Podcast.deleteOne({ _id: id })
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
