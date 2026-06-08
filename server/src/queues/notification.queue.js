import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis.js';
import { QUEUE_NAMES, NOTIFICATION_TYPES } from '../constants/index.js';

const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATION, {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 200 },
  },
});

/**
 * Push a notification to the queue.
 * The worker decides whether to send email, in-app, or both based on type + user prefs.
 */
export const enqueueNotification = (userId, type, payload = {}) =>
  notificationQueue.add(
    type,
    { userId, type, payload, createdAt: new Date().toISOString() },
  );

// ─── Convenience wrappers ─────────────────────────────────────────────────────

export const notifyApplicationSubmitted = (userId, { jobTitle, company }) =>
  enqueueNotification(userId, NOTIFICATION_TYPES.APPLICATION_SUBMITTED, { jobTitle, company });

export const notifyApplicationStatusChanged = (userId, { jobTitle, company, status }) =>
  enqueueNotification(userId, NOTIFICATION_TYPES.APPLICATION_STATUS_CHANGED, { jobTitle, company, status });

export const notifyNewJobMatch = (userId, { jobTitle, company, matchScore }) =>
  enqueueNotification(userId, NOTIFICATION_TYPES.NEW_JOB_MATCH, { jobTitle, company, matchScore });

export const notifyResumeAnalysisComplete = (userId, { resumeName, jobTitle, matchScore }) =>
  enqueueNotification(userId, NOTIFICATION_TYPES.RESUME_ANALYSIS_COMPLETE, { resumeName, jobTitle, matchScore });

export default notificationQueue;
