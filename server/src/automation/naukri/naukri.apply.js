import logger from '../../utils/logger.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Selectors for the job detail page
const APPLY_BTN_SELECTORS = [
  'button[class*="apply-button"]',
  'a[class*="apply-button"]',
  '.apply-button',
  'button:has-text("Apply")',
  'a:has-text("Apply Now")',
  '[class*="btn-apply"]',
];

// Selectors for the apply chatbot/modal Naukri uses post-2023
const CHATBOT_SELECTORS = {
  container:      '.chatbot_DrawerRoot, .chatbot-drawer, [class*="chatbot"]',
  nextBtn:        'button:has-text("Next"), [class*="next-btn"]',
  submitBtn:      'button:has-text("Submit"), button:has-text("Apply"), [class*="submit-btn"]',
  noticePeriod:   '[placeholder*="notice"], [name*="notice"], select[id*="notice"]',
  currentCtc:     '[placeholder*="current"], [name*="currentCtc"], [id*="currentCtc"]',
  expectedCtc:    '[placeholder*="expected"], [name*="expectedCtc"], [id*="expectedCtc"]',
  successMsg:     '[class*="success"], [class*="applied"], h2:has-text("Applied"), .apply-success',
  externalLink:   'a[target="_blank"][href*="apply"], [class*="external-apply"]',
  alreadyApplied: '[class*="already-applied"], button:has-text("Applied")',
};

const APPLY_RESULT = Object.freeze({
  APPLIED:         'applied',
  ALREADY_APPLIED: 'already_applied',
  EXTERNAL:        'external',
  FAILED:          'failed',
});

/**
 * Attempt to apply to a single Naukri job.
 *
 * @param {Page}   page        - Playwright page (already logged-in context)
 * @param {string} applyUrl    - Job's Naukri URL
 * @param {object} prefs       - User preferences: { noticePeriodDays, currentCtcLakhs, expectedCtcLakhs }
 * @returns {{ result: string, message: string }}
 */
export const applyToNaukriJob = async (page, applyUrl, prefs = {}) => {
  const { noticePeriodDays = 30, currentCtcLakhs = 0, expectedCtcLakhs = 0 } = prefs;

  try {
    logger.debug(`[NaukriApply] Navigating to ${applyUrl}`);
    await page.goto(applyUrl, { waitUntil: 'domcontentloaded', timeout: 25_000 });
    await delay(jitter(1500, 2500));

    // Check if already applied
    const alreadyApplied = await page.$(CHATBOT_SELECTORS.alreadyApplied);
    if (alreadyApplied) {
      logger.info(`[NaukriApply] Already applied — ${applyUrl}`);
      return { result: APPLY_RESULT.ALREADY_APPLIED, message: 'Already applied to this job' };
    }

    // Find and click the Apply button
    let applyBtn = null;
    for (const sel of APPLY_BTN_SELECTORS) {
      applyBtn = await page.$(sel);
      if (applyBtn) break;
    }

    if (!applyBtn) {
      // Check for external apply
      const extLink = await page.$(CHATBOT_SELECTORS.externalLink);
      if (extLink) {
        return { result: APPLY_RESULT.EXTERNAL, message: 'External company application — cannot auto-fill' };
      }
      return { result: APPLY_RESULT.FAILED, message: 'Apply button not found on page' };
    }

    // Check if button text says "Applied" (already done)
    const btnText = (await applyBtn.textContent())?.toLowerCase() || '';
    if (btnText.includes('applied')) {
      return { result: APPLY_RESULT.ALREADY_APPLIED, message: 'Job already applied' };
    }

    await applyBtn.click();
    logger.debug('[NaukriApply] Apply button clicked');
    await delay(jitter(1500, 2500));

    // Handle the Naukri chatbot / apply modal
    const chatbotResult = await handleApplyFlow(page, {
      noticePeriodDays,
      currentCtcLakhs,
      expectedCtcLakhs,
    });

    return chatbotResult;

  } catch (err) {
    logger.error(`[NaukriApply] Error applying to ${applyUrl}: ${err.message}`);
    return { result: APPLY_RESULT.FAILED, message: err.message };
  }
};

/**
 * Handle the multi-step apply flow (chatbot, modal, or quick-apply).
 * Naukri's apply UI has changed multiple times; this handles the main variants.
 */
