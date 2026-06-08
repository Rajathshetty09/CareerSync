/**
 * LinkedIn Easy Apply — headed (visible) Chromium automation.
 *
 * Works exactly like the Naukri automation:
 *   • Walks through the multi-step Easy Apply modal step-by-step
 *   • Fills every question it already knows the answer to (from prefs + capturedFields)
 *   • Pauses 8 s per step so the user can type answers to new questions
 *   • After each pause, reads every filled field INCLUDING radio buttons / dropdowns,
 *     keyed by their question-label text (stable across sessions)
 *   • Saves all newly-discovered answers to AutomationCredentials.capturedFields
 *     → auto-filled for all remaining jobs this run AND every future run
 */

import { chromium } from 'playwright';
import AutomationRun from '../../models/AutomationRun.js';
import AutomationCredentials from '../../models/AutomationCredentials.js';
import Application from '../../models/Application.js';
import Job from '../../models/Job.js';
import logger from '../../utils/logger.js';
import { saveSession, loadSession } from '../browser/sessionManager.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const PORTAL           = 'linkedin';
const BASE             = 'https://www.linkedin.com';
const LOGIN_URL        = `${BASE}/login`;
const USER_FILL_PAUSE  = 8_000;   // ms pause per step for user input
const BETWEEN_JOBS_MIN = 5_000;
const BETWEEN_JOBS_MAX = 9_000;

const delay  = (ms)       => new Promise((r) => setTimeout(r, ms));
const jitter = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Normalise any string into a stable cache key
const toKey = (t) =>
  t?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || null;

// ─── Selectors ────────────────────────────────────────────────────────────────

const LOGIN_SEL = {
  email:    '#username',
  password: '#password',
  submit:   'button[type="submit"]',
  error:    '#error-for-username, .alert-content, [class*="form__label--error"]',
  loggedIn: [
    '.global-nav__me-photo',
    'a[href*="/feed/"]',
    'img.global-nav__me-photo',
    '.nav-item--profile',
  ],
};

const JOB_LINK_SELS = [
  'a.job-card-list__title',
  'a.job-card-container__link',
  'a[href*="/jobs/view/"]',
  '.base-card__full-link',
];

const DETAIL_SEL = {
  easyApply:   'button.jobs-apply-button, button[aria-label*="Easy Apply"], button[aria-label*="easy apply"]',
  alreadyDone: 'button[aria-label*="Applied"], button:disabled[class*="apply"], .artdeco-inline-feedback--success',
};

const MODAL_SEL = {
  container:  '.jobs-easy-apply-modal, [aria-labelledby*="aria-modal-job-apply"]',
  dismiss:    'button[aria-label="Dismiss"], button[aria-label="Close"]',
  discardBtn: 'button:has-text("Discard")',
  nextBtn:    'button[aria-label="Continue to next step"]',
  reviewBtn:  'button[aria-label="Review your application"]',
  submitBtn:  'button[aria-label="Submit application"]',
  errorMsg:   '.artdeco-inline-feedback--error, [class*="error-container"]',
  // Direct-fill selectors for well-known fields
  phone:      'input[id*="phoneNumber"], input[aria-label*="Phone"], input[name*="phone"]',
  city:       'input[id*="city"], input[aria-label*="City"]',
  followChk:  'input[id*="follow-company"]',
};

// ─── Browser ──────────────────────────────────────────────────────────────────

async function launchHeadedBrowser() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });
  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    viewport: null,
    locale: 'en-US',
    timezoneId: 'Asia/Kolkata',
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
  });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
  });
  return { browser, ctx };
}

// ─── Login ────────────────────────────────────────────────────────────────────

async function isLoggedIn(page) {
  const url = page.url();
  if (url.includes('/feed') || url.includes('/jobs')) return true;
  for (const sel of LOGIN_SEL.loggedIn) {
    if (await page.$(sel).catch(() => null)) return true;
  }
  return false;
}

