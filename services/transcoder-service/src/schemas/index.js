import joi from 'joi';

/**
 * JobId Schema
 *
 * @description UUIDV4
 */
export const jobIdSchema = joi.string().guid().required();

/**
 * File Schema
 *
 * @description { id: ObjectID(), type:'podcast-part' or 'user-input', ?seek: { ?start: 0, ?end: 10 ...} }
 */
export const fileSchema = joi
  .object({
    id: joi.string().length(24).required(),
    type: joi.string().valid('podcast-part', 'user-input').required(),
    seek: joi
      .object({
        start: joi.number().optional(),
        end: joi.number().optional()
      })
      .optional()
  })
  .unknown();

/**
 * Files Schema
 *
 * @description [File]
 */
export const filesSchema = joi.array().items(fileSchema).required();

/**
 * Job Name Schema
 *
 * @description String
 */
export const nameSchema = joi.string().required();

/**
 * Transcoding Job Payload Schema
 *
 * @description { files: [File], name: String, jobId: ObjectID }
 */
export const transcodeJobPayloadSchema = joi
  .object({
    jobId: jobIdSchema,
    name: nameSchema,
    files: filesSchema
  })
  .required();

/**
 * Socket Schema
 *
 * @description { id: any, handshake: {} ...}
 */
export const socketSchema = joi
  .object({
    id: joi.required(),
    handshake: joi.required()
  })
  .unknown()
  .required();
