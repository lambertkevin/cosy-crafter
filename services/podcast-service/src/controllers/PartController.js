import fs from 'fs';
import _ from 'lodash';
import Boom from '@hapi/boom';
import FormData from 'form-data';
import { logger } from '@cosy/logger';
import CustomError from '@cosy/custom-error';
import { makeAxiosInstance, axiosErrorBoomifier } from '@cosy/axios-utils';
import { projection as podcastProjection } from '../models/PodcastModel';
import { projection as sectionProjection } from '../models/SectionModel';
import Part, { projection, hiddenFields } from '../models/PartModel';
import * as PodcastController from './PodcastController';
import * as SectionController from './SectionController';
import { tokens, refresh } from '../auth';

const { STORAGE_SERVICE_NAME, STORAGE_SERVICE_PORT } = process.env;

/**
 * Return a list of all part
 *
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {[Part]}
 */
export const find = (sanitized = true) =>
  Part.find({}, sanitized ? projection : {})
    .populate('podcast', { ...podcastProjection, parts: false })
    .populate('section', sectionProjection)
    .exec()
    .catch((error) => {
      logger.error('Part Find Error', error);
      return Boom.boomify(error);
    });

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
    .populate('section', sectionProjection)
    .exec()
    .catch((error) => {
      logger.error('Part FindOne Error', error);
      return Boom.boomify(error);
    });

/**
 * Create a part
 *
 * @param {Object} data
 * @param {String} data.name
 * @param {String} data.section
 * @param {String} data.podcast
 * @param {Array<String>|String} data.tags
 * @param {Object} data.file [Result of file upload]
 * @param {Boolean} sanitized
 *
 * @return {Promise<Object>} {Part}
 */
