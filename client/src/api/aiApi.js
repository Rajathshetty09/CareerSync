import api from './axiosInstance.js';

export const analyseResume = (resumeId, jobId) =>
  api.post('/ai/analyse-resume', { resumeId, jobId });

export const generateCoverLetter = (resumeId, jobId, tone) =>
  api.post('/ai/cover-letter', { resumeId, jobId, tone });

export const analyseSkillGap = (targetRole, jobId) =>
  api.post('/ai/skill-gap', { targetRole, ...(jobId && { jobId }) });
