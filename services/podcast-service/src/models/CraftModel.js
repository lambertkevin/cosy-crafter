import axios from 'axios';
import mongoose from 'mongoose';
import joigoose from 'joigoose';
import { tokens } from '@cosy/auth';
import { logger } from '@cosy/logger';
import arrayToProjection from '@cosy/array-to-projection';
import mongooseUniqueValidator from 'mongoose-unique-validator';
import CraftSchema, { hiddenProperties } from '../schemas/CraftSchema';

// prettier-ignore
export const hiddenFields = [
  ...hiddenProperties,
  'updatedAt',
  '__v'
];

export const projection = arrayToProjection(hiddenFields);

const schema = new mongoose.Schema(joigoose(mongoose).convert(CraftSchema), {
  timestamps: true
});

// Beautify E11000 errors for 'uniqueness' of fields
schema.plugin(mongooseUniqueValidator);

// Remove all files related to crafts
schema.pre('deleteMany', async function preDeleteManyMiddelware(next) {
  try {
    // Parts ids (should always be defined since CraftController is always fed with array)
    const ids = this._conditions._id.$in;
    const craftsPromises = ids.map((id) => this.model.findById(id));
    const crafts = await Promise.all(craftsPromises).then((partsData) =>
      partsData.filter((x) => x)
    );

    const deletions = crafts.map(({ storageType, storagePath, storageFilename }) =>
      axios.delete(
        `http://${process.env.STORAGE_SERVICE_NAME}:${process.env.STORAGE_SERVICE_PORT}/v1/crafts`,
        {
          data: {
            storageType,
            storagePath,
            storageFilename
          }
        },
        {
          headers: {
            authorization: tokens.accessToken
          }
        }
      )
    );

    await Promise.allSettled(deletions);
  } catch (error) /* istanbul ignore next */ {
    logger.warn(
      "Craft Cascade Delete Error: Error while deleting crafts' files from storage",
      error
    );
  } finally {
    next();
  }
});

export default mongoose.model('Craft', schema);
