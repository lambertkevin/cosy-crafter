import mongoose from 'mongoose';
import mongooseUniqueValidator from 'mongoose-unique-validator';
import arrayToProjection from '../utils/arrayToProjection';

export const hiddenFields = [
  'createdAt',
  'updatedAt',
  '__v'
];

export const projection = arrayToProjection(hiddenFields);

const schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  }
}, {
  timestamps: true
});

// This allow for beautified E11000 errors for 'uniqueness' of fields
schema.plugin(mongooseUniqueValidator);

export default mongoose.model('PartType', schema);