async function doLogin(page, ctx, userId, username, password) {
  logger.info('[LinkedInDirect] Logging in…');
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 25_000 });
  await delay(jitter(1500, 2500));

  const emailEl = await page.waitForSelector(LOGIN_SEL.email, { timeout: 10_000 });
  await emailEl.click({ clickCount: 3 });
  await emailEl.type(username, { delay: jitter(80, 150) });
  await delay(jitter(400, 800));

  const passEl = await page.waitForSelector(LOGIN_SEL.password, { timeout: 5_000 });
  await passEl.click({ clickCount: 3 });
  await passEl.type(password, { delay: jitter(80, 150) });
  await delay(jitter(600, 1000));

  await page.click(LOGIN_SEL.submit);
  await page.waitForLoadState('domcontentloaded', { timeout: 20_000 }).catch(() => {});
  await delay(jitter(2000, 3000));

  const url = page.url();
  if (url.includes('/checkpoint/') || url.includes('/authwall') || url.includes('verification')) {
    throw new Error(
      'LinkedIn requires identity verification — complete it in the browser window, then retry.',
    );
  }

  const errEl = await page.$(LOGIN_SEL.error).catch(() => null);
  if (errEl) {
    throw new Error(`LinkedIn login error: ${(await errEl.textContent())?.trim() || 'Login failed'}`);
  }

  if (!(await isLoggedIn(page))) {
    throw new Error('Login appeared to succeed but no feed indicator found — check the browser for a CAPTCHA.');
  }

  await saveSession(ctx, userId, PORTAL);
  logger.info('[LinkedInDirect] Login successful');
}

// ─── Search ───────────────────────────────────────────────────────────────────

// freshness = days (1, 3, 7, 15, 30) → LinkedIn f_TPR param in seconds
const LINKEDIN_FRESHNESS = { 1: 86400, 3: 259200, 7: 604800, 15: 1296000, 30: 2592000 };

function buildSearchUrl(keywords, location, freshness = 0) {
  const params = new URLSearchParams({ keywords, f_AL: 'true', sortBy: 'DD' });
  if (location) params.set('location', location);
  if (freshness && LINKEDIN_FRESHNESS[freshness]) params.set('f_TPR', `r${LINKEDIN_FRESHNESS[freshness]}`);
  return `${BASE}/jobs/search/?${params.toString()}`;
}

async function extractJobsFromSRP(page, maxJobs) {
  await page.waitForSelector(JOB_LINK_SELS.join(', '), { timeout: 20_000 }).catch(() => {});
  await delay(jitter(2000, 3000));
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, 600));
    await delay(jitter(800, 1200));
  }
  return page.evaluate(
    ({ sels, max }) => {
      const seen = new Set();
      const results = [];
      for (const sel of sels) {
        for (const a of document.querySelectorAll(sel)) {
          const href = (a.href || '').split('?')[0];
          const title = a.textContent?.trim() || a.getAttribute('aria-label')?.trim() || '';
          if (!href || !title || seen.has(href) || !href.includes('/jobs/view/')) continue;
          seen.add(href);
          const card = a.closest('li') || a.closest('article') || a.closest('[data-occludable-job-id]');
          const compEl = card?.querySelector('[class*="company-name"], [class*="subtitle"]');
          results.push({ href, title, company: compEl?.textContent?.trim() || '' });
          if (results.length >= max) return results;
        }
        if (results.length >= max) break;
      }
      return results;
    },
    { sels: JOB_LINK_SELS, max: maxJobs },
  );
}

// ─── Field map ────────────────────────────────────────────────────────────────

function buildFieldMap(prefs, capturedFields) {
  return {
    phoneNumber:          capturedFields.phoneNumber          ?? prefs.phoneNumber          ?? null,
    yearsOfExperience:    capturedFields.yearsOfExperience    ?? prefs.yearsOfExperience    ?? null,
    totalExperienceYears: capturedFields.totalExperienceYears ?? null,
    currentCity:          capturedFields.currentCity          ?? null,
    ...capturedFields,   // all other question-label-keyed answers pass through
  };
}

// ─── Step 1: Fill well-known preference fields by selector ───────────────────

