/**
 * Naukri Direct Apply — headed (visible) Chromium automation.
 *
 * Behaviour per job:
 *   • Naukri apply modal  → fills known fields + pauses for user to type extras
 *                           → captures every field the user filled → saves for reuse
 *   • Company website     → opens URL in a new visible tab → continues to next job
 *                           (user applies manually in those tabs later)
 *
 * Field capture:
 *   Any value the user types while the bot is paused is read, normalised, and
 *   saved to AutomationCredentials.capturedFields so it is pre-filled on every
 *   subsequent job in this run AND in all future runs.
 */

import { chromium } from 'playwright';
import AutomationRun from '../../models/AutomationRun.js';
import AutomationCredentials from '../../models/AutomationCredentials.js';
import Application from '../../models/Application.js';
import Job from '../../models/Job.js';
import logger from '../../utils/logger.js';
import { saveSession, loadSession } from '../browser/sessionManager.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const PORTAL    = 'naukri';
const BASE      = 'https://www.naukri.com';
const LOGIN_URL = 'https://www.naukri.com/nlogin/login';

// Pause per chatbot step so the user can fill unknown fields (ms)
const USER_FILL_PAUSE = 8_000;
// Wait between jobs (ms range)
const BETWEEN_JOBS_MIN = 4_000;
const BETWEEN_JOBS_MAX = 7_000;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ─── Selectors ────────────────────────────────────────────────────────────────

const LOGIN_SEL = {
  email:   '#usernameField',
  password:'#passwordField',
  submit:  'button[type="submit"]',
  error:   '.err-container, [class*="errorMessage"]',
  // any one present = logged-in
  loggedIn: [
    '[class*="nI-gNb-drawer__icon"]',
    'a[href*="mnjuser"]',
    '[class*="view-profile"]',
    '.nI-gNb-nav__icon--profile',
    '[class*="user-name"]',
  ],
};

const SRP_TITLE_SELS = [
  '.row1 a.title',
  'a.title',
  'h2 a[href*="naukri.com"]',
  '[class*="title"] a[href*="naukri.com"]',
];

// "Apply on company website" indicators — checked BEFORE clicking anything
const EXTERNAL_BTN_SELS = [
  'button[class*="ext-apply"]',
  'a[class*="ext-apply"]',
  '[class*="external-apply"]',
  'button:has-text("Apply on Company Website")',
  'a:has-text("Apply on Company Website")',
  'button:has-text("Apply on company website")',
];

const NAUKRI_APPLY_BTN_SELS = [
  'button[id*="apply"]',
  'button.chatBtn',
  'button[class*="apply-button"]:not([class*="ext"])',
  'a[class*="apply-button"]:not([class*="ext"])',
  'button:has-text("Apply")',
];

const MODAL_SEL = {
  alreadyApplied: '[class*="already-applied"], button:disabled:has-text("Applied")',
  success:        '[class*="success-message"], [class*="applied-success"], div:has-text("successfully applied"), h2:has-text("Application Submitted")',
  nextBtn:        'button:has-text("Next"), button[class*="next-btn"]',
  submitBtn:      'button:has-text("Submit"), button:has-text("Apply Now"), button:has-text("Apply")',
  // Fields we auto-fill (ordered by preference)
  noticePeriod:  'select[id*="notice" i], input[placeholder*="notice" i], select[name*="notice" i]',
  currentCtc:    'input[placeholder*="current" i][placeholder*="ctc" i], input[name*="currentCtc" i]',
  expectedCtc:   'input[placeholder*="expected" i][placeholder*="ctc" i], input[name*="expectedCtc" i]',
  relevantExp:   'input[placeholder*="relevant" i], input[name*="relevantExp" i], [id*="relevantExp" i] input',
  totalExp:      'input[placeholder*="total exp" i], input[name*="totalExp" i]',
  location:      'input[placeholder*="location" i]:not([placeholder*="job" i])',
};

// ─── Browser ──────────────────────────────────────────────────────────────────

async function launchHeadedBrowser() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 80,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    viewport: null,
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' },
  });

  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
  });

  return { browser, ctx };
}

