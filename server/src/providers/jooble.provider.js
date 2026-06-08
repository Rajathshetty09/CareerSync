import env from '../config/env.js';
import logger from '../utils/logger.js';

const BASE = 'https://jooble.org/api';

function parseSalary(salaryStr = '') {
  if (!salaryStr) return {};
  const nums = salaryStr.match(/[\d,]+/g);
  if (!nums) return {};
  const vals = nums.map(n => Number(n.replace(/,/g, ''))).filter(Boolean);
  if (!vals.length) return {};
  return {
    min: vals[0],
    max: vals[1] || vals[0],
    currency: salaryStr.includes('₹') || salaryStr.includes('INR') ? 'INR' : 'USD',
    period: salaryStr.toLowerCase().includes('month') ? 'monthly' : 'yearly',
  };
}

function normalizeEmploymentType(type = '') {
  const t = type.toLowerCase();
  if (t.includes('part')) return 'part-time';
  if (t.includes('contract') || t.includes('freelance')) return 'contract';
  if (t.includes('intern')) return 'internship';
  return 'full-time';
}

export const searchJooble = async ({ keywords, location = '', page = 1 }) => {
  if (!env.JOOBLE_API_KEY) {
    logger.debug('[Jooble] Skipped — JOOBLE_API_KEY not configured');
    return [];
  }

  try {
    const res = await fetch(`${BASE}/${env.JOOBLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords, location, page }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      logger.warn(`[Jooble] API returned ${res.status}`);
      return [];
    }
    const data = await res.json();

    return (data.jobs || []).map(job => ({
      title: job.title?.trim(),
      company: job.company || 'Unknown',
      location: job.location || location || 'Not specified',
      source: 'jooble',
      externalId: String(job.id),
      description: job.snippet,
      applyUrl: job.link,
      salary: parseSalary(job.salary),
      employmentType: normalizeEmploymentType(job.type),
      skills: [],
      postedAt: new Date(job.updated || Date.now()),
      isActive: true,
    }));
  } catch (err) {
    logger.warn(`[Jooble] Fetch failed: ${err.message}`);
    return [];
  }
};
