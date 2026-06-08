import { Worker } from 'bullmq';
import { redisConfig } from '../config/redis.js';
import { QUEUE_NAMES } from '../constants/index.js';
import { runScraper, runAllScrapers } from '../automation/scraperManager.js';
import logger from '../utils/logger.js';

const CONCURRENCY = parseInt(process.env.SCRAPER_CONCURRENCY || '2', 10);

const processJob = async (job) => {
  const { portal, query, options } = job.data;
  logger.info(`[JobDiscoveryWorker] Processing job ${job.id}: ${portal} — "${query}"`);

  const result = portal === 'all'
    ? await runAllScrapers(query, options)
    : await runScraper(portal, query, options);

  logger.info(`[JobDiscoveryWorker] Completed job ${job.id}`, result);
  return result;
};

let worker;

export const startJobDiscoveryWorker = () => {
  worker = new Worker(QUEUE_NAMES.JOB_DISCOVERY, processJob, {
    connection: redisConfig,
    concurrency: CONCURRENCY,
    limiter: {
      // No more than 20 scrape jobs per 30 seconds globally (rate-limit portals)
      max: 20,
      duration: 30_000,
    },
  });

  worker.on('completed', (job, result) => {
    logger.info(`[JobDiscoveryWorker] Job ${job.id} completed`, result);
  });

  worker.on('failed', (job, err) => {
    logger.error(`[JobDiscoveryWorker] Job ${job?.id} failed: ${err.message}`);
  });

  worker.on('error', (err) => {
    logger.error(`[JobDiscoveryWorker] Worker error: ${err.message}`);
  });

  logger.info(`[JobDiscoveryWorker] Started (concurrency: ${CONCURRENCY})`);
  return worker;
};

export const stopJobDiscoveryWorker = async () => {
  if (worker) {
    await worker.close();
    logger.info('[JobDiscoveryWorker] Stopped');
  }
};
