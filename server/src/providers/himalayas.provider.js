import logger from '../utils/logger.js';

const BASE = 'https://himalayas.app/jobs/api';

function normalizeType(type = '') {
  const t = type.toLowerCase();
  if (t.includes('part')) return 'part-time';
  if (t.includes('contract') || t.includes('freelance')) return 'contract';
  if (t.includes('intern')) return 'internship';
  return 'full-time';
}

function slugToLabel(slug = '') {
  return slug.replace(/-/g, ' ').replace(/\bjobs?\b/i, '').trim().toLowerCase();
}

export const searchHimalayas = async ({ keywords, limit = 30 }) => {
  const params = new URLSearchParams({ limit: String(limit), q: keywords });
  const url = `${BASE}?${params}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      logger.warn(`[Himalayas] API returned ${res.status}`);
      return [];
    }
    const data = await res.json();

    return (data.jobs || []).map(job => {
      // guid is a full URL like https://himalayas.app/companies/x/jobs/slug-123
      const externalId = (job.guid || '').split('/').filter(Boolean).pop() || String(Date.now());

      return {
        title: job.title?.trim(),
        company: job.companyName || 'Unknown',
        location: Array.isArray(job.locationRestrictions) && job.locationRestrictions.length
          ? job.locationRestrictions.join(', ')
          : 'Remote',
        source: 'himalayas',
        externalId,
        description: job.excerpt,
        applyUrl: job.applicationLink,
        salary: {
          min: job.minSalary || undefined,
          max: job.maxSalary || undefined,
          currency: job.currency || 'USD',
          period: 'yearly',
        },
        employmentType: normalizeType(job.employmentType),
        // categories are slug strings like "React-Developer-Jobs" → "react developer"
        skills: Array.isArray(job.categories)
          ? job.categories.map(slugToLabel).filter(Boolean).slice(0, 8)
          : [],
        // pubDate is a Unix timestamp (seconds)
        postedAt: job.pubDate ? new Date(job.pubDate * 1000) : new Date(),
        isActive: true,
      };
    });
  } catch (err) {
    logger.warn(`[Himalayas] Fetch failed: ${err.message}`);
    return [];
  }
};
