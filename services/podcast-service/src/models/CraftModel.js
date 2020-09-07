import _ from 'lodash';
import axios from 'axios';
import mongoose from 'mongoose';
import joigoose from 'joigoose';
import mongooseUniqueValidator from 'mongoose-unique-validator';
import CraftSchema, { hiddenProperties } from '../schemas/CraftSchema';
import arrayToProjection from '../utils/ArrayToProjection';
import { logger } from '../utils/Logger';
import { tokens } from '../auth';

export const hiddenFields = [...hiddenProperties, 'updatedAt', '__v'];

export const projection = arrayToProjection(hiddenFields);

const schema = new mongoose.Schema(
  joigoose(mongoose, { _id: true, timestamps: true }).convert(CraftSchema)
);

// This allow for beautified E11000 errors for 'uniqueness' of fields
schema.plugin(mongooseUniqueValidator);

// Remove all files related to crafts
schema.pre('deleteMany', async function preDeleteManyMiddelware(next) {
  try {
    const ids = _.get(this, ['_conditions', '_id', '$in'], []);
    const parts = await Promise.all(
      ids.map((id) => this.model.findById(id))
    ).then((_parts) => _parts.filter((x) => x));

    const deletions = parts.map(
      ({ storageType, storagePath, storageFilename }) => {
        return storageType && storagePath && storageFilename
          ? axios.delete(
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
          : Promise.resolve();
      }
    );

    await Promise.allSettled(deletions);
  } catch (error) {
    logger.warn(
      "Craft Cascade Delete Error: Error while deleting crafts' files from storage",
      error
    );
  } finally {
    next();
  }
});

export default mongoose.model('Craft', schema);