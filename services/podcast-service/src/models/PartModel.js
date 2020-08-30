import _ from 'lodash';
import axios from 'axios';
import Boom from '@hapi/boom';
import mongoose from 'mongoose';
import joigoose from 'joigoose';
import mongooseUniqueValidator from 'mongoose-unique-validator';
import PartSchema, { hiddenProperties } from '../schemas/PartSchema';
import arrayToProjection from '../utils/arrayToProjection';
import Podcast from './PodcastModel';

export const hiddenFields = [
  ...hiddenProperties,
  'createdAt',
  'updatedAt',
  '__v'
];

export const projection = arrayToProjection(hiddenFields);

const schema = new mongoose.Schema(
  joigoose(mongoose, { _id: true, timestamps: true }).convert(PartSchema)
);

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
              }
            )
          : Promise.resolve();
      }
    );

    await Promise.all(deletions);

    next();
  } catch (e) {
    if (e.isAxiosError) {
      next(
        Boom.failedDependency(
          'An error occured while deleting the parts files from storage',
          e
        )
      );
    } else {
      next(Boom.boomify(e));
    }
  }
});

export default mongoose.model('Part', schema);
