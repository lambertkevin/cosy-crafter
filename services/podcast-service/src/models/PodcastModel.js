import _ from 'lodash';
import mongoose from 'mongoose';
import joigoose from 'joigoose';
import arrayToProjection from 'array-to-projection';
import mongooseUniqueValidator from 'mongoose-unique-validator';
import PodcastSchema, { hiddenProperties } from '../schemas/PodcastSchema';
import { logger } from '../utils/Logger';

export const hiddenFields = [
  ...hiddenProperties,
  'createdAt',
  'updatedAt',
  '__v'
];

export const projection = arrayToProjection(hiddenFields);

const schema = new mongoose.Schema(
  joigoose(mongoose, { _id: true, timestamps: true }).convert(PodcastSchema)
);

// This allow for beautified E11000 errors for 'uniqueness' of fields
schema.plugin(mongooseUniqueValidator);

// Cascade Delete
schema.pre('deleteMany', async function preDeleteManyMiddelware(next) {
  try {
    const Part = _.get(this, ['mongooseCollection', 'conn', 'models', 'Part']);
    const ids = _.get(this, ['_conditions', '_id', '$in'], []);
    const podcasts = await Promise.all(
      ids.map((id) => this.model.findById(id))
    );
    const partsIds = podcasts.reduce((acc, curr) => {
      return [...acc, ..._.get(curr, ['parts'], [])];
    }, []);

    await Part.deleteMany({ _id: { $in: partsIds } }).exec();
  } catch (error) {
    logger.warn('Podcast Cascade Delete Error', error);
  } finally {
    next();
  }
});

export default mongoose.model('Podcast', schema);
