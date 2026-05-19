/**
 * AA Rate Limiter
 * Per-farmer fetch cooldown (1h) and daily limit (5/day) using Redis.
 */

const logger = require('../../../shared/utils/logger');
const { getRedisClient } = require('../../../config/redis');

const COOLDOWN_TTL = 3600;  // 1 hour default
const DAILY_LIMIT = 5;
const DAILY_TTL = 86400;    // 24h (auto-expires at end of day window)

/**
 * Check if a farmer is allowed to initiate a data fetch.
 * @param {number} farmerId
 * @returns {{ allowed: boolean, retryAfterSeconds?: number, reason?: string }}
 */
const canFetch = async (farmerId) => {
  const client = getRedisClient();

  // Check cooldown
  const cooldownKey = `aa:fetch:cooldown:${farmerId}`;
  const ttl = await client.ttl(cooldownKey);
  if (ttl > 0) {
    logger.info(`[AARateLimit] Farmer ${farmerId} in cooldown — ${ttl}s remaining`);
    return { allowed: false, retryAfterSeconds: ttl, reason: 'cooldown_active' };
  }

  // Check daily limit
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const dailyKey = `aa:fetch:daily:${farmerId}:${today}`;
  const dailyCount = parseInt(await client.get(dailyKey) || '0', 10);
  if (dailyCount >= DAILY_LIMIT) {
    logger.info(`[AARateLimit] Farmer ${farmerId} hit daily limit (${dailyCount}/${DAILY_LIMIT})`);
    return { allowed: false, retryAfterSeconds: null, reason: 'daily_limit_exceeded' };
  }

  return { allowed: true };
};

/**
 * Record a successful fetch — sets cooldown and increments daily counter.
 * @param {number} farmerId
 * @param {string} [provider] - 'setu'|'finvu' for provider-level spend tracking
 */
const recordFetch = async (farmerId, provider = 'unknown') => {
  const client = getRedisClient();

  // Set cooldown (per-farmer, NOT per-consent — so opening multiple
  // consents in parallel cannot bypass the 1h spacing between fetches).
  const cooldownKey = `aa:fetch:cooldown:${farmerId}`;
  await client.setex(cooldownKey, COOLDOWN_TTL, '1');

  // Increment daily counter
  const today = new Date().toISOString().slice(0, 10);
  const dailyKey = `aa:fetch:daily:${farmerId}:${today}`;
  const newCount = await client.incr(dailyKey);
  if (newCount === 1) {
    await client.expire(dailyKey, DAILY_TTL);
  }

  // Provider-level spend counter — feeds cost dashboards and triggers
  // alarms if an upstream bug spins fetches way above baseline.
  const providerKey = `aa:fetch:provider:${provider}:${today}`;
  const providerCount = await client.incr(providerKey);
  if (providerCount === 1) {
    await client.expire(providerKey, DAILY_TTL);
  }

  logger.info('aa.fetch_recorded', {
    event: 'aa.fetch_recorded',
    farmerId, provider, dailyCount: newCount, providerDailyCount: providerCount,
  });
};

module.exports = { canFetch, recordFetch };
