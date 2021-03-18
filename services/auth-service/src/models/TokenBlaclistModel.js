import mongoose from 'mongoose';
import joigoose from 'joigoose';
import mongooseUniqueValidator from 'mongoose-unique-validator';
import TokenBlacklistSchema, {
  hiddenProperties
} from '../schemas/TokenBlacklistSchema';
import arrayToProjection from 'array-to-projection';

export const hiddenFields = [...hiddenProperties, 'updatedAt', '__v'];

export const projection = arrayToProjection(hiddenFields);

const schema = new mongoose.Schema(
  joigoose(mongoose, { timestamps: true }).convert(TokenBlacklistSchema)
);

// This allow for beautified E11000 errors for 'uniqueness' of fields
schema.plugin(mongooseUniqueValidator);

export default mongoose.model('Token', schema);
