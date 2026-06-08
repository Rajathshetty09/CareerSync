import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis.js';
import { QUEUE_NAMES } from '../constants/index.js';

const jobDiscoveryQueue = new Queue(QUEUE_NAMES.JOB_DISCOVERY, {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

/**
 * Schedule a scrape for a specific portal + query combination.
 * @param {string} portal  - 'naukri' | 'linkedin' | 'indeed' | 'foundit' | 'wellfound'
 * @param {string} query   - job search keyword
 * @param {object} options - { location, maxPages, portals[] }
 */
export const enqueueJobDiscovery = (portal, query, options = {}) =>
  jobDiscoveryQueue.add(
    `${portal}:${query}`,
    { portal, query, options },
    { jobId: `${portal}:${query}:${Date.now()}` },
  );

/**
 * Schedule a bulk scrape across all portals.
 */
export const enqueueAllPortals = (query, options = {}) =>
  jobDiscoveryQueue.add(
    `all:${query}`,
    { portal: 'all', query, options },
    { jobId: `all:${query}:${Date.now()}` },
  );

export default jobDiscoveryQueue;
