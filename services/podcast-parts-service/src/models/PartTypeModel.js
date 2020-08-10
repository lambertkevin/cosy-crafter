import _ from 'lodash';
import Boom from '@hapi/boom';
import mongoose from 'mongoose';
import mongooseUniqueValidator from 'mongoose-unique-validator';
import arrayToProjection from '../utils/arrayToProjection';

export const hiddenFields = ['createdAt', 'updatedAt', '__v'];

export const projection = arrayToProjection(hiddenFields);

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true
    }
  },
  {
    timestamps: true
  }
);

// This allow for beautified E11000 errors for 'uniqueness' of fields
schema.plugin(mongooseUniqueValidator);

// Cascade delete
schema.pre('deleteMany', async function preDeleteManyMiddelware(next) {
  try {
    const Part = _.get(this, ['mongooseCollection', 'conn', 'models', 'Part']);
    const ids = _.get(this, ['_conditions', '_id', '$in'], []);
    const parts = await Part.find({ type: { $in: ids } });

    await Part.deleteMany({ _id: { $in: parts.map((x) => x._id) } }).exec();

    next();
  } catch (e) {
    next(Boom.boomify(e));
  }
});

export default mongoose.model('PartType', schema);