async function fillKnownPreferences(page, fieldMap) {
  // Phone
  if (fieldMap.phoneNumber) {
    const el = await page.$(MODAL_SEL.phone).catch(() => null);
    if (el && !(await el.inputValue().catch(() => ''))) {
      await el.fill(String(fieldMap.phoneNumber)).catch(() => {});
    }
  }
  // City
  if (fieldMap.currentCity) {
    const el = await page.$(MODAL_SEL.city).catch(() => null);
    if (el && !(await el.inputValue().catch(() => ''))) {
      await el.fill(String(fieldMap.currentCity)).catch(() => {});
    }
  }
  // Years of experience
  const expVal = fieldMap.yearsOfExperience ?? fieldMap.totalExperienceYears;
  if (expVal != null) {
    const els = await page.$$('input[id*="experience"], input[aria-label*="experience" i], input[aria-label*="years" i]').catch(() => []);
    for (const el of els) {
      if (!(await el.inputValue().catch(() => ''))) {
        await el.fill(String(expVal)).catch(() => {});
      }
    }
  }
  // Uncheck "Follow company"
  const followEl = await page.$(MODAL_SEL.followChk).catch(() => null);
  if (followEl && await followEl.isChecked().catch(() => false)) {
    await followEl.uncheck().catch(() => {});
  }
}

// ─── Step 2: Smart defaults for common yes/no questions ──────────────────────

async function applySmartDefaults(page) {
  // Fieldset radios
  for (const fieldset of await page.$$('fieldset').catch(() => [])) {
    const legend = await fieldset.$('legend').catch(() => null);
    if (!legend) continue;
    const text = (await legend.textContent())?.toLowerCase() || '';

    let preferYes = null;
    if (/authorized|legally|eligible|right to work/.test(text))   preferYes = true;
    if (/require sponsorship|need sponsorship|visa sponsorship/.test(text)) preferYes = false;
    if (/comfortable|willing|able to/.test(text))                 preferYes = true;
    if (/criminal|felony/.test(text))                              preferYes = false;
    if (preferYes === null) continue;

    const target = preferYes ? 'yes' : 'no';
    for (const label of await fieldset.$$('label').catch(() => [])) {
      const txt = (await label.textContent())?.toLowerCase().trim() || '';
      if (txt === target || txt.startsWith(target)) {
        const forAttr = await label.getAttribute('for').catch(() => null);
        if (forAttr) {
          const radio = await page.$(`#${CSS.escape ? forAttr : forAttr}`).catch(() => null);
          if (radio && !(await radio.isChecked().catch(() => false))) {
            await radio.check().catch(() => {});
          }
        }
        break;
      }
    }
  }

  // Select dropdowns with yes/no options
  for (const sel of await page.$$('select').catch(() => [])) {
    const id = await sel.getAttribute('id').catch(() => null);
    const label = id ? await page.$(`label[for="${id}"]`).catch(() => null) : null;
    if (!label) continue;
    const labelText = (await label.textContent())?.toLowerCase() || '';
    const opts = await sel.$$eval('option', (os) => os.map((o) => ({ v: o.value, t: o.text.toLowerCase().trim() }))).catch(() => []);

    let preferYes = null;
    if (/authorized|eligible/.test(labelText))      preferYes = true;
    if (/sponsorship|visa/.test(labelText))          preferYes = false;
    if (preferYes === null) continue;

    const match = opts.find((o) => preferYes ? o.t === 'yes' : o.t === 'no');
    if (match) await sel.selectOption(match.v).catch(() => {});
  }
}

// ─── Step 3: Replay ALL previously-captured question-answer pairs ─────────────
//
// Keys are normalised question labels, so we can match "How many years of
// experience do you have with React?" → key "how_many_years_of_experience_do"
// and fill the associated input with the cached answer.

