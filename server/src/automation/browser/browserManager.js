import { chromium } from 'playwright';
import logger from '../../utils/logger.js';

const POOL_SIZE = parseInt(process.env.BROWSER_POOL_SIZE || '3', 10);
const LAUNCH_OPTIONS = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
  ],
};

class BrowserManager {
  constructor() {
    this._browser = null;
    this._contexts = [];
    this._available = [];
    this._queue = [];
    this._initialized = false;
  }

  async initialize() {
    if (this._initialized) return;
    logger.info('BrowserManager: launching browser');
    this._browser = await chromium.launch(LAUNCH_OPTIONS);
    for (let i = 0; i < POOL_SIZE; i++) {
      const ctx = await this._createContext();
      this._contexts.push(ctx);
      this._available.push(ctx);
    }
    this._initialized = true;
    logger.info(`BrowserManager: pool ready (${POOL_SIZE} contexts)`);
  }

  async _createContext() {
    return this._browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
      locale: 'en-IN',
      timezoneId: 'Asia/Kolkata',
      extraHTTPHeaders: {
        'Accept-Language': 'en-IN,en;q=0.9',
      },
    });
  }

  async acquireContext() {
    if (!this._initialized) await this.initialize();

    if (this._available.length > 0) {
      return this._available.pop();
    }

    // Wait for a context to be released
    return new Promise((resolve) => {
      this._queue.push(resolve);
    });
  }

  async releaseContext(ctx) {
    // Clear cookies/storage between uses to prevent cross-scrape contamination
    try {
      await ctx.clearCookies();
    } catch {
      // If context is broken, replace it
      try { await ctx.close(); } catch {}
      ctx = await this._createContext();
      this._contexts = this._contexts.filter((c) => c !== ctx);
      this._contexts.push(ctx);
    }

    if (this._queue.length > 0) {
      const resolve = this._queue.shift();
      resolve(ctx);
    } else {
      this._available.push(ctx);
    }
  }

  async withContext(fn) {
    const ctx = await this.acquireContext();
    try {
      return await fn(ctx);
    } finally {
      await this.releaseContext(ctx);
    }
  }

  async shutdown() {
    if (!this._browser) return;
    logger.info('BrowserManager: shutting down');
    for (const ctx of this._contexts) {
      try { await ctx.close(); } catch {}
    }
    await this._browser.close();
    this._browser = null;
    this._contexts = [];
    this._available = [];
    this._initialized = false;
  }

  get isReady() {
    return this._initialized;
  }
}

export default new BrowserManager();
