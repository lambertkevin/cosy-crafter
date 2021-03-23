import mongoose from 'mongoose';
import joigoose from 'joigoose';
import arrayToProjection from '@cosy/array-to-projection';
import mongooseUniqueValidator from 'mongoose-unique-validator';
import TokenBlacklistSchema, {
  hiddenProperties
} from '../schemas/TokenBlacklistSchema';

export const hiddenFields = [...hiddenProperties, 'updatedAt', '__v'];

export const projection = arrayToProjection(hiddenFields);

const schema = new mongoose.Schema(
  joigoose(mongoose).convert(TokenBlacklistSchema),
  { timestamps: true }
);

// This allow for beautified E11000 errors for 'uniqueness' of fields
schema.plugin(mongooseUniqueValidator);

export default mongoose.model('Token', schema);
