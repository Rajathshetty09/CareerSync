import logger from '../utils/logger.js';

const BASE = 'https://jobicy.com/api/v2/remote-jobs';

function normalizeType(types = []) {
  const t = (types[0] || '').toLowerCase();
  if (t.includes('part')) return 'part-time';
  if (t.includes('contract') || t.includes('freelance')) return 'contract';
  if (t.includes('intern')) return 'internship';
  return 'full-time';
}

export const searchJobicy = async ({ keywords, count = 50 }) => {
  // Use first keyword token as tag; Jobicy tag filter is keyword-based
  const tag = keywords.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const params = new URLSearchParams({ count: String(count), tag });
  const url = `${BASE}?${params}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      logger.warn(`[Jobicy] API returned ${res.status}`);
      return [];
    }
    const data = await res.json();

    return (data.jobs || []).map(job => ({
      title: job.jobTitle?.trim(),
      company: job.companyName || 'Unknown',
      location: job.jobGeo || 'Remote',
      source: 'jobicy',
      externalId: String(job.id),
      description: job.jobExcerpt,
      applyUrl: job.url,
      salary: {
        min: job.annualSalaryMin || undefined,
        max: job.annualSalaryMax || undefined,
        currency: job.salaryCurrency || 'USD',
        period: 'yearly',
      },
      employmentType: normalizeType(job.jobType),
      skills: Array.isArray(job.jobIndustry) ? job.jobIndustry.slice(0, 5) : [],
      postedAt: job.pubDate ? new Date(job.pubDate) : new Date(),
      isActive: true,
    }));
  } catch (err) {
    logger.warn(`[Jobicy] Fetch failed: ${err.message}`);
    return [];
  }
};
