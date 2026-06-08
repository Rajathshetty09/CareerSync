import Joi from 'joi';
import { EMPLOYMENT_TYPES } from '../../constants/index.js';

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50).trim(),

  profile: Joi.object({
    bio:      Joi.string().max(300).trim().allow(''),
    location: Joi.string().max(100).trim().allow(''),
    phone:    Joi.string().max(20).trim().allow(''),
    website:  Joi.string().uri().trim().allow(''),
    linkedin: Joi.string().uri().trim().allow(''),
    github:   Joi.string().uri().trim().allow(''),
  }),
}).min(1); // at least one field required

export const updateSkillsSchema = Joi.object({
  skills: Joi.array()
    .items(Joi.string().trim().lowercase().min(1).max(50))
    .max(100)
    .required()
    .messages({ 'any.required': 'Skills array is required' }),
});

export const experienceSchema = Joi.object({
  company:     Joi.string().trim().max(100).required(),
  role:        Joi.string().trim().max(100).required(),
  from:        Joi.date().max('now').required().messages({
    'date.max': 'Start date cannot be in the future',
  }),
  to:          Joi.date().min(Joi.ref('from')).when('current', {
    is: false,
    then: Joi.required(),
  }).messages({
    'date.min': 'End date must be after the start date',
  }),
  current:     Joi.boolean().default(false),
  description: Joi.string().trim().max(500).allow(''),
});

export const updatePreferencesSchema = Joi.object({
  jobTypes: Joi.array()
    .items(Joi.string().valid(...Object.values(EMPLOYMENT_TYPES))),
  locations: Joi.array().items(Joi.string().trim().max(100)),
  salaryMin: Joi.number().min(0),
  remote:    Joi.boolean(),
  notifications: Joi.object({
    email:               Joi.boolean(),
    jobAlerts:           Joi.boolean(),
    applicationUpdates:  Joi.boolean(),
  }),
});
