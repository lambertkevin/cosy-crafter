import joigoose from 'joigoose';
import mongoose from 'mongoose';
import arrayToProjection from '@cosy/array-to-projection';
import mongooseUniqueValidator from 'mongoose-unique-validator';
import SectionSchema, { hiddenProperties } from '../schemas/SectionSchema';

export const hiddenFields = [...hiddenProperties, 'createdAt', 'updatedAt', '__v'];

export const projection = arrayToProjection(hiddenFields);

const schema = new mongoose.Schema(joigoose(mongoose).convert(SectionSchema), {
  timestamps: true
});

// Beautify E11000 errors for 'uniqueness' of fields
schema.plugin(mongooseUniqueValidator);

export default mongoose.model('Section', schema);
