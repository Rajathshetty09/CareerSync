import env from '../config/env.js';
import logger from '../utils/logger.js';

const BASE = 'https://api.adzuna.com/v1/api/jobs';

const INDIAN_CITIES = ['bangalore', 'bengaluru', 'mumbai', 'delhi', 'hyderabad', 'pune', 'chennai', 'kolkata', 'noida', 'gurgaon', 'gurugram', 'ahmedabad', 'jaipur', 'kochi'];

const COUNTRY_KEYWORDS = {
  in: ['india', ...INDIAN_CITIES],
  us: ['usa', 'united states', 'new york', 'san francisco', 'seattle', 'austin', 'chicago'],
  gb: ['uk', 'united kingdom', 'london', 'manchester', 'birmingham'],
  au: ['australia', 'sydney', 'melbourne'],
  ca: ['canada', 'toronto', 'vancouver'],
  sg: ['singapore'],
};

function resolveCountry(location = '') {
  const loc = location.toLowerCase();
  for (const [code, keywords] of Object.entries(COUNTRY_KEYWORDS)) {
    if (keywords.some(k => loc.includes(k))) return code;
  }
  return 'in'; // default to India (most users will be Indian)
}

function normalizeEmploymentType(contractTime, contractType) {
  if (contractTime === 'part_time') return 'part-time';
  if (contractType === 'contract') return 'contract';
  if (contractType === 'temporary') return 'contract';
  return 'full-time';
}

export const searchAdzuna = async ({ keywords, location = '', page = 1, resultsPerPage = 20 }) => {
  if (!env.ADZUNA_APP_ID || !env.ADZUNA_API_KEY) {
    logger.debug('[Adzuna] Skipped — credentials not configured');
    return [];
  }

  const country = resolveCountry(location);
  const params = new URLSearchParams({
    app_id: env.ADZUNA_APP_ID,
    app_key: env.ADZUNA_API_KEY,
    results_per_page: String(resultsPerPage),
    what: keywords,
    sort_by: 'date',
  });
  if (location) params.set('where', location);

  const url = `${BASE}/${country}/search/${page}?${params}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      logger.warn(`[Adzuna] API returned ${res.status}: ${await res.text().catch(() => '')}`);
      return [];
    }
    const data = await res.json();

    return (data.results || []).map(job => ({
      title: job.title?.trim(),
      company: job.company?.display_name || 'Unknown',
      location: job.location?.display_name || location || 'Not specified',
      source: 'adzuna',
      externalId: String(job.id),
      description: job.description,
      applyUrl: job.redirect_url,
      salary: {
        min: job.salary_min ? Math.round(job.salary_min) : undefined,
        max: job.salary_max ? Math.round(job.salary_max) : undefined,
        currency: country === 'in' ? 'INR' : 'USD',
        period: 'yearly',
      },
      employmentType: normalizeEmploymentType(job.contract_time, job.contract_type),
      skills: [],
      postedAt: new Date(job.created),
      isActive: true,
    }));
  } catch (err) {
    logger.warn(`[Adzuna] Fetch failed: ${err.message}`);
    return [];
  }
};
