import mongoose from 'mongoose';
import joigoose from 'joigoose';
import mongooseUniqueValidator from 'mongoose-unique-validator';
import CraftSchema, { hiddenProperties } from '../schemas/CraftSchema';
import arrayToProjection from '../utils/arrayToProjection';

export const hiddenFields = [...hiddenProperties, 'updatedAt', '__v'];

export const projection = arrayToProjection(hiddenFields);

const schema = new mongoose.Schema(
  joigoose(mongoose, { _id: true, timestamps: true }).convert(CraftSchema)
);

// This allow for beautified E11000 errors for 'uniqueness' of fields
schema.plugin(mongooseUniqueValidator);

// Cascade Delete
schema.pre('deleteMany', async function preDeleteManyMiddelware(next) {
  //
  next();
});

export default mongoose.model('Craft', schema);
