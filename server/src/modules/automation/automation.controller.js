import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import ApiError from '../../utils/ApiError.js';
import AutomationCredentials from '../../models/AutomationCredentials.js';
import AutomationRun from '../../models/AutomationRun.js';
import Resume from '../../models/Resume.js';
import { encrypt, decrypt } from '../../utils/crypto.util.js';
import { hasSession } from '../../automation/browser/sessionManager.js';
import { runNaukriDirectApply } from '../../automation/naukri/naukri.directApply.js';
import { runLinkedInDirectApply } from '../../automation/linkedin/linkedin.directApply.js';
import logger from '../../utils/logger.js';

// ─── Credentials ─────────────────────────────────────────────────────────────

/** Save (or update) encrypted credentials for a portal */
export const saveCredentials = asyncHandler(async (req, res) => {
  const { portal, username, password, preferences } = req.body;

  const encryptedPassword = encrypt(password);

  // Use dot notation per preference key so we never replace the whole
  // subdocument — avoids Mongoose validation errors for unset sibling fields.
  const prefSet = {};
  for (const [k, v] of Object.entries(preferences || {})) {
    prefSet[`preferences.${k}`] = v;
  }

  const creds = await AutomationCredentials.findOneAndUpdate(
    { userId: req.user.id, portal },
    {
      $set: {
        username,
        encryptedPassword,
        ...prefSet,
        isActive: true,
        lastLoginError: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  res.json(new ApiResponse(200, {
    portal:         creds.portal,
    username:       creds.username,
    preferences:    creds.preferences,
    capturedFields: creds.capturedFields || {},
    lastVerifiedAt: creds.lastVerifiedAt,
    isActive:       creds.isActive,
  }, 'Credentials saved'));
});

/** Get credential status (never return the encrypted password) */
export const getCredentials = asyncHandler(async (req, res) => {
  const { portal } = req.params;
  const creds = await AutomationCredentials.findOne({ userId: req.user.id, portal });

  if (!creds) {
    return res.json(new ApiResponse(200, null, 'No credentials configured'));
  }

  const sessionActive = await hasSession(req.user.id, portal);

  res.json(new ApiResponse(200, {
    portal:         creds.portal,
    username:       creds.username,
    preferences:    creds.preferences,
    capturedFields: creds.capturedFields || {},
    isActive:       creds.isActive,
    lastVerifiedAt: creds.lastVerifiedAt,
    lastLoginError: creds.lastLoginError,
    sessionActive,
  }, 'Credentials found'));
});

/** Delete stored credentials for a portal */
export const deleteCredentials = asyncHandler(async (req, res) => {
  const { portal } = req.params;
  await AutomationCredentials.deleteOne({ userId: req.user.id, portal });
  res.json(new ApiResponse(200, null, 'Credentials removed'));
});

/**
 * Test login — opens a headed Chromium window, attempts login, closes it.
 * This is intentionally slow (~10-20s) because it launches a real browser.
 */
export const testLogin = asyncHandler(async (req, res) => {
  const { portal } = req.body;
  const creds = await AutomationCredentials.findOne({ userId: req.user.id, portal, isActive: true });
  if (!creds) throw new ApiError(404, 'No credentials saved. Save them first.');

  let password;
  try {
    password = decrypt(creds.encryptedPassword);
  } catch {
    throw new ApiError(500, 'Failed to decrypt saved credentials — please re-save them');
  }

  const PORTAL_CONFIG = {
    naukri: {
      url:       'https://www.naukri.com/nlogin/login',
      emailSel:  '#usernameField',
      passSel:   '#passwordField',
      submitSel: 'button[type="submit"]',
      errorSel:  '.err-container, [class*="errorMessage"]',
      successUrl: ['myjobs', 'mynaukri', '/'],
    },
    linkedin: {
      url:       'https://www.linkedin.com/login',
      emailSel:  '#username',
      passSel:   '#password',
      submitSel: 'button[type="submit"]',
      errorSel:  '#error-for-username, .alert-content, [class*="form__label--error"]',
      successUrl: ['/feed', '/jobs', '/in/'],
    },
  };

  const cfg = PORTAL_CONFIG[portal];
  if (!cfg) throw new ApiError(400, `Unsupported portal: ${portal}`);

  const { chromium } = await import('playwright');
  let browser = null;

  try {
    browser = await chromium.launch({
      headless: false,
      slowMo: 80,
      args: ['--start-maximized', '--disable-blink-features=AutomationControlled', '--no-sandbox'],
    });
    const ctx = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      viewport: null,
      locale: 'en-US',
      timezoneId: 'Asia/Kolkata',
    });
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      window.chrome = { runtime: {} };
    });

    const page = await ctx.newPage();
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));

    await page.goto(cfg.url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await delay(1500);

    // Dismiss any popups (Naukri has them)
    try { await page.keyboard.press('Escape'); } catch {}
    await delay(500);

    const emailEl = await page.waitForSelector(cfg.emailSel, { timeout: 10_000 });
    await emailEl.click({ clickCount: 3 });
    await emailEl.type(creds.username, { delay: 90 });
    await delay(600);

    const passEl = await page.waitForSelector(cfg.passSel, { timeout: 5_000 });
    await passEl.click({ clickCount: 3 });
    await passEl.type(password, { delay: 90 });
    await delay(700);

    await page.click(cfg.submitSel);
    await page.waitForLoadState('domcontentloaded', { timeout: 20_000 }).catch(() => {});
    await delay(2500);

    const currentUrl = page.url();

    // Check for identity verification (LinkedIn CAPTCHA / checkpoint)
    if (currentUrl.includes('/checkpoint') || currentUrl.includes('verification') || currentUrl.includes('authwall')) {
      throw new Error('Portal requires identity verification — complete it in the browser window, then save credentials again.');
    }

    // Check for login error element
    const errEl = await page.$(cfg.errorSel).catch(() => null);
    if (errEl) {
      const errText = (await errEl.textContent())?.trim() || 'Login failed';
      throw new Error(errText);
    }

    // Check success URL indicators
    const loggedIn = cfg.successUrl.some((s) => currentUrl.includes(s));
    if (!loggedIn) {
      throw new Error('Login did not redirect to a recognized page — check credentials or look for a CAPTCHA in the browser.');
    }

    // Keep browser open briefly so user can see they are logged in
    await delay(3000);

    await AutomationCredentials.findByIdAndUpdate(creds._id, {
      $set: { lastVerifiedAt: new Date(), lastLoginError: null },
    });

    res.json(new ApiResponse(200, { verified: true }, 'Login successful'));
  } catch (err) {
    await AutomationCredentials.findByIdAndUpdate(creds._id, {
      $set: { lastLoginError: err.message },
    });
    throw new ApiError(400, `Login failed: ${err.message}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

// ─── Automation Runs ─────────────────────────────────────────────────────────

/**
 * Trigger a direct auto-apply run using a headed (visible) Chromium browser.
 *
 * Pattern: create the run record → respond immediately with runId → run the
 * automation in the background so the browser can open without blocking the API.
 * The frontend polls GET /automation/runs/:id for live progress.
 */
export const triggerAutoApply = asyncHandler(async (req, res) => {
  const { portal, resumeId, keywords, location, maxJobs, freshness = 0 } = req.body;
  const userId = req.user.id;

  // Verify credentials exist
  const creds = await AutomationCredentials.findOne({ userId, portal, isActive: true });
  if (!creds) {
    throw new ApiError(400, `No credentials saved for ${portal}. Add them in Automation → Step 1 first.`);
  }

  // Verify resume belongs to this user
  const resume = await Resume.findOne({ _id: resumeId, userId });
  if (!resume) throw new ApiError(404, 'Resume not found');

  // Guard: don't allow more than one running automation at a time per user
  const alreadyRunning = await AutomationRun.findOne({ userId, status: 'running' });
  if (alreadyRunning) {
    throw new ApiError(409, 'You already have an automation run in progress. Wait for it to finish or cancel it first.');
  }

  let password;
  try {
    password = decrypt(creds.encryptedPassword);
  } catch {
    throw new ApiError(500, 'Failed to decrypt credentials — please re-save them in Step 1');
  }

  // Create the run record immediately (status = running)
  const run = await AutomationRun.create({
    userId,
    portal,
    status:    'running',
    keywords,
    location:  location || '',
    maxJobs,
    freshness: freshness || 0,
    jobResults: [],
    summary:   { total: 0, applied: 0, skipped: 0, failed: 0, step: 'Starting browser…' },
    startedAt: new Date(),
  });

  // Fire-and-forget — browser opens in background, progress written to DB
  const runArgs = {
    userId,
    runId:          run._id.toString(),
    username:       creds.username,
    password,
    keywords,
    location:       location || '',
    maxJobs,
    freshness:      freshness || 0,
    prefs:          creds.preferences || {},
    capturedFields: creds.capturedFields || {},
    resumeId,
  };

  if (portal === 'linkedin') {
    runLinkedInDirectApply(runArgs).catch((err) => {
      logger.error(`[AutomationController] LinkedIn background run failed: ${err.message}`);
    });
  } else {
    runNaukriDirectApply(runArgs).catch((err) => {
      logger.error(`[AutomationController] Naukri background run failed: ${err.message}`);
    });
  }

  logger.info(`[AutomationController] Run ${run._id} started for user ${userId}`);

  // Respond immediately — frontend will poll for progress
  res.status(201).json(new ApiResponse(201, {
    runId:    run._id,
    status:   'running',
    message:  'Chromium is opening. Watch the browser window.',
  }, 'Automation started'));
});

// ─── Run history / detail ─────────────────────────────────────────────────────

export const getRunHistory = asyncHandler(async (req, res) => {
  const page  = parseInt(req.query.page,  10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

  const [runs, total] = await Promise.all([
    AutomationRun.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AutomationRun.countDocuments({ userId: req.user.id }),
  ]);

  // Auto-complete stale "running" runs older than 60 minutes
  const staleAt = new Date(Date.now() - 60 * 60 * 1000);
  const stale   = runs.filter((r) => r.status === 'running' && new Date(r.startedAt) < staleAt);
  if (stale.length) {
    await AutomationRun.updateMany(
      { _id: { $in: stale.map((r) => r._id) } },
      { $set: { status: 'completed', completedAt: new Date() } },
    );
    stale.forEach((r) => { r.status = 'completed'; });
  }

  res.json(new ApiResponse(200, {
    runs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }, 'Run history'));
});

/** Live progress endpoint — lightweight, no populate needed */
export const getRunProgress = asyncHandler(async (req, res) => {
  const run = await AutomationRun.findOne(
    { _id: req.params.id, userId: req.user.id },
    'status summary jobResults externalJobs capturedFields startedAt completedAt error',
  ).lean();

  if (!run) throw new ApiError(404, 'Run not found');
  res.json(new ApiResponse(200, run, 'Progress'));
});

export const getRunById = asyncHandler(async (req, res) => {
  const run = await AutomationRun.findOne({ _id: req.params.id, userId: req.user.id }).lean();
  if (!run) throw new ApiError(404, 'Run not found');
  res.json(new ApiResponse(200, run, 'Run details'));
});

export const cancelRun = asyncHandler(async (req, res) => {
  const run = await AutomationRun.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id, status: 'running' },
    { $set: { status: 'cancelled', completedAt: new Date(), 'summary.step': 'Cancelled by user' } },
    { new: true },
  );
  if (!run) throw new ApiError(404, 'Run not found or already completed');
  res.json(new ApiResponse(200, { status: run.status }, 'Run cancelled'));
});
