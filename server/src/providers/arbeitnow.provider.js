import logger from '../utils/logger.js';

const BASE = 'https://arbeitnow.com/api/job-board-api';

function normalizeType(types = []) {
  const t = (types[0] || '').toLowerCase();
  if (t.includes('part')) return 'part-time';
  if (t.includes('contract') || t.includes('freelance')) return 'contract';
  if (t.includes('intern')) return 'internship';
  return 'full-time';
}

export const searchArbeitnow = async ({ keywords, page = 1 }) => {
  const url = `${BASE}?page=${page}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      logger.warn(`[Arbeitnow] API returned ${res.status}`);
      return [];
    }
    const data = await res.json();

    // Broad keyword match across title, description snippet, and tags
    const tokens = keywords.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const filtered = (data.data || []).filter(job => {
      const searchable = `${job.title} ${job.description?.slice(0, 500) || ''} ${(job.tags || []).join(' ')}`.toLowerCase();
      return tokens.some(token => searchable.includes(token));
    });

    return filtered.map(job => ({
      title: job.title?.trim(),
      company: job.company_name || 'Unknown',
      location: job.remote ? 'Remote' : (job.location || 'Europe'),
      source: 'arbeitnow',
      externalId: job.slug,
      description: job.description,
      applyUrl: job.url,
      salary: {},
      employmentType: normalizeType(job.job_types),
      skills: Array.isArray(job.tags) ? job.tags.slice(0, 10) : [],
      postedAt: job.created_at ? new Date(job.created_at) : new Date(),
      isActive: true,
    }));
  } catch (err) {
    logger.warn(`[Arbeitnow] Fetch failed: ${err.message}`);
    return [];
  }
};
