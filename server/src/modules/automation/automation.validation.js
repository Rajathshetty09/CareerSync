import Joi from 'joi';

const PORTALS = ['naukri', 'linkedin'];

export const saveCredentialsSchema = Joi.object({
  portal:   Joi.string().valid(...PORTALS).required(),
  username: Joi.string().min(3).max(200).required(),
  password: Joi.string().min(4).max(200).required(),
  preferences: Joi.object({
    // Naukri
    noticePeriodDays:  Joi.number().integer().min(0).max(180).default(30),
    currentCtcLakhs:   Joi.number().min(0).max(999).default(0),
    expectedCtcLakhs:  Joi.number().min(0).max(999).default(0),
    coverNote:         Joi.string().allow('').max(1000).default(''),
    // LinkedIn
    phoneNumber:       Joi.string().allow('').max(30).default(''),
    yearsOfExperience: Joi.number().integer().min(0).max(60).default(0),
  }).default({}),
});

export const triggerAutoApplySchema = Joi.object({
  portal:    Joi.string().valid(...PORTALS).required(),
  resumeId:  Joi.string().hex().length(24).required(),
  keywords:  Joi.string().min(1).max(200).required(),
  location:  Joi.string().allow('').max(100).default(''),
  maxJobs:   Joi.number().integer().min(1).max(50).default(10),
  freshness: Joi.number().integer().valid(0, 1, 3, 7, 15, 30).default(0),
});
