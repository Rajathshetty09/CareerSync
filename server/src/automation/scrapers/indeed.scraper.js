import BaseScraper from './baseScraper.js';

const BASE = 'https://in.indeed.com';

export default class IndeedScraper extends BaseScraper {
  get name() { return 'indeed'; }
  get baseUrl() { return BASE; }

  async scrapeJobs(page, query, options = {}) {
    const { location = '', maxPages = 3 } = options;
    const jobs = [];
    const perPage = 10;

    for (let start = 0; start < maxPages * perPage; start += perPage) {
      const url = this._buildUrl(query, location, start);
      await this.withRetry(() => this.navigate(page, url));

      // Indeed sometimes shows a CAPTCHA — detect and bail
      if (await page.$('#challenge-stage')) {
        break;
      }

      const found = await this.waitFor(page, '[data-jk]', 10_000);
      if (!found) break;

      const pageJobs = await this.extractAll(
        page,
        '[data-jk]',
        (nodes) =>
          nodes.map((el) => {
            const titleEl = el.querySelector('[data-testid="job-title"] span, h2.jobTitle span');
            const companyEl = el.querySelector('[data-testid="company-name"], .companyName');
            const locationEl = el.querySelector('[data-testid="job-location"], .companyLocation');
            const salaryEl = el.querySelector('[data-testid="attribute_snippet_testid"], .salary-snippet');
            const snippetEl = el.querySelector('.job-snippet li, [data-testid="job-snippet"]');

            const jk = el.getAttribute('data-jk');

            return {
              title: titleEl?.innerText?.trim() || '',
              company: companyEl?.innerText?.trim() || '',
              location: locationEl?.innerText?.trim() || '',
              salary: salaryEl?.innerText?.trim() || '',
              description: snippetEl?.innerText?.trim() || '',
              externalId: jk,
              applyUrl: jk ? `${BASE}/viewjob?jk=${jk}` : '',
              isRemote: locationEl?.innerText?.toLowerCase().includes('remote') ?? false,
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

      const hasNext = await page.$('[data-testid="pagination-page-next"]');
      if (!hasNext) break;
    }

    return jobs;
  }

  _buildUrl(query, location, start) {
    const params = new URLSearchParams({ q: query, l: location, start: String(start), fromage: '1' });
    return `${BASE}/jobs?${params}`;
  }
}
