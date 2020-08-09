import Boom from '@hapi/boom';
import mongooseUniqueValidator from 'mongoose-unique-validator';
import mongoose from 'mongoose';
import Podcast from './PodcastModel';
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
    type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PartType'
    },
    podcast: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Podcast'
    },
    tags: [
      {
        type: String
      }
    ],
    originalFilename: {
      type: String,
      required: true
    },
    storageType: {
      type: String,
      enum: ['aws', 'scaleway', 'local'],
      default: 'local',
      required: true
    },
    storagePath: {
      type: String,
      required: true
    },
    storageFilename: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// This allow for beautified E11000 errors for 'uniqueness' of fields
schema.plugin(mongooseUniqueValidator);

// Cascade update to add part to podcast parts array
schema.post('validate', async (part, next) => {
  try {
    await Podcast.findOneAndUpdate(
      {
        _id: part.podcast
      },
      {
        $addToSet: {
          parts: part._id
        }
      }
    ).exec();

    next();
  } catch (e) {
    next(Boom.resourceGone('Error while updating the podcast'));
  }
});

export default mongoose.model('Part', schema);
