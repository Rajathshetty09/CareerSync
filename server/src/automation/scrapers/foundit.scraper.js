import BaseScraper from './baseScraper.js';

const BASE = 'https://www.foundit.in';

export default class FounditScraper extends BaseScraper {
  get name() { return 'foundit'; }
  get baseUrl() { return BASE; }

  async scrapeJobs(page, query, options = {}) {
    const { location = '', maxPages = 3 } = options;
    const jobs = [];

    for (let p = 1; p <= maxPages; p++) {
      const url = this._buildUrl(query, location, p);
      await this.withRetry(() => this.navigate(page, url));

      const found = await this.waitFor(page, '[class*="card-apply-content"]', 10_000);
      if (!found) break;

      const pageJobs = await this.extractAll(
        page,
        '[class*="card-apply-content"]',
        (nodes) =>
          nodes.map((el) => {
            const titleEl = el.querySelector('[class*="job-tittle"] a, [class*="title"] a');
            const companyEl = el.querySelector('[class*="company-name"]');
            const locationEl = el.querySelector('[class*="location"]');
            const expEl = el.querySelector('[class*="experience"]');
            const salaryEl = el.querySelector('[class*="salary"]');
            const skillEls = el.querySelectorAll('[class*="skills"] span, [class*="tag"]');

            const href = titleEl?.getAttribute('href') || '';
            const externalId = href.split('-').pop()?.replace(/\D/g, '') || href;

            return {
              title: titleEl?.innerText?.trim() || '',
              company: companyEl?.innerText?.trim() || '',
              location: locationEl?.innerText?.trim() || '',
              salary: salaryEl?.innerText?.trim() || '',
              experience: expEl?.innerText?.trim() || '',
              skills: [...skillEls].map((s) => s.innerText.trim()).filter(Boolean),
              applyUrl: href.startsWith('http') ? href : `${BASE}${href}`,
              externalId,
            };
          }),
      );

      for (const raw of pageJobs) {
        if (!raw.title) continue;
        jobs.push(
          this.normaliseJob({
            ...raw,
            salary: this.parseSalary(raw.salary),
            experienceRequired: this._parseExp(raw.experience),
          }),
        );
      }

      const hasNext = await page.$('[class*="pagination"] a[aria-label="Next"]');
      if (!hasNext) break;
    }

    return jobs;
  }

  _buildUrl(query, location, page) {
    const q = encodeURIComponent(query);
    const loc = location ? encodeURIComponent(location) : '';
    const params = new URLSearchParams({ query: q, ...(loc && { locationTypeId: loc }) });
    const base = `${BASE}/srp/results?${params}`;
    return page > 1 ? `${base}&start=${(page - 1) * 15}` : base;
  }

  _parseExp(text) {
    if (!text) return {};
    const match = text.match(/(\d+)(?:\s*-\s*(\d+))?/);
    if (!match) return {};
    return { min: parseInt(match[1], 10), max: match[2] ? parseInt(match[2], 10) : undefined };
  }
}
