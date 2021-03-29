import mongoose from 'mongoose';
import joigoose from 'joigoose';
import { logger } from '@cosy/logger';
import arrayToProjection from '@cosy/array-to-projection';
import mongooseUniqueValidator from 'mongoose-unique-validator';
import PodcastSchema, { hiddenProperties } from '../schemas/PodcastSchema';

// prettier-ignore
export const hiddenFields = [
  ...hiddenProperties,
  'createdAt',
  'updatedAt',
  '__v'
];

export const projection = arrayToProjection(hiddenFields);

const schema = new mongoose.Schema(joigoose(mongoose).convert(PodcastSchema), {
  timestamps: true
});

// Beautify E11000 errors for 'uniqueness' of fields
schema.plugin(mongooseUniqueValidator);

// Cascade Delete
schema.pre('deleteMany', async function preDeleteManyMiddelware(next) {
  try {
    // Avoid circular dependencies
    const { Part } = this.mongooseCollection.conn.models;
    // Parts ids (should always be defined since PodcastController is always fed with array)
    const ids = this._conditions._id.$in;
    const podcasts = await Promise.all(ids.map((id) => this.model.findById(id)));
    const partsIds = podcasts.reduce((acc, curr) => {
      return [...acc, ...(curr?.parts ?? [])];
    }, []);

    await Part.deleteMany({ _id: { $in: partsIds } }).exec();
  } catch (error) /* istanbul ignore next */ {
    logger.warn('Podcast Cascade Delete Error', error);
  } finally {
    next();
  }
});

export default mongoose.model('Podcast', schema);
