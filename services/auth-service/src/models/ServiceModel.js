import mongoose from 'mongoose';
import joigoose from 'joigoose';
import mongooseUniqueValidator from 'mongoose-unique-validator';
import ServiceSchema, { hiddenProperties } from '../schemas/ServiceSchema';
import arrayToProjection from '../utils/ArrayToProjection';

export const hiddenFields = [
  ...hiddenProperties,
  '_id',
  'createdAt',
  'updatedAt',
  '__v'
];

export const projection = arrayToProjection(hiddenFields);

const schema = new mongoose.Schema(
  joigoose(mongoose, { timestamps: true }).convert(ServiceSchema)
);

// This allow for beautified E11000 errors for 'uniqueness' of fields
schema.plugin(mongooseUniqueValidator);

export default mongoose.model('Service', schema);
