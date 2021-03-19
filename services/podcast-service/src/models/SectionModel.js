import _ from 'lodash';
import joigoose from 'joigoose';
import mongoose from 'mongoose';
import { logger } from '@cosy/logger';
import arrayToProjection from '@cosy/array-to-projection';
import mongooseUniqueValidator from 'mongoose-unique-validator';
import SectionSchema, { hiddenProperties } from '../schemas/SectionSchema';

export const hiddenFields = [
  ...hiddenProperties,
  'createdAt',
  'updatedAt',
  '__v'
];

export const projection = arrayToProjection(hiddenFields);

const schema = new mongoose.Schema(
  joigoose(mongoose, { _id: true, timestamps: true }).convert(SectionSchema)
);

// This allow for beautified E11000 errors for 'uniqueness' of fields
schema.plugin(mongooseUniqueValidator);

// Cascade delete
schema.pre('deleteMany', async function preDeleteManyMiddelware(next) {
  try {
    const Part = _.get(this, ['mongooseCollection', 'conn', 'models', 'Part']);
    const ids = _.get(this, ['_conditions', '_id', '$in'], []).filter((x) => x);
    const parts = await Part.find({ type: { $in: ids } });

    await Part.deleteMany({
      _id: { $in: parts.map((x) => x._id) }
    }).exec();
  } catch (error) {
    logger.warn('Section Cascade Delete Error', error);
  } finally {
    next();
  }
});

export default mongoose.model('Section', schema);
