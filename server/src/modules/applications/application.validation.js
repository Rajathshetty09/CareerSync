import Joi from 'joi';
import { APPLICATION_STATUS } from '../../constants/index.js';

const statusValues = Object.values(APPLICATION_STATUS);
const objectId = Joi.string().hex().length(24);

export const createApplicationSchema = Joi.object({
  jobId:       objectId.required(),
  resumeId:    objectId,
  status:      Joi.string().valid(...statusValues).default(APPLICATION_STATUS.APPLIED),
  coverLetter: Joi.string().max(5000).allow('').default(''),
  notes:       Joi.string().max(2000).allow('').default(''),
});

export const updateApplicationSchema = Joi.object({
  status:      Joi.string().valid(...statusValues),
  notes:       Joi.string().max(2000).allow(''),
  coverLetter: Joi.string().max(5000).allow(''),
  resumeId:    objectId.allow(null),
}).min(1);
