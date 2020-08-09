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
    },
    edition: {
      type: Number,
      required: true,
      unique: true
    },
    parts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Part'
      }
    ],
    tags: [
      {
        type: String
      }
    ]
  },
  {
    timestamps: true
  }
);

// This allow for beautified E11000 errors for 'uniqueness' of fields
schema.plugin(mongooseUniqueValidator);

// Cascade Delete
schema.pre('deleteMany', async function preDeleteManyMiddelware(next) {
  try {
    const Part = _.get(this, ['mongooseCollection', 'conn', 'models', 'Part']);
    const ids = _.get(this, ['_conditions', '_id', '$in'], []);
    const podcasts = await Promise.all(
      ids.map((id) => this.model.findById(id))
    );
    const partsIds = podcasts.reduce(
      (curr, acc) => [...curr, ..._.get(acc, ['parts'], [])],
      []
    );

    await Part.deleteMany({ _id: { $in: partsIds } }).exec();

    next();
  } catch (e) {
    next(Boom.boomify(e));
  }
});

export default mongoose.model('Podcast', schema);
