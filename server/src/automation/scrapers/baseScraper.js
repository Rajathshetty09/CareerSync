import logger from '../../utils/logger.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Abstract base class for all job portal scrapers.
 *
 * Subclasses must implement:
 *   - get name()           — portal identifier string
 *   - get baseUrl()        — root URL of the portal
 *   - scrapeJobs(page, query, options) — return raw job array
 *
 * Common utilities (delay, text extraction, pagination) live here.
 */
export default class BaseScraper {
  constructor() {
    if (new.target === BaseScraper) {
      throw new Error('BaseScraper is abstract — instantiate a subclass');
    }
    this.maxRetries = 3;
    this.pageTimeout = 30_000;
  }

  get name() {
    throw new Error('Subclass must implement get name()');
  }

  get baseUrl() {
    throw new Error('Subclass must implement get baseUrl()');
  }

  // eslint-disable-next-line no-unused-vars
  async scrapeJobs(_page, _query, _options) {
    throw new Error('Subclass must implement scrapeJobs()');
  }

  // ─── Lifecycle helpers ────────────────────────────────────────────────────

  async navigate(page, url) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.pageTimeout });
    await this.humanDelay();
  }

  async humanDelay(min = 800, max = 2400) {
    await delay(jitter(min, max));
  }

  async waitFor(page, selector, timeout = 8000) {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch {
      return false;
    }
  }

  // ─── Data extraction helpers ───────────────────────────────────────────────

  async extractText(page, selector) {
    try {
      return (await page.textContent(selector, { timeout: 3000 }))?.trim() ?? null;
    } catch {
      return null;
    }
  }

  async extractAttr(page, selector, attr) {
    try {
      return (await page.getAttribute(selector, attr, { timeout: 3000 })) ?? null;
    } catch {
      return null;
    }
  }

  async extractAll(page, selector, extractor) {
    try {
      return page.$$eval(selector, extractor);
    } catch {
      return [];
    }
  }

  // ─── Salary parsing ───────────────────────────────────────────────────────

  parseSalary(text) {
    if (!text) return {};
    // Match patterns like "₹4L–8L PA", "4-8 LPA", "₹40,000/month", "$60k–$90k"
    const normalized = text.replace(/[₹$,]/g, '').toLowerCase();
    const lpaMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:–|-|to)\s*(\d+(?:\.\d+)?)\s*l/);
    if (lpaMatch) {
      return {
        min: Math.round(parseFloat(lpaMatch[1]) * 100_000),
        max: Math.round(parseFloat(lpaMatch[2]) * 100_000),
        currency: 'INR',
        period: 'year',
      };
    }
    const kMatch = normalized.match(/(\d+(?:\.\d+)?)k?\s*(?:–|-|to)\s*(\d+(?:\.\d+)?)k/);
    if (kMatch) {
      return {
        min: Math.round(parseFloat(kMatch[1]) * 1000),
        max: Math.round(parseFloat(kMatch[2]) * 1000),
        currency: 'USD',
        period: 'year',
      };
    }
    return {};
  }

  // ─── Retry wrapper ────────────────────────────────────────────────────────

  async withRetry(fn, attempts = this.maxRetries) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        logger.warn(`${this.name} scraper retry ${i + 1}/${attempts}: ${err.message}`);
        await delay(jitter(1000, 3000) * (i + 1));
      }
    }
    throw lastErr;
  }

  // ─── Normaliser ───────────────────────────────────────────────────────────

  normaliseJob(raw) {
    return {
      title: raw.title?.trim() || 'Untitled',
      company: raw.company?.trim() || 'Unknown',
      location: raw.location?.trim() || null,
      description: raw.description?.trim() || null,
      applyUrl: raw.applyUrl || null,
      externalId: raw.externalId || null,
      source: this.name,
      employmentType: raw.employmentType || null,
      skills: Array.isArray(raw.skills) ? raw.skills : [],
      salary: raw.salary || {},
      postedAt: raw.postedAt ? new Date(raw.postedAt) : new Date(),
      experienceRequired: raw.experienceRequired || {},
      isRemote: raw.isRemote ?? false,
    };
  }
}