async function replayAnswers(page, cache) {
  if (!Object.keys(cache).length) return;

  await page.evaluate((cacheObj) => {
    const modal =
      document.querySelector('.jobs-easy-apply-modal') ||
      document.querySelector('.artdeco-modal') ||
      document.body;

    const toKey = (t) =>
      t?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || null;

    // Find the question label for a field element
    const findLabel = (el) => {
      const container = el.closest(
        '.artdeco-form-item, .jobs-easy-apply-form-element, .fb-form-element, ' +
        '[class*="form-item"], [class*="form-element"], [class*="formElement"]',
      );
      if (container) {
        const lbl = container.querySelector('label, legend, span[class*="label"]');
        if (lbl) return lbl.textContent?.trim();
      }
      if (el.id) {
        try {
          const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
          if (lbl) return lbl.textContent?.trim();
        } catch {}
      }
      return el.getAttribute('aria-label') || el.placeholder || el.name || null;
    };

    // React-friendly value setter so controlled inputs update their state
    const setNative = (el, val) => {
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, val);
      else el.value = val;
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };

    // ── Text / number / tel / email / textarea ─────────────────────────────
    for (const el of modal.querySelectorAll(
      'input:not([type="hidden"]):not([type="file"]):not([type="radio"]):not([type="checkbox"]), textarea',
    )) {
      if (el.value?.trim()) continue;                          // already filled
      const q   = findLabel(el);
      const key = toKey(q);
      if (!key || cacheObj[key] === undefined) continue;
      setNative(el, String(cacheObj[key]));
    }

    // ── Select dropdowns ─────────────────────────────────────────────────────
    for (const el of modal.querySelectorAll('select')) {
      if (el.value && el.value !== '') continue;               // already chosen
      const q   = findLabel(el);
      const key = toKey(q);
      if (!key || cacheObj[key] === undefined) continue;

      const target = String(cacheObj[key]).toLowerCase();
      for (const opt of el.options) {
        if (
          opt.text.trim().toLowerCase() === target ||
          opt.text.trim().toLowerCase().includes(target) ||
          opt.value.toLowerCase() === target
        ) {
          el.value = opt.value;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    }

    // ── Radio buttons ─────────────────────────────────────────────────────────
    for (const fieldset of modal.querySelectorAll('fieldset')) {
      if (fieldset.querySelector('input[type="radio"]:checked')) continue; // already picked
      const legend = fieldset.querySelector('legend');
      const q      = legend?.textContent?.trim();
      const key    = toKey(q);
      if (!key || cacheObj[key] === undefined) continue;

      const target = String(cacheObj[key]).toLowerCase();
      for (const radio of fieldset.querySelectorAll('input[type="radio"]')) {
        let labelText = '';
        try {
          const lbl = fieldset.querySelector(`label[for="${CSS.escape(radio.id)}"]`) ||
                      radio.closest('label');
          labelText = (lbl?.textContent?.trim() || radio.value)?.toLowerCase();
        } catch {
          labelText = radio.value?.toLowerCase() || '';
        }
        if (labelText === target || labelText?.includes(target)) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
          radio.dispatchEvent(new Event('click',  { bubbles: true }));
          break;
        }
      }
    }
  }, cache);
}

// ─── Step 4: Capture ALL filled question-answer pairs from the current step ───
//
// Keyed by question label text (not by field name/id which change each session).
// Captures: text inputs, selects (option text), radio buttons, textareas.

async function captureAllAnswers(page) {
  return page.evaluate(() => {
    const modal =
      document.querySelector('.jobs-easy-apply-modal') ||
      document.querySelector('.artdeco-modal') ||
      document.body;

    const toKey = (t) =>
      t?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || null;

    const findLabel = (el) => {
      const container = el.closest(
        '.artdeco-form-item, .jobs-easy-apply-form-element, .fb-form-element, ' +
        '[class*="form-item"], [class*="form-element"], [class*="formElement"]',
      );
      if (container) {
        const lbl = container.querySelector('label, legend, span[class*="label"]');
        if (lbl) return lbl.textContent?.trim();
      }
      if (el.id) {
        try {
          const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
          if (lbl) return lbl.textContent?.trim();
        } catch {}
      }
      return el.getAttribute('aria-label') || el.placeholder || el.name || null;
    };

    const answers = {};

    // ── Text / number / tel / email / textarea ─────────────────────────────
    for (const el of modal.querySelectorAll(
      'input:not([type="hidden"]):not([type="file"]):not([type="radio"]):not([type="checkbox"]), textarea',
    )) {
      const val = el.value?.trim();
      if (!val) continue;
      const q   = findLabel(el);
      const key = toKey(q);
      if (key) answers[key] = val;
    }

    // ── Select dropdowns (store option text, not value — more readable + stable) ─
    for (const el of modal.querySelectorAll('select')) {
      if (!el.value || el.selectedIndex < 0) continue;
      const selectedText = el.options[el.selectedIndex]?.text?.trim();
      if (!selectedText || selectedText.toLowerCase().startsWith('select')) continue;
      const q   = findLabel(el);
      const key = toKey(q);
      if (key) answers[key] = selectedText;
    }

    // ── Radio buttons ─────────────────────────────────────────────────────────
    for (const fieldset of modal.querySelectorAll('fieldset')) {
      const legend = fieldset.querySelector('legend');
      const q      = legend?.textContent?.trim();
      if (!q) continue;

      const checked = fieldset.querySelector('input[type="radio"]:checked');
      if (!checked) continue;

      let ans = checked.value;
      try {
        const lbl = fieldset.querySelector(`label[for="${CSS.escape(checked.id)}"]`) ||
                    checked.closest('label');
        if (lbl) ans = lbl.textContent?.trim() || ans;
      } catch {}

      const key = toKey(q);
      if (key && ans) answers[key] = ans;
    }

    return answers;
  });
}

