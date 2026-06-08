import redis from '../../config/redis.js';
import logger from '../../utils/logger.js';

// Session TTL: 6 hours — portals don't keep login alive indefinitely
const SESSION_TTL = 6 * 60 * 60;

const key = (userId, portal) => `session:${userId}:${portal}`;

/**
 * Persist a browser context's cookies to Redis so the same user
 * doesn't need to log in on every scrape run.
 */
export const saveSession = async (ctx, userId, portal) => {
  try {
    const cookies = await ctx.cookies();
    const storage = await ctx.storageState();
    await redis.set(
      key(userId, portal),
      JSON.stringify({ cookies, storage }),
      'EX',
      SESSION_TTL,
    );
    logger.debug(`Session saved: ${portal} for user ${userId}`);
  } catch (err) {
    logger.warn(`Failed to save session for ${portal}/${userId}: ${err.message}`);
  }
};

/**
 * Restore cookies into a browser context from Redis.
 * Returns true if a valid session was found, false otherwise.
 */
export const loadSession = async (ctx, userId, portal) => {
  try {
    const raw = await redis.get(key(userId, portal));
    if (!raw) return false;
    const { cookies, storage } = JSON.parse(raw);
    if (cookies?.length) await ctx.addCookies(cookies);
    // Restore localStorage/sessionStorage if captured
    if (storage?.origins?.length) {
      for (const origin of storage.origins) {
        const page = await ctx.newPage();
        try {
          await page.goto(origin.origin, { waitUntil: 'commit', timeout: 5000 });
          for (const { name, value } of origin.localStorage ?? []) {
            await page.evaluate(
              ([k, v]) => localStorage.setItem(k, v),
              [name, value],
            );
          }
        } catch {}
        await page.close();
      }
    }
    logger.debug(`Session loaded: ${portal} for user ${userId}`);
    return true;
  } catch (err) {
    logger.warn(`Failed to load session for ${portal}/${userId}: ${err.message}`);
    return false;
  }
};

/**
 * Delete a stored session (e.g. after logout or auth failure).
 */
export const clearSession = async (userId, portal) => {
  try {
    await redis.del(key(userId, portal));
    logger.debug(`Session cleared: ${portal} for user ${userId}`);
  } catch (err) {
    logger.warn(`Failed to clear session for ${portal}/${userId}: ${err.message}`);
  }
};

/**
 * Check if a valid session exists without loading it.
 */
export const hasSession = async (userId, portal) => {
  const ttl = await redis.ttl(key(userId, portal));
  return ttl > 0;
};
