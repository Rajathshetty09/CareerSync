import browserManager from './browser/browserManager.js';
import NaukriScraper from './scrapers/naukri.scraper.js';
import LinkedInScraper from './scrapers/linkedin.scraper.js';
import IndeedScraper from './scrapers/indeed.scraper.js';
import FounditScraper from './scrapers/foundit.scraper.js';
import WellfoundScraper from './scrapers/wellfound.scraper.js';
import Job from '../models/Job.js';
import { extractSkills } from '../utils/skillExtractor.js';
import logger from '../utils/logger.js';

const SCRAPERS = {
  naukri: new NaukriScraper(),
  linkedin: new LinkedInScraper(),
  indeed: new IndeedScraper(),
  foundit: new FounditScraper(),
  wellfound: new WellfoundScraper(),
};

/**
 * Run a single scraper for a given query and upsert results.
 * Returns { inserted, skipped, errors }.
 */
export const runScraper = async (portalName, query, options = {}) => {
  const scraper = SCRAPERS[portalName];
  if (!scraper) throw new Error(`Unknown portal: ${portalName}`);

  logger.info(`[ScraperManager] Starting ${portalName} — query: "${query}"`);
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  try {
    await browserManager.withContext(async (ctx) => {
      const page = await ctx.newPage();
      try {
        const jobs = await scraper.scrapeJobs(page, query, options);
        logger.info(`[ScraperManager] ${portalName} found ${jobs.length} raw jobs`);

        for (const job of jobs) {
          try {
            await upsertJob(job);
            inserted++;
          } catch (err) {
            if (err.code === 11000) {
              // Duplicate key — already in DB
              skipped++;
            } else {
              logger.warn(`[ScraperManager] Failed to upsert job: ${err.message}`);
              errors++;
            }
          }
        }
      } finally {
        await page.close();
      }
    });
  } catch (err) {
    logger.error(`[ScraperManager] ${portalName} scraper failed: ${err.message}`);
    errors++;
  }

  logger.info(
    `[ScraperManager] ${portalName} done — inserted: ${inserted}, skipped: ${skipped}, errors: ${errors}`,
  );
  return { inserted, skipped, errors };
};

/**
 * Run all enabled scrapers concurrently for a query.
 */
export const runAllScrapers = async (query, options = {}) => {
  const { portals = Object.keys(SCRAPERS), ...scraperOptions } = options;

  const results = await Promise.allSettled(
    portals.map((portal) => runScraper(portal, query, scraperOptions)),
  );

  const summary = {};
  portals.forEach((portal, i) => {
    const r = results[i];
    summary[portal] = r.status === 'fulfilled'
      ? r.value
      : { inserted: 0, skipped: 0, errors: 1, error: r.reason?.message };
  });

  return summary;
};

// ─── Internal helpers ──────────────────────────────────────────────────────────

async function upsertJob(jobData) {
  // Merge extracted skills from description with any scraped from the listing
  const descriptionSkills = jobData.description
    ? extractSkills(jobData.description)
    : [];
  const skills = [...new Set([...jobData.skills, ...descriptionSkills])];

  const filter = jobData.externalId
    ? { source: jobData.source, externalId: jobData.externalId }
    : null;

  if (filter) {
    await Job.findOneAndUpdate(
      filter,
      {
        $set: { ...jobData, skills },
        $setOnInsert: { isActive: true, viewCount: 0, applicationCount: 0 },
      },
      { upsert: true, new: true },
    );
  } else {
    await Job.create({ ...jobData, skills });
  }
}
