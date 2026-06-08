import { Worker } from 'bullmq';
import { redisConfig } from '../config/redis.js';
import { QUEUE_NAMES } from '../constants/index.js';
import User from '../models/User.js';
import { sendEmail } from '../services/email.service.js';
import logger from '../utils/logger.js';

const EMAIL_TEMPLATES = {
  application_submitted: ({ jobTitle, company }) => ({
    subject: `Application submitted: ${jobTitle} at ${company}`,
    html: `<p>Your application for <strong>${jobTitle}</strong> at <strong>${company}</strong> was submitted successfully via CareerSync.</p>`,
  }),

  application_status_changed: ({ jobTitle, company, status }) => ({
    subject: `Application update: ${jobTitle} at ${company}`,
    html: `<p>Your application for <strong>${jobTitle}</strong> at <strong>${company}</strong> has been updated to <strong>${status}</strong>.</p>`,
  }),

  new_job_match: ({ jobTitle, company, matchScore }) => ({
    subject: `New job match: ${jobTitle} at ${company} (${matchScore}% match)`,
    html: `<p>A new job that matches your profile was found: <strong>${jobTitle}</strong> at <strong>${company}</strong> — <strong>${matchScore}%</strong> match with your resume.</p>`,
  }),

  resume_analysis_complete: ({ resumeName, jobTitle, matchScore }) => ({
    subject: `Resume analysis complete: ${matchScore}% match`,
    html: `<p>Your resume <strong>${resumeName}</strong> was analysed against <strong>${jobTitle}</strong>. Match score: <strong>${matchScore}%</strong>.</p>`,
  }),
};

const processJob = async (job) => {
  const { userId, type, payload } = job.data;

  const user = await User.findById(userId).select('email name preferences');
  if (!user) {
    logger.warn(`[NotificationWorker] User ${userId} not found — skipping`);
    return { skipped: true };
  }

  // Check user email notification preference
  const emailEnabled = user.preferences?.emailNotifications !== false;

  if (emailEnabled) {
    const template = EMAIL_TEMPLATES[type];
    if (template) {
      const { subject, html } = template(payload);
      await sendEmail({ to: user.email, subject, html });
    } else {
      logger.warn(`[NotificationWorker] No email template for type: ${type}`);
    }
  }

  // In-app notification storage will be added in Phase 10 (WebSocket/SSE)
  logger.info(`[NotificationWorker] Processed ${type} for user ${userId}`);
  return { userId, type, emailSent: emailEnabled };
};

let worker;

export const startNotificationWorker = () => {
  worker = new Worker(QUEUE_NAMES.NOTIFICATION, processJob, {
    connection: redisConfig,
    concurrency: 10,
  });

  worker.on('failed', (job, err) => {
    logger.error(`[NotificationWorker] Job ${job?.id} failed: ${err.message}`);
  });

  worker.on('error', (err) => {
    logger.error(`[NotificationWorker] Worker error: ${err.message}`);
  });

  logger.info('[NotificationWorker] Started');
  return worker;
};

export const stopNotificationWorker = async () => {
  if (worker) {
    await worker.close();
    logger.info('[NotificationWorker] Stopped');
  }
};
