import mongoose from 'mongoose';
import joigoose from 'joigoose';
import arrayToProjection from '@cosy/array-to-projection';
import mongooseUniqueValidator from 'mongoose-unique-validator';
import ServiceSchema, { hiddenProperties } from '../schemas/ServiceSchema';

// prettier-ignore
export const hiddenFields = [
  ...hiddenProperties,
  'createdAt',
  'updatedAt',
  '__v'
];

export const projection = arrayToProjection(hiddenFields);

const schema = new mongoose.Schema(joigoose(mongoose).convert(ServiceSchema), {
  timestamps: true
});

// This allow for beautified E11000 errors for 'uniqueness' of fields
schema.plugin(mongooseUniqueValidator);

export default mongoose.model('Service', schema);
