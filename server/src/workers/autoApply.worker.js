import { Worker } from 'bullmq';
import { redisConfig } from '../config/redis.js';
import { QUEUE_NAMES, APPLICATION_STATUS, JOB_SOURCES } from '../constants/index.js';
import Application from '../models/Application.js';
import AutomationCredentials from '../models/AutomationCredentials.js';
import AutomationRun from '../models/AutomationRun.js';
import Job from '../models/Job.js';
import Resume from '../models/Resume.js';
import browserManager from '../automation/browser/browserManager.js';
import { ensureLoggedIn } from '../automation/naukri/naukri.login.js';
import { applyToNaukriJob, APPLY_RESULT } from '../automation/naukri/naukri.apply.js';
import { decrypt } from '../utils/crypto.util.js';
import { notifyApplicationSubmitted } from '../queues/notification.queue.js';
import logger from '../utils/logger.js';

/**
 * Dispatch to the correct portal apply handler.
 * Returns { result, message } — same shape as applyToNaukriJob.
 */
async function applyViaPortal(page, job, prefs) {
  switch (job.source) {
    case JOB_SOURCES.NAUKRI:
      return applyToNaukriJob(page, job.applyUrl, prefs);
    default:
      return { result: APPLY_RESULT.EXTERNAL, message: `No auto-apply handler for portal: ${job.source}` };
  }
}

const processJob = async (bullJob) => {
  const { userId, jobId, resumeId, runId } = bullJob.data;
  logger.info(`[AutoApplyWorker] Applying: user ${userId} → job ${jobId}`);

  const [jobDoc, resume, existingApp] = await Promise.all([
    Job.findById(jobId),
    Resume.findById(resumeId),
    Application.findOne({ userId, jobId }),
  ]);

  if (!jobDoc) throw new Error(`Job ${jobId} not found`);
  if (!resume) throw new Error(`Resume ${resumeId} not found`);

  if (existingApp && existingApp.status === APPLICATION_STATUS.APPLIED) {
    logger.warn(`[AutoApplyWorker] Already applied to job ${jobId}`);
    if (runId) {
      await updateRunJobResult(runId, jobId, 'skipped', 'Already applied');
    }
    return { skipped: true, reason: 'already_applied' };
  }

  // Create/update application record as pending
  const application = await Application.findOneAndUpdate(
    { userId, jobId },
    {
      $set: {
        userId, jobId, resumeId,
        status: APPLICATION_STATUS.PENDING,
        source: jobDoc.source,
        appliedAt: new Date(),
      },
    },
    { upsert: true, new: true },
  );

  // Get portal credentials
  const creds = await AutomationCredentials.findOne({ userId, portal: jobDoc.source, isActive: true });
  if (!creds) {
    const msg = `No credentials configured for portal: ${jobDoc.source}`;
    await failApplication(application._id, runId, jobId, msg);
    throw new Error(msg);
  }

  let password;
  try {
    password = decrypt(creds.encryptedPassword);
  } catch {
    const msg = 'Failed to decrypt portal credentials — please re-save them';
    await failApplication(application._id, runId, jobId, msg);
    throw new Error(msg);
  }

  try {
    const { result, message } = await browserManager.withContext(async (ctx) => {
      const { page } = await ensureLoggedIn(ctx, userId, creds.username, password);
      try {
        return await applyViaPortal(page, jobDoc, creds.preferences);
      } finally {
        await page.close();
      }
    });

    const newStatus =
      result === APPLY_RESULT.APPLIED        ? APPLICATION_STATUS.APPLIED
      : result === APPLY_RESULT.ALREADY_APPLIED ? APPLICATION_STATUS.APPLIED
      : APPLICATION_STATUS.PENDING;

    await Application.findByIdAndUpdate(application._id, { $set: { status: newStatus } });

    if (newStatus === APPLICATION_STATUS.APPLIED) {
      await Job.findByIdAndUpdate(jobId, { $inc: { applicationCount: 1 } });
      await notifyApplicationSubmitted(userId, { jobTitle: jobDoc.title, company: jobDoc.company });
    }

    if (runId) {
      await updateRunJobResult(
        runId, jobId,
        newStatus === APPLICATION_STATUS.APPLIED ? 'applied' : 'skipped',
        message,
      );
    }

    logger.info(`[AutoApplyWorker] ${application._id}: ${result} — ${message}`);
    return { applicationId: application._id.toString(), status: newStatus, result };

  } catch (err) {
    await failApplication(application._id, runId, jobId, err.message);
    throw err;
  }
};

async function failApplication(applicationId, runId, jobId, message) {
  await Application.findByIdAndUpdate(applicationId, { $set: { status: APPLICATION_STATUS.PENDING } });
  if (runId) {
    await updateRunJobResult(runId, jobId, 'failed', message);
  }
}

async function updateRunJobResult(runId, jobId, status, error = null) {
  try {
    await AutomationRun.findByIdAndUpdate(
      runId,
      {
        $set: {
          'jobResults.$[el].status': status,
          'jobResults.$[el].error': error,
          'jobResults.$[el].appliedAt': status === 'applied' ? new Date() : null,
        },
        $inc: { [`summary.${status}`]: 1 },
      },
      { arrayFilters: [{ 'el.jobId': jobId }] },
    );
  } catch (err) {
    logger.warn(`[AutoApplyWorker] Failed to update run result: ${err.message}`);
  }
}

let worker;

export const startAutoApplyWorker = () => {
  worker = new Worker(QUEUE_NAMES.AUTO_APPLY, processJob, {
    connection: redisConfig,
    concurrency: 2,
    limiter: { max: 10, duration: 60_000 },
  });

  worker.on('failed', (job, err) => {
    logger.error(`[AutoApplyWorker] Job ${job?.id} failed: ${err.message}`);
  });
  worker.on('error', (err) => {
    logger.error(`[AutoApplyWorker] Worker error: ${err.message}`);
  });
  worker.on('completed', (job, result) => {
    logger.info(`[AutoApplyWorker] Job ${job?.id} completed: ${JSON.stringify(result)}`);
  });

  logger.info('[AutoApplyWorker] Started');
  return worker;
};

export const stopAutoApplyWorker = async () => {
  if (worker) {
    await worker.close();
    logger.info('[AutoApplyWorker] Stopped');
  }
};