export const create = async (
  { name, section: sectionId, podcast: podcastId, tags: _tags = [], file },
  sanitized = true
) => {
  let podcast;

  try {
    const dependencies = await Promise.all([
      SectionController.findOne(sectionId),
      PodcastController.findOne(podcastId)
    ]);
    // eslint-disable-next-line prefer-destructuring
    podcast = dependencies[1];
    const dependenciesErrors = dependencies.filter((x) => x instanceof Error);
    if (dependenciesErrors.length) {
      return Boom.notAcceptable("At least one dependency doesn't exist");
    }
  } catch (error) {
    logger.error('Part Create Dependencies Error', error);
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
    const axiosAsService = makeAxiosInstance(refresh);

    let savedFile;
    if (process.env.NODE_ENV === 'test') {
      savedFile = {
        storageType: 'local',
        location: 'integration-test',
        filename: 'integration-test.mp3',
        publicLink: 'integration-test'
      };
    } else {
      const savingFile = await axiosAsService.post(
        `http://${STORAGE_SERVICE_NAME}:${STORAGE_SERVICE_PORT}/v1/podcast-parts`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            authorization: tokens.accessToken
          },
          maxBodyLength: 200 * 1024 * 1024, // 200MB max part size
          maxContentLength: 200 * 1024 * 1024 // 200MB max part size
        }
      );
      savedFile = _.get(savingFile, ['data', 'data'], {});
    }

    if (_.isEmpty(savedFile)) {
      throw new CustomError(
        'An error occured while saving the file',
        'FileSavingError'
      );
    }

    return Part.create({
      name,
      section: sectionId,
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
        sanitized ? _.omit(part.toObject(), hiddenFields) : part
      )
      .catch((error) => {
        if (error.name === 'ValidationError') {
          logger.error('Part Create Validation Error', error);
          const response = Boom.boomify(error, { statusCode: 409 });
          response.output.payload.data = error.errors;
          const {
            storageType,
            location: storagePath,
            filename: storageFilename
          } = savedFile;

          if (storageType && storagePath && storageFilename) {
            // Delete the saved file since the Part isn't validated
            axiosAsService
              .delete(
                `http://${STORAGE_SERVICE_NAME}:${STORAGE_SERVICE_PORT}/v1/podcast-parts`,
                {
                  data: {
                    storageType,
                    storagePath,
                    storageFilename
                  },
                  headers: {
                    authorization: tokens.accessToken
                  }
                }
              )
              .catch((err) => {
                logger.error("Couln't delete podcast parts in storage", err);
              });
          }

          return response;
        }

        logger.error('Part Create Error', error);
        return Boom.boomify(error);
      });
  } catch (error) {
    logger.error('Part Create Upload In Storage Error', error);
    if (error.isAxiosError) {
      return axiosErrorBoomifier(error);
    }

    return Boom.boomify(error);
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

  const {
    name,
    section: sectionId,
    podcast: podcastId,
    tags: _tags,
    file
  } = payload;
  // Test part existence
  let part;
  try {
    part = await Part.findById(id);

    if (!part) {
      return Boom.notFound();
    }
  } catch (error) {
    logger.error("Part Update Error: Part doesn't exist", { payload, error });
    return Boom.boomify(error);
  }

  // Test dependencies existence
  let podcast;
  try {
    // We get the desired podcast to use its name later on
    podcast = await PodcastController.findOne(podcastId || part.podcast);

    if (podcast instanceof Error) {
      throw podcast;
    }

    if (!podcast) {
      throw Boom.notFound();
    }
  } catch (error) {
    logger.error("Part Update Error: Podcast doesn't exist", {
      payload,
      error
    });
    return Boom.notAcceptable("At least one dependency doesn't exist");
  }

  if (sectionId) {
    try {
      const section = await SectionController.findOne(sectionId);

      if (section instanceof Error) {
        throw section;
      }

      if (!section) {
        throw Boom.notFound();
      }
    } catch (error) {
      logger.error("Part Update Error: Section doesn't exist", {
        payload,
        error
      });
      return Boom.notAcceptable("At least one dependency doesn't exist");
    }
  }

  // Process update
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
    const axiosAsService = makeAxiosInstance(refresh);

    if (
      storageType &&
      storagePath &&
      storageFilename &&
      process.env.NODE_ENV !== 'test'
    ) {
      axiosAsService
        .delete(
          `http://${STORAGE_SERVICE_NAME}:${STORAGE_SERVICE_PORT}/v1/podcast-parts`,
          {
            data: {
              storageType,
              storagePath,
              storageFilename
            }
          },
          {
            headers: {
              authorization: tokens.accessToken
            }
          }
        )
        .catch((error) => {
          logger.error(
            "Part Update Error: Couldn't delete old files from storage",
            { payload, error }
          );
        });
    }

    // Then upload new file
    const { headers, filename } = file;
    const formData = new FormData();
    formData.append('podcastName', podcast.name);
    formData.append('filename', filename);
    formData.append('file', fs.createReadStream(file.path));

    try {
      let savedFile;
      if (process.env.NODE_ENV === 'test') {
        savedFile = {
          storageType: 'local',
          location: 'integration-test',
          filename: 'integration-test.mp3',
          publicLink: 'integration-test'
        };
      } else {
        const storageRequest = await axiosAsService.post(
          `http://${STORAGE_SERVICE_NAME}:${STORAGE_SERVICE_PORT}/v1/podcast-parts`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              authorization: tokens.accessToken
            },
            maxBodyLength: 200 * 1024 * 1024, // 200MB max part size
            maxContentLength: 200 * 1024 * 1024 // 200MB max part size
          }
        );
        savedFile = storageRequest.data;
      }

      fileInfos = {
        originalFilename: filename,
        storageType: savedFile.storageTypefilename,
        storagePath: savedFile.locationfilename,
        storageFilename: savedFile.filename,
        publicLink: savedFile.publicLinkfilename,
        contentType: headers['content-type']
      };
    } catch (error) {
      logger.error('Part Upload In Storage Error', error);
      return Boom.boomify(error);
    }
  }

  return Part.updateOne(
    { _id: id },
    _.omitBy(
      {
        name,
        section: sectionId,
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
        logger.error('Part Update Validation Error', error);
        const response = Boom.boomify(error, { statusCode: 409 });
        response.output.payload.data = error.errors;

        return response;
      }
      logger.error('Part Update Error', error);
      return Boom.boomify(error);
    });
};

/**
 * Delete parts
 *
 * @param {Array<String>} ids
 *
 * @return {Promise<Object>}
 */
export const remove = (ids) =>
  Part.deleteMany({ _id: { $in: ids.filter((x) => x) } })
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
      logger.error('Part Remove Error', error);
      return Boom.boomify(error);
    });

export default {
  find,
  findOne,
  create,
  update,
  remove
};
