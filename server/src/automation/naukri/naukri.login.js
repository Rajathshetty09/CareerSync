import logger from '../../utils/logger.js';
import { saveSession, loadSession, clearSession } from '../browser/sessionManager.js';

const PORTAL = 'naukri';
const LOGIN_URL = 'https://www.naukri.com/nlogin/login';
const HOME_URL  = 'https://www.naukri.com/';

// Selectors — ordered by reliability (more specific first)
const SEL = {
  emailInput:    '#usernameField',
  passwordInput: '#passwordField',
  loginBtn:      'button[type="submit"]',
  loginError:    '.err-container, [class*="errorMessage"], [class*="err-"]',
  loggedInCheck: '[class*="nI-gNb-drawer"], [class*="user-type"], .naukri-logo ~ * [class*="user"]',
  // Post-login elements (any one indicates success)
  dashboardSignals: [
    '[class*="nI-gNb-drawer__icon"]',
    '[class*="view-profile"]',
    '[class*="ni-in"]',
    'a[href*="mnjuser"]',
    '[class*="user-name"]',
  ],
};

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Attempt to restore a previously saved session.
 * Returns true if the restored session is still valid (user appears logged in).
 */
export const tryRestoreSession = async (ctx, userId) => {
  const restored = await loadSession(ctx, userId, PORTAL);
  if (!restored) return false;

  const page = await ctx.newPage();
  try {
    await page.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await delay(jitter(800, 1500));

    // Check if any logged-in indicator is present
    for (const sel of SEL.dashboardSignals) {
      const el = await page.$(sel);
      if (el) {
        logger.info(`[NaukriLogin] Session restored for user ${userId}`);
        await page.close();
        return true;
      }
    }

    logger.info(`[NaukriLogin] Cached session expired for user ${userId}`);
    await clearSession(userId, PORTAL);
    await page.close();
    return false;
  } catch {
    await page.close();
    return false;
  }
};

/**
 * Perform a fresh login with username + password.
 * Returns the logged-in page (caller must close it).
 * Throws on login failure (bad credentials, CAPTCHA, etc.).
 */
export const loginToNaukri = async (ctx, userId, username, password) => {
  const page = await ctx.newPage();

  // Mask automation signals
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  try {
    logger.info(`[NaukriLogin] Navigating to login page for user ${userId}`);
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await delay(jitter(1000, 2000));

    // Fill email
    const emailEl = await page.waitForSelector(SEL.emailInput, { timeout: 10_000 });
    await emailEl.click();
    await delay(jitter(200, 500));
    await emailEl.fill('');
    await emailEl.type(username, { delay: jitter(60, 130) });

    await delay(jitter(300, 700));

    // Fill password
    const passEl = await page.waitForSelector(SEL.passwordInput, { timeout: 5_000 });
    await passEl.click();
    await delay(jitter(200, 400));
    await passEl.fill('');
    await passEl.type(password, { delay: jitter(60, 130) });

    await delay(jitter(400, 900));

    // Click login
    const loginBtn = await page.waitForSelector(SEL.loginBtn, { timeout: 5_000 });
    await loginBtn.click();

    // Wait for navigation or error message
    await Promise.race([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15_000 }),
      page.waitForSelector(SEL.loginError, { timeout: 15_000 }),
    ]).catch(() => {});

    await delay(jitter(1500, 2500));

    // Check for login error
    const errEl = await page.$(SEL.loginError);
    if (errEl) {
      const errText = (await errEl.textContent())?.trim() || 'Login failed';
      throw new Error(`Naukri login error: ${errText}`);
    }

    // Verify login success
    let loggedIn = false;
    for (const sel of SEL.dashboardSignals) {
      const el = await page.$(sel);
      if (el) { loggedIn = true; break; }
    }

    if (!loggedIn) {
      // Check URL as fallback (Naukri redirects after login)
      const url = page.url();
      if (url.includes('/mnjuser') || url.includes('myapps') || (url !== LOGIN_URL && !url.includes('/nlogin'))) {
        loggedIn = true;
      }
    }

    if (!loggedIn) {
      throw new Error('Login appeared to succeed but no dashboard indicator found — possible CAPTCHA');
    }

    // Persist session for next run
    await saveSession(ctx, userId, PORTAL);
    logger.info(`[NaukriLogin] Login successful for user ${userId}`);

    return page;
  } catch (err) {
    await page.close();
    throw err;
  }
};

/**
 * High-level helper: restore session OR perform fresh login.
 * Returns { page, freshLogin: boolean }.
 */
export const ensureLoggedIn = async (ctx, userId, username, password) => {
  const restored = await tryRestoreSession(ctx, userId);
  if (restored) {
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    return { page, freshLogin: false };
  }

  const page = await loginToNaukri(ctx, userId, username, password);
  return { page, freshLogin: true };
};
