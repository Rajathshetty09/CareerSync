import { Worker } from 'bullmq';
import { redisConfig } from '../config/redis.js';
import { QUEUE_NAMES } from '../constants/index.js';
import Resume from '../models/Resume.js';
import Job from '../models/Job.js';
import { extractSkills } from '../utils/skillExtractor.js';
import { notifyResumeAnalysisComplete } from '../queues/notification.queue.js';
import logger from '../utils/logger.js';

const processJob = async (job) => {
  const { name, data } = job;

  if (name === 'extract-skills') {
    return extractSkillsTask(data);
  }

  if (name === 'analyse') {
    return analyseResumeTask(data);
  }

  throw new Error(`Unknown job name: ${name}`);
};

async function extractSkillsTask({ resumeId, userId }) {
  const resume = await Resume.findById(resumeId).select('+extractedText');
  if (!resume) throw new Error(`Resume ${resumeId} not found`);

  const skills = extractSkills(resume.extractedText || '');
  resume.extractedSkills = skills;
  await resume.save();

  logger.info(`[ResumeAnalysisWorker] Extracted ${skills.length} skills from resume ${resumeId}`);
  return { resumeId, skillCount: skills.length };
}

async function analyseResumeTask({ resumeId, jobId, userId }) {
  const [resume, jobDoc] = await Promise.all([
    Resume.findById(resumeId).select('+extractedText'),
    Job.findById(jobId),
  ]);

  if (!resume) throw new Error(`Resume ${resumeId} not found`);
  if (!jobDoc) throw new Error(`Job ${jobId} not found`);

  // Keyword overlap score (AI analysis will replace this in Phase 9)
  const resumeSkills = new Set(resume.extractedSkills.map((s) => s.toLowerCase()));
  const jobSkills = jobDoc.skills.map((s) => s.toLowerCase());
  const matchedSkills = jobSkills.filter((s) => resumeSkills.has(s));

  const matchScore = jobSkills.length > 0
    ? Math.round((matchedSkills.length / jobSkills.length) * 100)
    : 0;

  logger.info(
    `[ResumeAnalysisWorker] Resume ${resumeId} vs Job ${jobId}: ${matchScore}% match`,
  );

  await notifyResumeAnalysisComplete(userId, {
    resumeName: resume.name,
    jobTitle: jobDoc.title,
    matchScore,
  });

  return { resumeId, jobId, matchScore, matchedSkills };
}

let worker;

export const startResumeAnalysisWorker = () => {
  worker = new Worker(QUEUE_NAMES.RESUME_ANALYSIS, processJob, {
    connection: redisConfig,
    concurrency: 5,
  });

  worker.on('failed', (job, err) => {
    logger.error(`[ResumeAnalysisWorker] Job ${job?.id} failed: ${err.message}`);
  });

  worker.on('error', (err) => {
    logger.error(`[ResumeAnalysisWorker] Worker error: ${err.message}`);
  });

  logger.info('[ResumeAnalysisWorker] Started');
  return worker;
};

export const stopResumeAnalysisWorker = async () => {
  if (worker) {
    await worker.close();
    logger.info('[ResumeAnalysisWorker] Stopped');
  }
};
