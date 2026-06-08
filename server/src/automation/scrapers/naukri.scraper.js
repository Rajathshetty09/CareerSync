import BaseScraper from './baseScraper.js';

const BASE = 'https://www.naukri.com';

export default class NaukriScraper extends BaseScraper {
  get name() { return 'naukri'; }
  get baseUrl() { return BASE; }

  async scrapeJobs(page, query, options = {}) {
    const { location = '', maxPages = 3 } = options;
    const jobs = [];

    for (let p = 1; p <= maxPages; p++) {
      const url = this._buildUrl(query, location, p);
      await this.withRetry(() => this.navigate(page, url));

      const found = await this.waitFor(page, '[class*="jobTuple"]', 10_000);
      if (!found) break;

      const pageJobs = await this.extractAll(
        page,
        '[class*="jobTuple"]',
        (nodes) =>
          nodes.map((el) => {
            const titleEl = el.querySelector('[class*="title"]');
            const companyEl = el.querySelector('[class*="companyName"]');
            const locationEl = el.querySelector('[class*="locWdth"]');
            const salaryEl = el.querySelector('[class*="salary"]');
            const expEl = el.querySelector('[class*="experience"]');
            const skillsEl = el.querySelectorAll('[class*="tag"]');
            const linkEl = el.querySelector('a[href]');

            const href = linkEl?.getAttribute('href') || '';
            const externalId = href.match(/-(\d+)\.html$/)?.[1] || href;

            return {
              title: titleEl?.innerText?.trim() || '',
              company: companyEl?.innerText?.trim() || '',
              location: locationEl?.innerText?.trim() || '',
              salary: salaryEl?.innerText?.trim() || '',
              experience: expEl?.innerText?.trim() || '',
              skills: [...skillsEl].map((s) => s.innerText.trim()).filter(Boolean),
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

      // Stop early if last page
      const hasNext = await page.$('[class*="pagination"] [class*="next"]');
      if (!hasNext) break;
    }

    return jobs;
  }

  _buildUrl(query, location, page) {
    const q = encodeURIComponent(query);
    const loc = location ? encodeURIComponent(location) : '';
    const base = `${BASE}/${q.replace(/%20/g, '-')}-jobs${loc ? `-in-${loc.replace(/%20/g, '-')}` : ''}`;
    return page > 1 ? `${base}-${page}` : base;
  }

  _parseExp(text) {
    if (!text) return {};
    const match = text.match(/(\d+)(?:\s*-\s*(\d+))?/);
    if (!match) return {};
    return { min: parseInt(match[1], 10), max: match[2] ? parseInt(match[2], 10) : undefined };
  }
}