// ─── Normalise well-known answers into preference keys ───────────────────────

function normaliseToPrefs(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (/phone|mobile|tel/.test(k))                              out.phoneNumber          = v;
    else if (/^city/.test(k) || /current.*city|city.*current/.test(k)) out.currentCity   = v;
    else if (/relevant.*exp|exp.*relevant/.test(k))              out.yearsOfExperience    = isNaN(v) ? v : Number(v);
    else if (/total.*exp|years.*exp|exp.*years/.test(k))         out.totalExperienceYears = isNaN(v) ? v : Number(v);
    else if (/experience.*year|year.*experience/.test(k) && !isNaN(v)) out.yearsOfExperience = Number(v);
    else out[k] = v;   // keep as-is — label-keyed answer for this specific question
  }
  return out;
}

// ─── Persist new answers to AutomationCredentials ────────────────────────────

async function saveDiscoveredAnswers(userId, newFields) {
  if (!Object.keys(newFields).length) return;
  const setObj = {};
  for (const [k, v] of Object.entries(newFields)) {
    setObj[`capturedFields.${k}`] = v;
  }
  await AutomationCredentials.findOneAndUpdate({ userId, portal: PORTAL }, { $set: setObj }).catch(() => {});
  logger.info(`[LinkedInDirect] Saved ${Object.keys(newFields).length} answer(s): ${Object.keys(newFields).join(', ')}`);
}

// ─── Apply flow ───────────────────────────────────────────────────────────────

async function applyToJob(page, job, fieldMap) {
  try {
    logger.info(`[LinkedInDirect] Navigating: ${job.title}`);
    await page.goto(job.href, { waitUntil: 'domcontentloaded', timeout: 25_000 });
    await delay(jitter(2000, 3000));

    // ── Extract company + title from detail page ──────────────────────────────
    const detailCompany = await page.$$eval(
      '.job-details-jobs-unified-top-card__company-name a, .jobs-unified-top-card__company-name a, .topcard__org-name-link, a[class*="company-name"]',
      (els) => { for (const el of els) { const t = el.textContent?.trim(); if (t && t.length > 0 && t.length < 120) return t; } return ''; },
    ).catch(() => '');
    if (detailCompany) job.company = detailCompany;

    const detailTitle = await page.$eval(
      'h1.job-details-jobs-unified-top-card__job-title, h1.jobs-unified-top-card__job-title, h1[class*="topcard__title"]',
      (el) => el.textContent?.trim() || '',
    ).catch(() => '');
    if (detailTitle) job.title = detailTitle;

    // ── Already applied? ──────────────────────────────────────────────────────
    const alreadyEl = await page.$(DETAIL_SEL.alreadyDone).catch(() => null);
    if (alreadyEl) {
      const txt = (await alreadyEl.textContent())?.toLowerCase() || '';
      if (txt.includes('applied')) return { result: 'already_applied', message: 'Already applied', newFields: {} };
    }

    // ── Find Easy Apply button ────────────────────────────────────────────────
    const easyApplyBtn = await page.$(DETAIL_SEL.easyApply).catch(() => null);
    if (!easyApplyBtn) {
      const btnText = await page.$eval(
        'button.jobs-apply-button', (b) => b.textContent?.toLowerCase() || '',
      ).catch(() => '');
      if (btnText.includes('company website') || btnText.includes('apply now')) {
        return { result: 'skipped', message: 'No Easy Apply — requires external apply', newFields: {} };
      }
      return { result: 'skipped', message: 'Easy Apply button not found', newFields: {} };
    }

    const btnTxt = (await easyApplyBtn.textContent())?.toLowerCase() || '';
    if (btnTxt.includes('applied') && !btnTxt.includes('easy apply')) {
      return { result: 'already_applied', message: 'Already applied', newFields: {} };
    }

    await easyApplyBtn.click();
    await delay(jitter(2000, 3000));

    return await handleEasyApplyModal(page, fieldMap);

  } catch (err) {
    logger.warn(`[LinkedInDirect] Error on "${job.title}": ${err.message}`);
    try {
      const dismissBtn = await page.$(MODAL_SEL.dismiss).catch(() => null);
      if (dismissBtn) {
        await dismissBtn.click();
        await delay(1500);
        const discardBtn = await page.$(MODAL_SEL.discardBtn).catch(() => null);
        if (discardBtn) await discardBtn.click();
      }
    } catch {}
    return { result: 'failed', message: err.message, newFields: {} };
  }
}

