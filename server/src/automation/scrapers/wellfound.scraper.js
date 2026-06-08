import BaseScraper from './baseScraper.js';

const BASE = 'https://wellfound.com';

export default class WellfoundScraper extends BaseScraper {
  get name() { return 'wellfound'; }
  get baseUrl() { return BASE; }

  async scrapeJobs(page, query, options = {}) {
    const { location = 'remote', maxPages = 2 } = options;
    const jobs = [];

    for (let p = 1; p <= maxPages; p++) {
      const url = this._buildUrl(query, location, p);
      await this.withRetry(() => this.navigate(page, url));

      // Wellfound is React-rendered — wait for job cards
      const found = await this.waitFor(page, '[data-test="StartupResult"]', 15_000);
      if (!found) break;

      const pageJobs = await this.extractAll(
        page,
        '[data-test="JobListing"]',
        (nodes) =>
          nodes.map((el) => {
            const titleEl = el.querySelector('[data-test="JobListing-heading"] a');
            const companyEl = el.closest('[data-test="StartupResult"]')
              ?.querySelector('[data-test="company-name"]');
            const locationEl = el.querySelector('[data-test="job-location"]');
            const salaryEl = el.querySelector('[data-test="job-compensation"]');
            const remoteEl = el.querySelector('[data-test="remote-ok"]');
            const skillEls = el.querySelectorAll('[data-test="tag"]');

            const href = titleEl?.getAttribute('href') || '';
            const externalId = href.split('/').filter(Boolean).pop() || '';

            return {
              title: titleEl?.innerText?.trim() || '',
              company: companyEl?.innerText?.trim() || '',
              location: locationEl?.innerText?.trim() || '',
              salary: salaryEl?.innerText?.trim() || '',
              isRemote: !!remoteEl,
              skills: [...skillEls].map((s) => s.innerText.trim()).filter(Boolean),
              applyUrl: href.startsWith('http') ? href : `${BASE}${href}`,
              externalId,
              employmentType: 'full-time',
            };
          }),
      );

      for (const raw of pageJobs) {
        if (!raw.title) continue;
        jobs.push(
          this.normaliseJob({
            ...raw,
            salary: this.parseSalary(raw.salary),
          }),
        );
      }

      const hasNext = await page.$('a[rel="next"]');
      if (!hasNext) break;
    }

    return jobs;
  }

  _buildUrl(query, location, page) {
    const params = new URLSearchParams({
      role: query,
      ...(location && { location }),
      ...(page > 1 && { page: String(page) }),
    });
    return `${BASE}/jobs?${params}`;
  }
}
