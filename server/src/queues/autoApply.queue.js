import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis.js';
import { QUEUE_NAMES } from '../constants/index.js';

const autoApplyQueue = new Queue(QUEUE_NAMES.AUTO_APPLY, {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 15_000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  },
});

/**
 * Queue a single application attempt.
 * @param {string} userId    - user who is applying
 * @param {string} jobId     - internal Job._id
 * @param {string} resumeId  - Resume to submit
 */
export const enqueueAutoApply = (userId, jobId, resumeId) =>
  autoApplyQueue.add(
    'apply',
    { userId, jobId, resumeId },
    {
      jobId: `apply:${userId}:${jobId}`,
      // Don't retry immediately — portals may flag rapid re-submissions
      delay: 0,
    },
  );

/**
 * Queue a batch of applications for a user.
 * Each job is added individually so failures are isolated.
 * Accepts optional runId to tie results back to an AutomationRun document.
 */
export const enqueueBatchApply = (userId, applications) =>
  autoApplyQueue.addBulk(
    applications.map(({ jobId, resumeId, runId }) => ({
      name: 'apply',
      data: { userId, jobId, resumeId, runId },
      opts: { jobId: `apply:${userId}:${jobId}` },
    })),
  );

export default autoApplyQueue;
