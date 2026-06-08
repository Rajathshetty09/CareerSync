import logger from '../utils/logger.js';

const BASE = 'https://www.themuse.com/api/public/jobs';

// Tech/engineering categories TheMuse uses
const TECH_CATEGORIES = [
  'Software Engineer', 'Data Science', 'Designer', 'Product & UX',
  'IT', 'Data & Analytics', 'Engineering', 'Cybersecurity & IT',
];

function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);
}

function normalizeLevel(levels = []) {
  const l = (levels[0]?.short_name || '').toLowerCase();
  if (l.includes('intern')) return 'internship';
  if (l.includes('entry')) return 'full-time';
  return 'full-time';
}

export const searchTheMuse = async ({ keywords, page = 0 }) => {
  // TheMuse doesn't have free-text search; pre-filter by multiple tech categories
  const results = [];
  const seen = new Set();

  for (const category of TECH_CATEGORIES.slice(0, 3)) {
    try {
      const params = new URLSearchParams({
        category,
        page: String(page),
        descending: 'true',
      });
      const res = await fetch(`${BASE}?${params}`, { signal: AbortSignal.timeout(8_000) });
      if (!res.ok) continue;
      const data = await res.json();
      (data.results || []).forEach(job => {
        if (!seen.has(job.id)) { seen.add(job.id); results.push(job); }
      });
    } catch {
      // ignore per-category failures
    }
  }

  const kw = keywords.toLowerCase().split(/\s+/);
  const filtered = results.filter(job => {
    const searchable = `${job.name} ${(job.categories || []).map(c => c.name).join(' ')} ${(job.tags || []).join(' ')}`.toLowerCase();
    return kw.some(token => searchable.includes(token));
  });

  logger.debug(`[TheMuse] "${keywords}": ${results.length} tech jobs fetched, ${filtered.length} matched`);

  return filtered.map(job => ({
    title: job.name?.trim(),
    company: job.company?.name || 'Unknown',
    location: job.locations?.length ? job.locations.map(l => l.name).join(', ') : 'Remote',
    source: 'themuse',
    externalId: String(job.id),
    description: stripHtml(job.contents),
    applyUrl: job.refs?.landing_page,
    salary: {},
    employmentType: normalizeLevel(job.levels),
    skills: (job.categories || []).map(c => c.name.toLowerCase()).slice(0, 5),
    postedAt: job.publication_date ? new Date(job.publication_date) : new Date(),
    isActive: true,
  }));
};
