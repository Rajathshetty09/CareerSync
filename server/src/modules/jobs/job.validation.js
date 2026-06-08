import Joi from 'joi';
import { JOB_SOURCES, EMPLOYMENT_TYPES } from '../../constants/index.js';

export const jobSearchSchema = Joi.object({
  keyword:       Joi.string().trim().max(200).allow(''),
  location:      Joi.string().trim().max(100).allow(''),
  source:        Joi.string().valid(...Object.values(JOB_SOURCES), '').allow(''),
  employmentType:Joi.string().valid(...Object.values(EMPLOYMENT_TYPES), '').allow(''),
  skills:        Joi.alternatives().try(
    Joi.array().items(Joi.string().trim()).max(20),
    Joi.string().trim(),
  ),
  salaryMin:     Joi.number().min(0),
  remote:        Joi.boolean(),
  postedWithin:  Joi.number().valid(1, 7, 14, 30, 90),
  sort:          Joi.string().valid('latest', 'relevance').default('latest'),
  page:          Joi.number().min(1).default(1),
  limit:         Joi.number().min(1).max(50).default(20),
});
