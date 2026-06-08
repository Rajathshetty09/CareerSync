import logger from '../utils/logger.js';

const BASE = 'https://remoteok.com/api';

export const searchRemoteOK = async ({ keywords }) => {
  // Use the most specific keyword token as the tag
  const tag = keywords.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const url = `${BASE}?tag=${encodeURIComponent(tag)}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CareerSync/1.0 (+https://careersync.io)' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      logger.warn(`[RemoteOK] API returned ${res.status}`);
      return [];
    }
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    // First element is metadata, skip it
    return data.slice(1).slice(0, 20).map(job => ({
      title: job.position?.trim(),
      company: job.company || 'Unknown',
      location: 'Remote',
      source: 'remoteok',
      externalId: String(job.id),
      description: job.description,
      applyUrl: job.apply_url || job.url,
      salary: {
        min: job.salary_min || undefined,
        max: job.salary_max || undefined,
        currency: 'USD',
        period: 'yearly',
      },
      employmentType: 'full-time',
      skills: Array.isArray(job.tags) ? job.tags.slice(0, 10) : [],
      postedAt: job.date ? new Date(job.date) : new Date(),
      isActive: true,
    }));
  } catch (err) {
    logger.warn(`[RemoteOK] Fetch failed: ${err.message}`);
    return [];
  }
};
