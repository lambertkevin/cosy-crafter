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
}, {
  timestamps: true
});

// This allow for beautified E11000 errors for 'uniqueness' of fields
schema.plugin(mongooseUniqueValidator);

export default mongoose.model('Podcast', schema);