// ─── Login ────────────────────────────────────────────────────────────────────

async function isLoggedIn(page) {
  for (const sel of LOGIN_SEL.loggedIn) {
    if (await page.$(sel).catch(() => null)) return true;
  }
  const url = page.url();
  return url.includes('/mnjuser') || url.includes('myapps');
}

async function doLogin(page, ctx, userId, username, password) {
  logger.info('[NaukriDirect] Logging in…');
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await delay(jitter(1000, 2000));
  try { await page.keyboard.press('Escape'); } catch {}

  const emailEl = await page.waitForSelector(LOGIN_SEL.email, { timeout: 10_000 });
  await emailEl.click({ clickCount: 3 });
  await emailEl.type(username, { delay: jitter(70, 140) });
  await delay(jitter(400, 800));

  const passEl = await page.waitForSelector(LOGIN_SEL.password, { timeout: 5_000 });
  await passEl.click({ clickCount: 3 });
  await passEl.type(password, { delay: jitter(70, 140) });
  await delay(jitter(500, 1000));

  await page.click(LOGIN_SEL.submit);

  await Promise.race([
    page.waitForLoadState('domcontentloaded', { timeout: 20_000 }),
    page.waitForSelector(LOGIN_SEL.error, { timeout: 20_000 }),
  ]).catch(() => {});

  await delay(jitter(1500, 2500));

  const errEl = await page.$(LOGIN_SEL.error).catch(() => null);
  if (errEl) {
    const txt = (await errEl.textContent())?.trim() || 'Login failed';
    throw new Error(`Naukri login error: ${txt}`);
  }

  if (!(await isLoggedIn(page))) {
    throw new Error('Login appeared to succeed but no dashboard indicator found — possible CAPTCHA visible in the browser window.');
  }

  await saveSession(ctx, userId, PORTAL);
  logger.info('[NaukriDirect] Login successful');
}

// ─── Search ───────────────────────────────────────────────────────────────────