async function handleApplyFlow(page, { noticePeriodDays, currentCtcLakhs, expectedCtcLakhs }) {
  // Wait briefly for any modal/chatbot to appear
  await delay(jitter(1000, 2000));

  // Variant 1: Quick apply (profile already selected — just confirm)
  const quickSubmit = await page.$(CHATBOT_SELECTORS.submitBtn);
  if (quickSubmit) {
    const submitText = (await quickSubmit.textContent())?.toLowerCase() || '';
    // Fill any visible fields before submitting
    await fillVisibleFields(page, { noticePeriodDays, currentCtcLakhs, expectedCtcLakhs });
    await delay(jitter(500, 1000));

    if (submitText.includes('apply') || submitText.includes('submit')) {
      await quickSubmit.click();
      await delay(jitter(2000, 3000));
      return checkApplySuccess(page);
    }
  }

  // Variant 2: Multi-step chatbot
  const chatbot = await page.$(CHATBOT_SELECTORS.container);
  if (chatbot) {
    return navigateChatbot(page, { noticePeriodDays, currentCtcLakhs, expectedCtcLakhs });
  }

  // Variant 3: New page / redirect after apply click
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await delay(jitter(1000, 2000));
  return checkApplySuccess(page);
}

/**
 * Navigate through Naukri's chatbot-style multi-step apply.
 * Up to 8 steps; clicks Next each time after filling any inputs it encounters.
 */
async function navigateChatbot(page, prefs) {
  const MAX_STEPS = 8;
  for (let step = 0; step < MAX_STEPS; step++) {
    await delay(jitter(800, 1500));

    // Fill any fields visible in this step
    await fillVisibleFields(page, prefs);
    await delay(jitter(400, 800));

    // Look for submit button first
    const submitBtn = await page.$('button:has-text("Submit"), button:has-text("Apply Now")');
    if (submitBtn) {
      await submitBtn.click();
      await delay(jitter(2000, 3000));
      return checkApplySuccess(page);
    }

    // Look for Next button
    const nextBtn = await page.$('button:has-text("Next"), [class*="next-btn"]');
    if (nextBtn) {
      await nextBtn.click();
      continue;
    }

    // No more buttons — check if we're done
    break;
  }

  return checkApplySuccess(page);
}

/**
 * Fill common fields visible on the current step.
 */
async function fillVisibleFields(page, { noticePeriodDays, currentCtcLakhs, expectedCtcLakhs }) {
  // Notice period
  const noticeEl = await page.$(CHATBOT_SELECTORS.noticePeriod);
  if (noticeEl) {
    const tag = await noticeEl.evaluate((el) => el.tagName.toLowerCase());
    if (tag === 'select') {
      // Try to select the closest matching option
      const options = await noticeEl.$$eval('option', (opts) => opts.map((o) => ({ v: o.value, t: o.text })));
      const target = options.find((o) =>
        o.t.includes(String(noticePeriodDays)) || o.v.includes(String(noticePeriodDays)),
      );
      if (target) await noticeEl.selectOption(target.v);
    } else {
      await noticeEl.fill(String(noticePeriodDays));
    }
  }

  // Current CTC
  const currCtcEl = await page.$(CHATBOT_SELECTORS.currentCtc);
  if (currCtcEl && currentCtcLakhs > 0) {
    await currCtcEl.fill(String(currentCtcLakhs));
  }

  // Expected CTC
  const expCtcEl = await page.$(CHATBOT_SELECTORS.expectedCtc);
  if (expCtcEl && expectedCtcLakhs > 0) {
    await expCtcEl.fill(String(expectedCtcLakhs));
  }
}

/**
 * Check if the page indicates a successful application.
 */
async function checkApplySuccess(page) {
  // Check for explicit success indicators
  const successEl = await page.$(CHATBOT_SELECTORS.successMsg);
  if (successEl) {
    const text = (await successEl.textContent())?.trim() || 'Applied';
    logger.info(`[NaukriApply] Success indicator found: "${text}"`);
    return { result: APPLY_RESULT.APPLIED, message: text };
  }

  // Check URL for success signals
  const url = page.url();
  if (url.includes('applied') || url.includes('success') || url.includes('myapps')) {
    return { result: APPLY_RESULT.APPLIED, message: 'Redirected to applied/success page' };
  }

  // Check for "already applied" appearing after submission
  const alreadyEl = await page.$(CHATBOT_SELECTORS.alreadyApplied);
  if (alreadyEl) {
    return { result: APPLY_RESULT.ALREADY_APPLIED, message: 'Application already exists' };
  }

  // Ambiguous — treat as applied since we completed the flow
  logger.warn('[NaukriApply] No explicit success signal — treating as applied');
  return { result: APPLY_RESULT.APPLIED, message: 'Application flow completed' };
}

export { APPLY_RESULT };