async function handleEasyApplyModal(page, fieldMap) {
  const allCaptured = {};   // accumulates new answers across steps this job
  const MAX_STEPS   = 14;

  for (let step = 0; step < MAX_STEPS; step++) {
    // Check modal is still open
    const modal = await page.$(MODAL_SEL.container).catch(() => null);
    if (!modal) {
      return { result: 'applied', message: 'Applied successfully', newFields: allCaptured };
    }

    // ── 1. Fill direct preference fields (phone, city, experience) ─────────
    await fillKnownPreferences(page, { ...fieldMap, ...allCaptured });

    // ── 2. Apply smart yes/no defaults for work-auth, sponsorship etc. ─────
    await applySmartDefaults(page);

    // ── 3. Replay ALL cached answers by question-label matching ────────────
    await replayAnswers(page, { ...fieldMap, ...allCaptured });

    // ── 4. Pause — user fills anything the bot doesn't know ────────────────
    await delay(USER_FILL_PAUSE);

    // ── 5. Capture EVERYTHING filled in this step (text + select + radio) ──
    const stepAnswers = await captureAllAnswers(page);
    const normalised  = normaliseToPrefs(stepAnswers);
    // Merge: normalised well-known keys + any label-keyed answers
    Object.assign(allCaptured, normalised);

    // ── Check for validation errors — pause extra so user can fix ──────────
    const errorEl = await page.$(MODAL_SEL.errorMsg).catch(() => null);
    if (errorEl) {
      logger.warn(`[LinkedInDirect] Step ${step + 1} has validation errors — pausing 5s for user to fix`);
      await delay(5_000);
      continue;
    }

    // ── Submit ──────────────────────────────────────────────────────────────
    const submitBtn = await page.$(MODAL_SEL.submitBtn).catch(() => null);
    if (submitBtn && await submitBtn.isEnabled().catch(() => false)) {
      await submitBtn.click();
      await delay(jitter(3000, 5000));
      return { result: 'applied', message: 'Applied successfully', newFields: allCaptured };
    }

    // ── Review ──────────────────────────────────────────────────────────────
    const reviewBtn = await page.$(MODAL_SEL.reviewBtn).catch(() => null);
    if (reviewBtn && await reviewBtn.isEnabled().catch(() => false)) {
      await reviewBtn.click();
      await delay(jitter(1500, 2500));
      continue;
    }

    // ── Next ────────────────────────────────────────────────────────────────
    const nextBtn = await page.$(MODAL_SEL.nextBtn).catch(() => null);
    if (nextBtn && await nextBtn.isEnabled().catch(() => false)) {
      await nextBtn.click();
      await delay(jitter(1500, 2500));
      continue;
    }

    // No navigation button found — treat as complete
    return { result: 'applied', message: 'Application flow completed', newFields: allCaptured };
  }

  return { result: 'applied', message: 'Applied (max steps reached)', newFields: allCaptured };
}

// ─── Progress helpers ─────────────────────────────────────────────────────────

async function setStep(runId, msg) {
  await AutomationRun.findByIdAndUpdate(runId, { $set: { 'summary.step': msg } }).catch(() => {});
}

async function writeJobResult(runId, idx, status, message) {
  const incKey =
    status === 'applied' || status === 'already_applied' ? 'summary.applied' :
    status === 'failed'  ? 'summary.failed' :
    'summary.skipped';

  await AutomationRun.findByIdAndUpdate(runId, {
    $set: {
      [`jobResults.${idx}.status`]:    status === 'already_applied' ? 'applied' : status,
      [`jobResults.${idx}.error`]:     status === 'failed' ? message : null,
      [`jobResults.${idx}.appliedAt`]: (status === 'applied' || status === 'already_applied') ? new Date() : null,
    },
    $inc: { [incKey]: 1 },
  }).catch(() => {});
}

