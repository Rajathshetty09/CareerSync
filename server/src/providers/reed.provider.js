import env from '../config/env.js';
import logger from '../utils/logger.js';

const BASE = 'https://www.reed.co.uk/api/1.0/search';

export const searchReed = async ({ keywords, location = '', resultsToTake = 20 }) => {
  if (!env.REED_API_KEY) {
    logger.debug('[Reed] Skipped — REED_API_KEY not configured');
    return [];
  }

  const params = new URLSearchParams({
    keywords,
    resultsToTake: String(resultsToTake),
  });
  if (location) params.set('locationName', location);
  const url = `${BASE}?${params}`;

  // Reed uses HTTP Basic auth: api key as username, empty password
  const basicAuth = Buffer.from(`${env.REED_API_KEY}:`).toString('base64');

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${basicAuth}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      logger.warn(`[Reed] API returned ${res.status}`);
      return [];
    }
    const data = await res.json();

    return (data.results || []).map(job => ({
      title: job.jobTitle?.trim(),
      company: job.employerName || 'Unknown',
      location: job.locationName || location || 'UK',
      source: 'reed',
      externalId: String(job.jobId),
      description: job.jobDescription,
      applyUrl: job.jobUrl,
      salary: {
        min: job.minimumSalary || undefined,
        max: job.maximumSalary || undefined,
        currency: 'GBP',
        period: 'yearly',
      },
      employmentType: job.contractType === 'Permanent' ? 'full-time' : 'contract',
      skills: [],
      postedAt: job.date ? new Date(job.date) : new Date(),
      isActive: true,
    }));
  } catch (err) {
    logger.warn(`[Reed] Fetch failed: ${err.message}`);
    return [];
  }
};
