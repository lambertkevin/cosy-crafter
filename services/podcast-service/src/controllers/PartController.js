import fs from 'fs';
import _ from 'lodash';
import axios from 'axios';
import Boom from '@hapi/boom';
import FormData from 'form-data';
import calibrate from 'calibrate';
import * as PodcastController from './PodcastController';
import * as PartTypeController from './PartTypeController';
import axiosErrorBoomifier from '../utils/axiosErrorBoomifier';
import Part, { projection, hiddenFields } from '../models/PartModel';
import { projection as podcastProjection } from '../models/PodcastModel';
import { projection as partTypeProjection } from '../models/PartTypeModel';

/**
 * Return a list of all part
 *
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object[]>} {[Part]}
 */
export const find = (sanitized = true) =>
  Part.find({}, sanitized ? projection : {})
    .populate('podcast', { ...podcastProjection, parts: false })
    .populate('type', partTypeProjection)
    .exec()
    .then(calibrate.response)
    .catch(Boom.boomify);

/**
 * Return a specific part
 *
 * @param {String} id
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {Part}
 */
export const findOne = (id, sanitized = true) =>
  Part.findOne({ _id: id }, sanitized ? projection : {})
    .populate('podcast', { ...podcastProjection, parts: false })
    .populate('type', partTypeProjection)
    .exec()
    .then(calibrate.response)
    .catch(Boom.boomify);

/**
 * Create a part
 *
 * @param {Object} data
 * @param {String} data.name
 * @param {String} data.type
 * @param {String} data.podcast
 * @param {Array<String>|String} data.tags
 * @param {ReadableStream} data.file
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {Part}
 */
export const create = async (
  { name, type, podcast: podcastId, tags: _tags = [], file },
  sanitized = true
) => {
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
      return Boom.notAcceptable("At least one dependency doesn't exist");
    }
  } catch (error) {
    return error;
  }

  const tags =
    typeof _tags === 'string'
      ? Array.from(
          new Set(
            _tags
              .split(',')
              .map((x) => x.trim())
              .filter((x) => x)
          )
        )
      : Array.from(new Set(_tags));
  const { headers, filename } = file;

  const formData = new FormData();
  formData.append('podcastName', podcast.name);
  formData.append('filename', filename);
  formData.append('file', fs.createReadStream(file.path));

  try {
    const { data: savedFile } = await axios.post(
      'http://storage-service:3001/podcast-part',
      formData,
      {
        headers: formData.getHeaders(),
        maxBodyLength: 200 * 1024 * 1024, // 200MB max part size
        maxContentLength: 200 * 1024 * 1024 // 200MB max part size
      }
    );

    return Part.create({
      name,
      type,
      podcast: podcastId,
      tags,
      originalFilename: filename,
      storageType: savedFile.storageType,
      storagePath: savedFile.location,
      storageFilename: savedFile.filename,
      publicLink: savedFile.publicLink,
      contentType: headers['content-type']
    })
      .then((part) =>
        calibrate.response(
          sanitized ? _.omit(part.toObject(), hiddenFields) : part
        )
      )
      .catch((error) => {
        if (error.isAxiosError) {
          return axiosErrorBoomifier(error);
        }

        if (error.name === 'ValidationError') {
          const response = Boom.boomify(error, { statusCode: 409 });
          response.output.payload.data = error.errors;
          const {
            storageType,
            location: storagePath,
            filename: storageFilename
          } = savedFile;

          if (storageType && storagePath && storageFilename) {
            // Delete the saved file since the Part isn't validated
            axios.delete('http://storage-service:3001/podcast-part', {
              data: {
                storageType,
                storagePath,
                storageFilename
              }
            });
          }

          return response;
        }

        return Boom.boomify(error);
      });
  } catch (error) {
    return axiosErrorBoomifier(error);
  }
};

/**
 * Update a specific part
 *
 * @param {String} id
 * @param {Object} payload
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {Part}
 */
export const update = async (id, payload, sanitized = true) => {
  if (!payload || _.isEmpty(payload)) {
    return Boom.expectationFailed('No changes required');
  }

  const { name, type, podcast: podcastId, tags: _tags, file } = payload;
  // First test part existence
  let part;
  try {
    part = await Part.findById(id);
    if (!part) {
      return Boom.notFound();
    }
  } catch (e) {
    return Boom.boomify(e);
  }

  // Then test dependencies existence
  let podcast;
  // We get the new or old podcast (we'll need its name later on)
  try {
    const { data } = await PodcastController.findOne(podcastId || part.podcast);
    // eslint-disable-next-line prefer-destructuring
    podcast = data;
  } catch (error) {
    return Boom.notAcceptable("At least one dependency doesn't exist");
  }
  if (type) {
    try {
      await PartTypeController.findOne(type);
    } catch (error) {
      return Boom.notAcceptable("At least one dependency doesn't exist");
    }
  }

  // Process update
  try {
    let tags;
    if (typeof _tags === 'string' || _.isArray(_tags)) {
      // Transform tags as array if string
      tags =
        typeof _tags === 'string'
          ? Array.from(
              new Set(
                _tags
                  .split(',')
                  .map((x) => x.trim())
                  .filter((x) => x)
              )
            )
          : Array.from(new Set(_tags));
    }

    let fileInfos = {};
    if (file) {
      // Delete old file
      const { storageType, storagePath, storageFilename } = part;

      if (storageType && storagePath && storageFilename) {
        axios.delete('http://storage-service:3001/podcast-part', {
          data: {
            storageType,
            storagePath,
            storageFilename
          }
        });
      }

      // Then upload new file
      const { headers, filename } = file;
      const formData = new FormData();
      formData.append('podcastName', podcast.name);
      formData.append('filename', filename);
      formData.append('file', fs.createReadStream(file.path));

      const { data: savedFile } = await axios.post(
        'http://storage-service:3001/podcast-part',
        formData,
        {
          headers: formData.getHeaders(),
          maxBodyLength: 200 * 1024 * 1024, // 200MB max part size
          maxContentLength: 200 * 1024 * 1024 // 200MB max part size
        }
      );

      fileInfos = {
        originalFilename: filename,
        storageType: savedFile.storageTypefilename,
        storagePath: savedFile.locationfilename,
        storageFilename: savedFile.filename,
        publicLink: savedFile.publicLinkfilename,
        contentType: headers['content-type']
      };
    }

    return Part.updateOne(
      { _id: id },
      _.omitBy(
        {
          name,
          type,
          podcast: podcastId,
          tags,
          ...fileInfos
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

        const updatedPart = await findOne(id, sanitized);
        return updatedPart;
      })
      .catch((error) => {
        if (error.name === 'ValidationError') {
          const response = Boom.boomify(error, { statusCode: 409 });
          response.output.payload.data = error.errors;

          return response;
        }

        return Boom.boomify(error);
      });
  } catch (e) {
    return Boom.boomify(e);
  }
};

/**
 * Create a part
 * @param {Array<String>} ids
 * @return {Promise<void>}
 */
export const remove = (ids) =>
  Part.deleteMany({ _id: { $in: ids.filter((x) => x) } })
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
