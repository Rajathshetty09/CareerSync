import env from '../config/env.js';
import logger from '../utils/logger.js';

const BASE = 'https://findwork.dev/api/jobs/';

export const searchFindwork = async ({ keywords, location = '' }) => {
  if (!env.FINDWORK_API_KEY) {
    logger.debug('[Findwork] Skipped — FINDWORK_API_KEY not configured');
    return [];
  }

  const params = new URLSearchParams({ search: keywords, sort_by: 'date' });
  if (location) params.set('location', location);
  const url = `${BASE}?${params}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Token ${env.FINDWORK_API_KEY}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      logger.warn(`[Findwork] API returned ${res.status}`);
      return [];
    }
    const data = await res.json();

    return (data.results || []).map(job => ({
      title: job.role?.trim(),
      company: job.company_name || 'Unknown',
      location: job.location || (job.remote ? 'Remote' : 'Not specified'),
      source: 'findwork',
      externalId: String(job.id),
      description: job.text,
      applyUrl: job.url,
      salary: {},
      employmentType: job.employment_type
        ? job.employment_type.toLowerCase().replace(/_/g, '-')
        : 'full-time',
      skills: Array.isArray(job.keywords) ? job.keywords.slice(0, 10) : [],
      postedAt: job.date_posted ? new Date(job.date_posted) : new Date(),
      isActive: true,
    }));
  } catch (err) {
    logger.warn(`[Findwork] Fetch failed: ${err.message}`);
    return [];
  }
};
