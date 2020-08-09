import fs from 'fs';
import _ from 'lodash';
import axios from 'axios';
import Boom from '@hapi/boom';
import FormData from 'form-data';
import calibrate from 'calibrate';
import * as PodcastController from './PodcastController';
import * as PartTypeController from './PartTypeController';
import Part, { projection, hiddenFields } from '../models/PartModel';
import { projection as podcastProjection } from '../models/PodcastModel';
import { projection as partTypeProjection } from '../models/PartTypeModel';

/**
 * Return a list of all part
 * @return {Promise<Object[]>} {[Part]}
 */
export const find = () => Part.find({}, projection)
  .populate('podcast', { ...podcastProjection, parts: false })
  .populate('type', partTypeProjection)
  .exec()
  .then(calibrate.response)
  .catch(Boom.boomify);

/**
 * Return a specific part
 * @param {String} id
 * @return {Promise<Object>} {Part}
 */
export const findOne = (id) => Part.findOne({ _id: id }, projection)
  .populate('podcast', { ...podcastProjection, parts: false })
  .populate('type', partTypeProjection)
  .exec()
  .then(calibrate.response)
  .catch(Boom.boomify);

/**
 * Create a part
 * @param {Object} payload
 * @return {Promise<Object>} {Part}
 */
export const create = async (payload) => {
  const {
    name,
    type,
    podcast: podcastId,
    tags: stringTags = '',
    file
  } = payload;
  let podcast;

  try {
    const dependencies = await Promise.all([
      PartTypeController.findOne(type),
      PodcastController.findOne(podcastId)
    ]);
    // eslint-disable-next-line prefer-destructuring
    podcast = dependencies[1].data;
    const dependenciesErrors = dependencies.filter((x) => x instanceof Error);
    if (dependenciesErrors.length) {
      return Boom.notAcceptable('At least one dependency doesn\'t exist');
    }
  } catch (error) {
    return error;
  }

  const tags = stringTags.split(',').map((x) => x.trim());
  const { filename } = file;

  const formData = new FormData();
  formData.append('podcastName', podcast.name);
  formData.append('filename', filename);
  formData.append('file', fs.createReadStream(file.path));

  try {
    const { data: savedFile } = await axios.post('http://storage-service:3001/podcast-part', formData, {
      headers: formData.getHeaders()
    });

    return Part.create({
      name,
      type,
      podcast,
      tags,
      originalFilename: filename,
      storageType: savedFile.storageType,
      storagePath: savedFile.location,
      storageFilename: savedFile.filename
    })
      .then((part) => calibrate.response(_.omit(part.toObject(), hiddenFields)))
      .catch((error) => {
        if (error.name === 'ValidationError') {
          const response =  Boom.boomify(error, { statusCode: 409 });
          response.output.payload.data = error.errors;

          return response;
        }

        /** @WARNING Remember to remove file when the api is available */

        return Boom.boomify(error);
      });
  } catch (error) {
    const storageServiceError = _.get(error, ['response', 'data']);

    return new Boom.Boom(storageServiceError.message, storageServiceError) || Boom.boomify(error);
  }
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
  tags,
  originalFilename,
  storageType,
  storagePath,
  storageFilename
}) => Part.updateOne({ _id: id }, _.omitBy({
  name,
  type,
  podcast,
  tags,
  originalFilename,
  storageType,
  storagePath,
  storageFilename
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
 * @param {Array<String>} ids
 * @return {Promise<void>}
 */
export const remove = (ids) => Part.deleteMany({ _id: { $in: ids } })
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
