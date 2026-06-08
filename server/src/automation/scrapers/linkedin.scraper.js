import BaseScraper from './baseScraper.js';

const BASE = 'https://www.linkedin.com';

export default class LinkedInScraper extends BaseScraper {
  get name() { return 'linkedin'; }
  get baseUrl() { return BASE; }

  async scrapeJobs(page, query, options = {}) {
    const { location = 'India', maxPages = 3 } = options;
    const jobs = [];
    const perPage = 25;

    for (let start = 0; start < maxPages * perPage; start += perPage) {
      const url = this._buildUrl(query, location, start);
      await this.withRetry(() => this.navigate(page, url));

      const found = await this.waitFor(page, '.jobs-search__results-list li', 10_000);
      if (!found) break;

      const pageJobs = await this.extractAll(
        page,
        '.jobs-search__results-list li',
        (nodes) =>
          nodes.map((el) => {
            const titleEl = el.querySelector('.base-search-card__title');
            const companyEl = el.querySelector('.base-search-card__subtitle');
            const locationEl = el.querySelector('.job-search-card__location');
            const linkEl = el.querySelector('a.base-card__full-link');
            const timeEl = el.querySelector('time');

            const href = linkEl?.href || '';
            // LinkedIn job ID is in the URL path: /jobs/view/XXXXXXX/
            const externalId = href.match(/\/view\/(\d+)/)?.[1] || href;

            return {
              title: titleEl?.innerText?.trim() || '',
              company: companyEl?.innerText?.trim() || '',
              location: locationEl?.innerText?.trim() || '',
              applyUrl: href,
              externalId,
              postedAt: timeEl?.getAttribute('datetime') || null,
            };
          }),
      );

      for (const raw of pageJobs) {
        if (!raw.title) continue;
        jobs.push(this.normaliseJob(raw));
      }

      // LinkedIn public feed stops at 1000 results; break if fewer than perPage returned
      if (pageJobs.length < perPage) break;
    }

    return jobs;
  }

  _buildUrl(query, location, start) {
    const params = new URLSearchParams({
      keywords: query,
      location,
      start: String(start),
      f_TPR: 'r86400', // last 24 hours
    });
    return `${BASE}/jobs/search/?${params}`;
  }
}