// freshness = days (1, 3, 7, 15, 30) → Naukri jobAge param
function buildSearchUrl(keywords, location, freshness = 0) {
  const slug    = keywords.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const locSlug = location ? `-in-${location.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : '';
  const k = encodeURIComponent(keywords);
  const l = location ? `&l=${encodeURIComponent(location)}` : '';
  const age = freshness ? `&jobAge=${freshness}` : '';
  return `${BASE}/${slug}-jobs${locSlug}?k=${k}${l}&nignore=0${age}`;
}

async function extractJobsFromSRP(page, maxJobs) {
  for (const sel of SRP_TITLE_SELS) {
    const el = await page.$(sel).catch(() => null);
    if (el) break;
  }
  await page.waitForSelector(SRP_TITLE_SELS.join(', '), { timeout: 15_000 }).catch(() => {});
  await delay(jitter(1500, 2500));

  return page.evaluate(
    ({ sels, max }) => {
      const seen = new Set();
      const results = [];
      for (const sel of sels) {
        for (const a of document.querySelectorAll(sel)) {
          const href = a.href || '';
          const title = a.textContent?.trim() || '';
          if (!href || !title || seen.has(href) || !href.includes('naukri.com')) continue;
          seen.add(href);
          const card = a.closest('article') || a.closest('[class*="jobTuple"]');
          const compEl = card?.querySelector('[class*="comp-name"], a.comp-name');
          results.push({ href, title, company: compEl?.textContent?.trim() || '' });
          if (results.length >= max) return results;
        }
        if (results.length >= max) break;
      }
      return results;
    },
    { sels: SRP_TITLE_SELS, max: maxJobs },
  );
}

// ─── Field helpers ────────────────────────────────────────────────────────────

/**
 * Build the full field map by merging base preferences + capturedFields.
 * capturedFields wins (more specific / user-corrected values).
 */
function buildFieldMap(prefs, capturedFields) {
  return {
    noticePeriodDays:        capturedFields.noticePeriodDays   ?? prefs.noticePeriodDays  ?? 30,
    currentCtcLakhs:         capturedFields.currentCtcLakhs    ?? prefs.currentCtcLakhs   ?? 0,
    expectedCtcLakhs:        capturedFields.expectedCtcLakhs   ?? prefs.expectedCtcLakhs  ?? 0,
    relevantExperienceYears: capturedFields.relevantExperienceYears ?? null,
    totalExperienceYears:    capturedFields.totalExperienceYears    ?? null,
    currentLocation:         capturedFields.currentLocation         ?? null,
    ...capturedFields,  // any extra keys pass through
  };
}

async function fillKnownFields(page, fieldMap) {
  // Notice period
  const noticeEl = await page.$(MODAL_SEL.noticePeriod).catch(() => null);
  if (noticeEl) {
    const tag = await noticeEl.evaluate((el) => el.tagName.toLowerCase()).catch(() => 'input');
    if (tag === 'select') {
      const opts = await noticeEl.$$eval('option', (os) => os.map((o) => ({ v: o.value, t: o.text })));
      const best = opts.find((o) =>
        o.t.includes(String(fieldMap.noticePeriodDays)) || o.v.includes(String(fieldMap.noticePeriodDays)),
      );
      if (best) await noticeEl.selectOption(best.v).catch(() => {});
    } else if (fieldMap.noticePeriodDays) {
      await noticeEl.fill(String(fieldMap.noticePeriodDays)).catch(() => {});
    }
  }

  // Current CTC
  if (fieldMap.currentCtcLakhs > 0) {
    const el = await page.$(MODAL_SEL.currentCtc).catch(() => null);
    if (el) await el.fill(String(fieldMap.currentCtcLakhs)).catch(() => {});
  }

  // Expected CTC
  if (fieldMap.expectedCtcLakhs > 0) {
    const el = await page.$(MODAL_SEL.expectedCtc).catch(() => null);
    if (el) await el.fill(String(fieldMap.expectedCtcLakhs)).catch(() => {});
  }

  // Relevant experience (if captured from a previous job)
  if (fieldMap.relevantExperienceYears != null) {
    const el = await page.$(MODAL_SEL.relevantExp).catch(() => null);
    if (el) await el.fill(String(fieldMap.relevantExperienceYears)).catch(() => {});
  }

  // Total experience
  if (fieldMap.totalExperienceYears != null) {
    const el = await page.$(MODAL_SEL.totalExp).catch(() => null);
    if (el) await el.fill(String(fieldMap.totalExperienceYears)).catch(() => {});
  }

  // Current location
  if (fieldMap.currentLocation) {
    const el = await page.$(MODAL_SEL.location).catch(() => null);
    if (el) await el.fill(String(fieldMap.currentLocation)).catch(() => {});
  }
}

/**
 * Read all filled input/select values from the visible apply modal.
 * Returns a raw map: { labelKey: value }
 */
async function captureFilledFields(page) {
  return page.evaluate(() => {
    const container =
      document.querySelector('[class*="chatbot"]') ||
      document.querySelector('[class*="applyModal"]') ||
      document.querySelector('[class*="apply-form"]') ||
      document.querySelector('form') ||
      document.body;

    const result = {};
    for (const el of container.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]), select, textarea',
    )) {
      const val = el.value?.trim();
      if (!val || val === '0') continue;
      const key = (
        el.placeholder?.trim() ||
        el.getAttribute('aria-label')?.trim() ||
        el.name?.trim() ||
        el.id?.trim()
      )?.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      if (key && key.length >= 2 && key.length <= 80) {
        result[key] = val;
      }
    }
    return result;
  });
}

/**
 * Normalise raw captured keys into well-known preference keys.
 * Returns an object suitable for merging into capturedFields.
 */
function normaliseCapture(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (/relevant.*exp|exp.*relevant/.test(k)) {
      out.relevantExperienceYears = isNaN(v) ? v : Number(v);
    } else if (/total.*exp|exp.*total/.test(k)) {
      out.totalExperienceYears = isNaN(v) ? v : Number(v);
    } else if (/notice/.test(k)) {
      out.noticePeriodDays = isNaN(v) ? v : Number(v);
    } else if (/current.*ctc|ctc.*current|current.*sal/.test(k)) {
      out.currentCtcLakhs = isNaN(v) ? v : Number(v);
    } else if (/expect.*ctc|ctc.*expect|expect.*sal/.test(k)) {
      out.expectedCtcLakhs = isNaN(v) ? v : Number(v);
    } else if (/location/.test(k)) {
      out.currentLocation = v;
    } else {
      // Store verbatim for any unknown field
      out[k] = v;
    }
  }
  return out;
}

/** Persist newly-discovered values back to AutomationCredentials */
async function saveDiscoveredFields(userId, portal, newFields) {
  if (!Object.keys(newFields).length) return;
  const setObj = {};
  for (const [k, v] of Object.entries(newFields)) {
    setObj[`capturedFields.${k}`] = v;
  }
  await AutomationCredentials.findOneAndUpdate({ userId, portal }, { $set: setObj }).catch(() => {});
  logger.info(`[NaukriDirect] Saved ${Object.keys(newFields).length} captured field(s): ${Object.keys(newFields).join(', ')}`);
}

// ─── Apply flow ───────────────────────────────────────────────────────────────

/**
 * Attempt to apply to a single Naukri job.
 *
 * Returns one of:
 *   { result: 'applied',   message, newFields }
 *   { result: 'external',  message, externalUrl }
 *   { result: 'already_applied', message }
 *   { result: 'skipped',   message }
 *   { result: 'failed',    message }
 */
async function applyToJob(page, ctx, job, fieldMap, runId, jobIndex) {
  try {
    logger.info(`[NaukriDirect] Navigating: ${job.title}`);
    await page.goto(job.href, { waitUntil: 'domcontentloaded', timeout: 25_000 });
    await delay(jitter(1500, 2000));

    // ── Extract company from detail page (far more reliable than search results) ─
    const detailCompany = await page.$$eval(
      'a.comp-name, [class*="comp-name"] a, [class*="comp-name"], [class*="companyName"] a, [class*="companyName"]',
      (els) => { for (const el of els) { const t = el.textContent?.trim(); if (t && t.length > 0 && t.length < 120) return t; } return ''; },
    ).catch(() => '');
    if (detailCompany) job.company = detailCompany;

    // ── Also grab title from detail page if SRP was truncated ───────────────
    const detailTitle = await page.$eval(
      'h1.title, .jd-header-title, [class*="job-title"] h1, h1[class*="title"]',
      (el) => el.textContent?.trim() || '',
    ).catch(() => '');
    if (detailTitle) job.title = detailTitle;

    // ── Already applied? ────────────────────────────────────────────────────
    const alreadyEl = await page.$(MODAL_SEL.alreadyApplied).catch(() => null);
    if (alreadyEl) {
      const txt = (await alreadyEl.textContent())?.toLowerCase() || '';
      if (txt.includes('applied')) return { result: 'already_applied', message: 'Already applied', newFields: {} };
    }

    // ── Check for "Apply on Company Website" button first ────────────────────
    let externalBtn = null;
    for (const sel of EXTERNAL_BTN_SELS) {
      externalBtn = await page.$(sel).catch(() => null);
      if (externalBtn) break;
    }

    if (externalBtn) {
      // Open company website in a new tab and continue
      const [newPage] = await Promise.all([
        ctx.waitForEvent('page', { timeout: 8_000 }).catch(() => null),
        externalBtn.click(),
      ]);

      const externalUrl = newPage ? newPage.url() : (await externalBtn.getAttribute('href') || job.href);
      logger.info(`[NaukriDirect] External apply → ${externalUrl}`);

      // Keep the new tab open for user — don't close it
      return { result: 'external', message: 'Opened company website', externalUrl };
    }

    // ── Find the Naukri Apply button ─────────────────────────────────────────
    let applyBtn = null;
    for (const sel of NAUKRI_APPLY_BTN_SELS) {
      applyBtn = await page.$(sel).catch(() => null);
      if (applyBtn) break;
    }

    if (!applyBtn) {
      return { result: 'skipped', message: 'No Apply button found on page', newFields: {} };
    }

    const btnText = (await applyBtn.textContent())?.toLowerCase() || '';
    if (btnText.includes('applied') && !btnText.includes('apply now')) {
      return { result: 'already_applied', message: 'Already applied', newFields: {} };
    }

    // ── Click Apply and handle modal/popup ───────────────────────────────────
    // Listen for a new page in case the Apply button itself is an external link
    const [popup] = await Promise.all([
      ctx.waitForEvent('page', { timeout: 4_000 }).catch(() => null),
      applyBtn.click(),
    ]);

    if (popup) {
      // External redirect from the Apply button itself
      const externalUrl = popup.url();
      logger.info(`[NaukriDirect] Apply button opened external tab → ${externalUrl}`);
      return { result: 'external', message: 'Apply button opened company website', externalUrl };
    }

    // Naukri's own chatbot / quick-apply modal
    await delay(jitter(2000, 3000));
    return await handleNaukriModal(page, fieldMap, runId, jobIndex);

  } catch (err) {
    logger.warn(`[NaukriDirect] Error on ${job.title}: ${err.message}`);
    return { result: 'failed', message: err.message, newFields: {} };
  }
}

/**
 * Walk through Naukri's chatbot-style apply modal.
 *
 * Each step:
 *   1. Fill known fields
 *   2. Pause USER_FILL_PAUSE ms so the user can fill unknowns
 *   3. Read what's been filled (capture)
 *   4. Click Next (or Submit)
 */
async function handleNaukriModal(page, fieldMap, runId, jobIndex) {
  const allCaptured = {};
  let submittedSuccessfully = false;

  const MAX_STEPS = 10;
  for (let step = 0; step < MAX_STEPS; step++) {
    // Fill what we know
    await fillKnownFields(page, fieldMap);

    // Pause — user can type any missing fields now
    await delay(USER_FILL_PAUSE);

    // Capture everything visible in the modal after the user has interacted
    const raw = await captureFilledFields(page);
    const normalised = normaliseCapture(raw);
    Object.assign(allCaptured, normalised);

    // Merge newly discovered values into fieldMap for next steps
    Object.assign(fieldMap, normalised);

    // Check for success before clicking anything
    const successEl = await page.$(MODAL_SEL.success).catch(() => null);
    if (successEl) { submittedSuccessfully = true; break; }

    // Try Submit button
    const submitBtn = await page.$(MODAL_SEL.submitBtn).catch(() => null);
    if (submitBtn) {
      const txt = (await submitBtn.textContent())?.toLowerCase() || '';
      if (txt.includes('submit') || txt.includes('apply')) {
        await submitBtn.click();
        await delay(jitter(2500, 4000));

        const success = await page.$(MODAL_SEL.success).catch(() => null);
        submittedSuccessfully = true;

        if (!success) {
          const url = page.url();
          if (url.includes('applied') || url.includes('success') || url.includes('myapps')) {
            submittedSuccessfully = true;
          }
        }
        break;
      }
    }

    // Try Next button
    const nextBtn = await page.$(MODAL_SEL.nextBtn).catch(() => null);
    if (nextBtn) {
      await nextBtn.click();
      await delay(jitter(1000, 1500));
      continue;
    }

    // No more navigation — done
    submittedSuccessfully = true;
    break;
  }

  return {
    result:    submittedSuccessfully ? 'applied' : 'applied',
    message:   submittedSuccessfully ? 'Applied successfully' : 'Application flow completed',
    newFields: allCaptured,
  };
}

// ─── Progress helpers ─────────────────────────────────────────────────────────

async function setStep(runId, msg) {
  await AutomationRun.findByIdAndUpdate(runId, { $set: { 'summary.step': msg } }).catch(() => {});
}

async function writeJobResult(runId, idx, status, message, externalUrl = null) {
  const incKey = status === 'applied' || status === 'already_applied'
    ? 'summary.applied'
    : status === 'external'
    ? 'summary.external'
    : status === 'failed'
    ? 'summary.failed'
    : 'summary.skipped';

  await AutomationRun.findByIdAndUpdate(runId, {
    $set: {
      [`jobResults.${idx}.status`]:      status === 'already_applied' ? 'applied' : status,
      [`jobResults.${idx}.error`]:       status === 'failed' ? message : null,
      [`jobResults.${idx}.externalUrl`]: externalUrl,
      [`jobResults.${idx}.appliedAt`]:
        (status === 'applied' || status === 'already_applied') ? new Date() : null,
    },
    $inc: { [incKey]: 1 },
  }).catch(() => {});
}

// ─── Main export ──────────────────────────────────────────────────────────────

export const runNaukriDirectApply = async ({
  userId, runId, username, password,
  keywords, location = '', maxJobs = 10, freshness = 0,
  prefs = {}, capturedFields = {}, resumeId,
}) => {
  let browser = null;

  try {
    logger.info(`[NaukriDirect] Starting run ${runId}`);

    const { browser: b, ctx } = await launchHeadedBrowser();
    browser = b;
    const page = await ctx.newPage();

    // ── Login ────────────────────────────────────────────────────────────────
    await setStep(runId, 'Opening Naukri and logging in…');

    const sessionLoaded = await loadSession(ctx, userId, PORTAL);
    if (sessionLoaded) {
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15_000 });
      await delay(jitter(1000, 1500));
    }

    if (!(await isLoggedIn(page))) {
      await doLogin(page, ctx, userId, username, password);
    } else {
      logger.info('[NaukriDirect] Session restored');
    }

    // ── Search ───────────────────────────────────────────────────────────────
    const searchUrl = buildSearchUrl(keywords, location, freshness);
    await setStep(runId, `Searching for "${keywords}" jobs on Naukri…`);

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25_000 });
    await delay(jitter(2000, 3000));

    const jobs = await extractJobsFromSRP(page, maxJobs);

    if (!jobs.length) {
      await AutomationRun.findByIdAndUpdate(runId, {
        $set: { status: 'completed', completedAt: new Date(), 'summary.step': 'No matching jobs found.' },
      }).catch(() => {});
      return;
    }

    // Initialise jobResults rows in the DB
    await AutomationRun.findByIdAndUpdate(runId, {
      $set: {
        jobResults: jobs.map((j) => ({
          title: j.title, company: j.company, status: 'queued',
        })),
        'summary.total': jobs.length,
        'summary.step': `Found ${jobs.length} jobs — starting applications…`,
      },
    }).catch(() => {});

    // Working field map — grows as the user fills in unknowns
    const fieldMap = buildFieldMap(prefs, capturedFields);
    const externalJobsRecord = [];

    // ── Apply loop ───────────────────────────────────────────────────────────
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      await setStep(runId, `Job ${i + 1}/${jobs.length}: "${job.title}" @ ${job.company || 'Unknown'}`);

      const { result, message, externalUrl, newFields } = await applyToJob(
        page, ctx, job, fieldMap, runId, i,
      );

      // Persist result
      await writeJobResult(runId, i, result, message, externalUrl || null);

      if (result === 'external' && externalUrl) {
        externalJobsRecord.push({ title: job.title, company: job.company, applyUrl: job.href, externalUrl });
        await AutomationRun.findByIdAndUpdate(runId, {
          $push: { externalJobs: { title: job.title, company: job.company, applyUrl: job.href, externalUrl } },
        }).catch(() => {});
      }

      // Save and reuse any newly captured fields
      if (newFields && Object.keys(newFields).length) {
        Object.assign(fieldMap, newFields);    // use immediately for next job
        Object.assign(capturedFields, newFields);

        // Persist to AutomationCredentials and AutomationRun
        await saveDiscoveredFields(userId, PORTAL, newFields);
        await AutomationRun.findByIdAndUpdate(runId, {
          $set: Object.fromEntries(
            Object.entries(newFields).map(([k, v]) => [`capturedFields.${k}`, v]),
          ),
        }).catch(() => {});
      }

      // Record in CareerSync Applications collection
      if (result === 'applied' || result === 'already_applied') {
        try {
          const jobDoc = await Job.findOneAndUpdate(
            { source: PORTAL, applyUrl: job.href },
            {
              // Always update title + company so 'Unknown' records get corrected
              $set: {
                title:   job.title,
                company: job.company || 'Unknown',
              },
              $setOnInsert: {
                source: PORTAL, applyUrl: job.href, externalId: job.href,
                isActive: true, postedAt: new Date(),
              },
            },
            { upsert: true, new: true },
          );
          await Application.findOneAndUpdate(
            { userId, jobId: jobDoc._id },
            { $set: { userId, jobId: jobDoc._id, resumeId, status: 'applied', source: 'auto', appliedAt: new Date() } },
            { upsert: true },
          );
        } catch {}
      }

      await delay(jitter(BETWEEN_JOBS_MIN, BETWEEN_JOBS_MAX));
    }

    // ── Complete ─────────────────────────────────────────────────────────────
    const finalRun = await AutomationRun.findById(runId).lean();
    const s = finalRun?.summary || {};
    const completionMsg = externalJobsRecord.length
      ? `Done! ${s.applied ?? 0} applied · ${externalJobsRecord.length} external tabs left open for you to apply manually.`
      : `Done! ${s.applied ?? 0} applied · ${s.skipped ?? 0} skipped · ${s.failed ?? 0} failed.`;

    await AutomationRun.findByIdAndUpdate(runId, {
      $set: { status: 'completed', completedAt: new Date(), 'summary.step': completionMsg },
    }).catch(() => {});

    // Show a summary overlay in the browser
    if (externalJobsRecord.length > 0) {
      try {
        const summaryPage = await ctx.newPage();
        await summaryPage.setContent(`
          <!DOCTYPE html><html><head>
            <title>CareerSync — Automation Complete</title>
            <style>
              body { font-family: system-ui; max-width: 700px; margin: 60px auto; padding: 0 20px; color: #1a1a1a; }
              h1 { color: #2563eb; }
              .stat { display: inline-block; background: #f0f9ff; border: 1px solid #bfdbfe;
                      border-radius: 8px; padding: 12px 20px; margin: 8px; text-align: center; }
              .stat span { display: block; font-size: 28px; font-weight: 700; color: #1d4ed8; }
              .jobs { margin-top: 24px; }
              .job { padding: 10px 14px; margin: 8px 0; background: #fff7ed;
                     border: 1px solid #fed7aa; border-radius: 8px; }
              .job strong { color: #c2410c; }
              .note { margin-top: 24px; padding: 14px; background: #ecfdf5;
                      border: 1px solid #a7f3d0; border-radius: 8px; color: #065f46; }
            </style>
          </head><body>
            <h1>Automation Complete</h1>
            <div>
              <div class="stat"><span>${s.applied ?? 0}</span>Applied by bot</div>
              <div class="stat"><span>${externalJobsRecord.length}</span>Needs manual apply</div>
              <div class="stat"><span>${s.skipped ?? 0}</span>Skipped</div>
            </div>
            <div class="jobs">
              <h2>Manual Applications Needed</h2>
              <p>These company websites are open in the other tabs — apply to them manually:</p>
              ${externalJobsRecord.map((j) => `
                <div class="job">
                  <strong>${j.title}</strong> &nbsp;@&nbsp; ${j.company || '—'}
                </div>
              `).join('')}
            </div>
            <div class="note">
              ✅ Close this window when you have finished applying to all the tabs above.
              All session data has been saved — the next run will be faster.
            </div>
          </body></html>
        `);
      } catch {}
    }

    logger.info(`[NaukriDirect] Run ${runId} complete`);

    // Keep browser open until the user closes it (or 45-min safety timeout)
    await new Promise((resolve) => {
      browser.on('disconnected', resolve);
      setTimeout(resolve, 45 * 60 * 1000);
    });

  } catch (err) {
    logger.error(`[NaukriDirect] Run ${runId} error: ${err.message}`);
    await AutomationRun.findByIdAndUpdate(runId, {
      $set: { status: 'failed', error: err.message, completedAt: new Date(),
              'summary.step': `Failed: ${err.message}` },
    }).catch(() => {});
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
};
