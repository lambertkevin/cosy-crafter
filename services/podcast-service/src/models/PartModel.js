import _ from 'lodash';
import axios from 'axios';
import Boom from '@hapi/boom';
import mongoose from 'mongoose';
import joigoose from 'joigoose';
import { tokens } from '@cosy/auth';
import { logger } from '@cosy/logger';
import arrayToProjection from '@cosy/array-to-projection';
import mongooseUniqueValidator from 'mongoose-unique-validator';
import PartSchema, { hiddenProperties } from '../schemas/PartSchema';
import Podcast from './PodcastModel';

export const hiddenFields = [
  ...hiddenProperties,
  'createdAt',
  'updatedAt',
  '__v'
];

export const projection = arrayToProjection(hiddenFields);

const schema = new mongoose.Schema(joigoose(mongoose).convert(PartSchema), {
  timestamps: true
});

// This allow for beautified E11000 errors for 'uniqueness' of fields
schema.plugin(mongooseUniqueValidator);

// Cascade update to add part to podcast parts array
schema.post('validate', async (part, next) => {
  try {
    await Podcast.findOneAndUpdate(
      {
        _id: part.podcast
      },
      {
        $addToSet: {
          parts: part._id
        }
      }
    ).exec();

    next();
  } catch (e) {
    logger.error(
      'Part Cascade Update Error: Error while adding part to podcast'
    );
    next(Boom.resourceGone('Error while updating the podcast'));
  }
});

// Remove all files related to parts
schema.pre('deleteMany', async function preDeleteManyMiddelware(next) {
  try {
    const ids = _.get(this, ['_conditions', '_id', '$in'], []);
    const parts = await Promise.all(
      ids.map((id) => this.model.findById(id))
    ).then((_parts) => _parts.filter((x) => x));

    const deletions = parts.map(
      ({ storageType, storagePath, storageFilename }) => {
        return storageType && storagePath && storageFilename
          ? axios.delete(
              `http://${process.env.STORAGE_SERVICE_NAME}:${process.env.STORAGE_SERVICE_PORT}/v1/podcast-parts`,
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
          : Promise.resolve();
      }
    );

    await Promise.allSettled(deletions);
  } catch (error) {
    logger.warn(
      "Part Cascade Delete Error: Error while deleting parts' files from storage",
      error
    );
  } finally {
    next();
  }
});

export default mongoose.model('Part', schema);
