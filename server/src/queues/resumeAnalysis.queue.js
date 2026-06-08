import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis.js';
import { QUEUE_NAMES } from '../constants/index.js';

const resumeAnalysisQueue = new Queue(QUEUE_NAMES.RESUME_ANALYSIS, {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5_000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 100 },
  },
});

/**
 * Queue an AI analysis job for a resume against a specific job posting.
 * The worker will use OpenAI to produce a match score + tailored suggestions.
 */
export const enqueueResumeAnalysis = (resumeId, jobId, userId) =>
  resumeAnalysisQueue.add(
    'analyse',
    { resumeId, jobId, userId },
    { jobId: `analyse:${resumeId}:${jobId}` },
  );

/**
 * Queue a bulk skill extraction re-run for a resume
 * (e.g. after the skill dictionary is updated).
 */
export const enqueueSkillExtraction = (resumeId, userId) =>
  resumeAnalysisQueue.add(
    'extract-skills',
    { resumeId, userId },
    { jobId: `skills:${resumeId}` },
  );

export default resumeAnalysisQueue;
