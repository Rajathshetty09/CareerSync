import Job from '../models/Job.js';
import redis from '../config/redis.js';
import logger from '../utils/logger.js';
import { searchAdzuna } from '../providers/adzuna.provider.js';
import { searchJooble } from '../providers/jooble.provider.js';
import { searchRemoteOK } from '../providers/remoteok.provider.js';
import { searchArbeitnow } from '../providers/arbeitnow.provider.js';
import { searchHimalayas } from '../providers/himalayas.provider.js';
import { searchJobicy } from '../providers/jobicy.provider.js';
import { searchTheMuse } from '../providers/themuse.provider.js';
import { searchFindwork } from '../providers/findwork.provider.js';
import { searchReed } from '../providers/reed.provider.js';

const SYNC_CACHE_TTL = 30 * 60; // 30 minutes

function syncCacheKey(keywords, location) {
  const k = keywords.toLowerCase().replace(/\s+/g, '_').slice(0, 60);
  const l = (location || '').toLowerCase().replace(/\s+/g, '_').slice(0, 30);
  return `job:sync:${k}:${l}`;
}

async function upsertJobs(jobs) {
  const valid = jobs.filter(j => j.title && j.source && j.externalId);
  if (!valid.length) return 0;

  const ops = valid.map(job => ({
    updateOne: {
      filter: { source: job.source, externalId: job.externalId },
      update: { $set: job },
      upsert: true,
    },
  }));

  const result = await Job.bulkWrite(ops, { ordered: false });
  return (result.upsertedCount || 0) + (result.modifiedCount || 0);
}

/**
 * Fetch jobs from all configured providers and upsert into MongoDB.
 * Returns early (skipped) if this keyword+location combo was synced recently.
 *
 * Free providers (no API key needed):
 *   RemoteOK, Arbeitnow, Himalayas, Jobicy, TheMuse
 *
 * Optional keyed providers (skipped when env var not set):
 *   Adzuna (ADZUNA_APP_ID + ADZUNA_API_KEY)
 *   Jooble (JOOBLE_API_KEY)
 *   Findwork (FINDWORK_API_KEY)
 *   Reed (REED_API_KEY)
 */
export const syncJobsFromProviders = async ({ keywords, location = '', forceSync = false }) => {
  const key = syncCacheKey(keywords, location);

  if (!forceSync) {
    const cached = await redis.get(key).catch(() => null);
    if (cached) return { skipped: true };
  }

  const results = await Promise.allSettled([
    // Free — no key required
    searchRemoteOK({ keywords }),
    searchArbeitnow({ keywords }),
    searchHimalayas({ keywords }),
    searchJobicy({ keywords }),
    searchTheMuse({ keywords }),
    // Keyed — silently no-ops when env not configured
    searchAdzuna({ keywords, location }),
    searchJooble({ keywords, location }),
    searchFindwork({ keywords, location }),
    searchReed({ keywords, location }),
  ]);

  const all = results.flatMap(r => (r.status === 'fulfilled' ? r.value : []));
  const saved = await upsertJobs(all);

  await redis.set(key, '1', 'EX', SYNC_CACHE_TTL).catch(() => {});

  const bySource = {};
  all.forEach(j => { bySource[j.source] = (bySource[j.source] || 0) + 1; });
  logger.info(`[JobSync] "${keywords}"@"${location}": ${all.length} fetched, ${saved} upserted — ${JSON.stringify(bySource)}`);

  return { fetched: all.length, saved };
};