// ─── Main export ──────────────────────────────────────────────────────────────

export const runLinkedInDirectApply = async ({
  userId, runId, username, password,
  keywords, location = '', maxJobs = 10, freshness = 0,
  prefs = {}, capturedFields = {}, resumeId,
}) => {
  let browser = null;

  try {
    logger.info(`[LinkedInDirect] Starting run ${runId}`);

    const { browser: b, ctx } = await launchHeadedBrowser();
    browser = b;
    const page = await ctx.newPage();

    // ── Login ────────────────────────────────────────────────────────────────
    await setStep(runId, 'Opening LinkedIn and logging in…');

    const sessionLoaded = await loadSession(ctx, userId, PORTAL);
    if (sessionLoaded) {
      await page.goto(`${BASE}/feed/`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
      await delay(jitter(1500, 2500));
    }

    if (!(await isLoggedIn(page))) {
      await doLogin(page, ctx, userId, username, password);
    } else {
      logger.info('[LinkedInDirect] Session restored');
    }

    // ── Search ───────────────────────────────────────────────────────────────
    const searchUrl = buildSearchUrl(keywords, location, freshness);
    await setStep(runId, `Searching LinkedIn Easy Apply jobs for "${keywords}"…`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25_000 });
    await delay(jitter(2500, 4000));

    const jobs = await extractJobsFromSRP(page, maxJobs);

    if (!jobs.length) {
      await AutomationRun.findByIdAndUpdate(runId, {
        $set: { status: 'completed', completedAt: new Date(), 'summary.step': 'No Easy Apply jobs found for these keywords.' },
      }).catch(() => {});
      return;
    }

    await AutomationRun.findByIdAndUpdate(runId, {
      $set: {
        jobResults:      jobs.map((j) => ({ title: j.title, company: j.company, status: 'queued' })),
        'summary.total': jobs.length,
        'summary.step':  `Found ${jobs.length} Easy Apply jobs — starting applications…`,
      },
    }).catch(() => {});

    // Working field map — grows as user fills in new answers during the run
    const fieldMap = buildFieldMap(prefs, capturedFields);

    // ── Apply loop ───────────────────────────────────────────────────────────
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      await setStep(runId, `Job ${i + 1}/${jobs.length}: "${job.title}" @ ${job.company || '…'}`);

      const { result, message, newFields } = await applyToJob(page, job, fieldMap);

      await writeJobResult(runId, i, result, message);

      // Persist and immediately reuse any new answers discovered this job
      if (newFields && Object.keys(newFields).length) {
        Object.assign(fieldMap, newFields);         // use for remaining jobs this run
        Object.assign(capturedFields, newFields);

        await saveDiscoveredAnswers(userId, newFields);
        await AutomationRun.findByIdAndUpdate(runId, {
          $set: Object.fromEntries(
            Object.entries(newFields).map(([k, v]) => [`capturedFields.${k}`, v]),
          ),
        }).catch(() => {});
      }

      // Record in CareerSync Applications
      if (result === 'applied' || result === 'already_applied') {
        try {
          const jobDoc = await Job.findOneAndUpdate(
            { source: PORTAL, applyUrl: job.href },
            {
              $set:         { title: job.title, company: job.company || 'Unknown' },
              $setOnInsert: { source: PORTAL, applyUrl: job.href, externalId: job.href, isActive: true, postedAt: new Date() },
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
    const s        = finalRun?.summary || {};
    const completionMsg = `Done! ${s.applied ?? 0} applied · ${s.skipped ?? 0} skipped · ${s.failed ?? 0} failed.`;

    await AutomationRun.findByIdAndUpdate(runId, {
      $set: { status: 'completed', completedAt: new Date(), 'summary.step': completionMsg },
    }).catch(() => {});

    logger.info(`[LinkedInDirect] Run ${runId} complete`);

    // Keep browser open so user can review results
    await new Promise((resolve) => {
      browser.on('disconnected', resolve);
      setTimeout(resolve, 30 * 60 * 1000);
    });

  } catch (err) {
    logger.error(`[LinkedInDirect] Run ${runId} error: ${err.message}`);
    await AutomationRun.findByIdAndUpdate(runId, {
      $set: { status: 'failed', error: err.message, completedAt: new Date(), 'summary.step': `Failed: ${err.message}` },
    }).catch(() => {});
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
};
