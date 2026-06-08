import Joi from 'joi';

const objectId = Joi.string().hex().length(24);

export const analyseResumeSchema = Joi.object({
  resumeId: objectId.required(),
  jobId:    objectId.required(),
});

export const coverLetterSchema = Joi.object({
  resumeId: objectId.required(),
  jobId:    objectId.required(),
  tone:     Joi.string().valid('professional', 'enthusiastic', 'concise').default('professional'),
});

export const skillGapSchema = Joi.object({
  targetRole:  Joi.string().min(2).max(100).required(),
  jobId:       objectId,
});
