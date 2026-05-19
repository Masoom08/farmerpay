/**
 * AA Webhook Verifier
 * HMAC-SHA256 signature verification and deduplication for AA provider webhooks.
 */

const crypto = require('crypto');
const logger = require('../../../shared/utils/logger');
const { getKey, setWithTTL } = require('../../../config/redis');
const { aaConfig } = require('../../../integrations/accountAggregator');

const DEDUP_TTL = 86400; // 24h

const PROVIDER_SECRETS = {
  setu: { header: 'x-setu-signature', envKey: 'AA_SETU_WEBHOOK_SECRET' },
  finvu: { header: 'x-finvu-signature', envKey: 'AA_FINVU_WEBHOOK_SECRET' },
};

/**
 * Verify webhook authenticity using HMAC-SHA256 and check for deduplication.
 * @param {string} provider - 'setu' or 'finvu'
 * @param {Object} headers - HTTP request headers (lowercase keys)
 * @param {Object} body - Raw webhook body
 * @returns {{ valid: boolean, reason?: string }}
 */
const FRESHNESS_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

const verifyWebhook = async (provider, headers, body) => {
  // Step 0: Freshness check — reject replayed webhooks whose timestamp is
  // stale. Dedup is the first line of defence; freshness catches replays
  // outside the dedup TTL. When the provider omits a timestamp we log
  // once and fall through to dedup + HMAC — strict-timestamp enforcement
  // is opt-in via AA_STRICT_TIMESTAMP=true so legacy fixtures and early
  // provider integrations aren't broken.
  const tsRaw = body.timestamp || body.ts || body.eventTime || headers['x-event-timestamp'];
  if (tsRaw) {
    const tsMs = typeof tsRaw === 'number' ? tsRaw : Date.parse(tsRaw);
    if (!Number.isFinite(tsMs) || Math.abs(Date.now() - tsMs) > FRESHNESS_WINDOW_MS) {
      logger.warn(`[AAWebhook] Stale/future webhook ts=${tsRaw} for ${provider}`);
      return { valid: false, reason: 'stale_timestamp' };
    }
  } else if (process.env.AA_STRICT_TIMESTAMP === 'true') {
    logger.warn(`[AAWebhook] Webhook missing timestamp header/body for ${provider}`);
    return { valid: false, reason: 'missing_timestamp' };
  }

  // Step 1: Deduplication check
  const eventId = body.eventId || body.event_id || body.id || body.consentHandle;
  if (eventId) {
    const dedupKey = `aa:webhook:dedup:${eventId}`;
    const existing = await getKey(dedupKey);
    if (existing) {
      logger.warn(`[AAWebhook] Duplicate webhook detected: ${eventId}`);
      return { valid: false, reason: 'duplicate_event' };
    }
    // Mark as seen
    await setWithTTL(dedupKey, '1', DEDUP_TTL);
  }

  // Step 2: HMAC verification — always run in non-dev. The AA_ENABLED flag
  // previously turned off HMAC entirely, which meant a production cluster
  // mis-configured with AA_ENABLED=false would silently accept forged
  // webhooks. HMAC verification now runs whenever a secret is configured.
  if (!aaConfig.enabled && process.env.NODE_ENV !== 'production') {
    logger.info(`[AAWebhook] AA_ENABLED=false (dev) — skipping HMAC verification for ${provider}`);
    return { valid: true };
  }

  const providerConfig = PROVIDER_SECRETS[provider];
  if (!providerConfig) {
    return { valid: false, reason: `unsupported_provider: ${provider}` };
  }

  const secret = process.env[providerConfig.envKey];
  if (!secret) {
    logger.error(`[AAWebhook] Missing ${providerConfig.envKey} env variable`);
    return { valid: false, reason: 'missing_webhook_secret' };
  }

  const signature = headers[providerConfig.header];
  if (!signature) {
    return { valid: false, reason: `missing_header: ${providerConfig.header}` };
  }

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');

  if (signature !== expectedSig) {
    logger.warn(`[AAWebhook] HMAC mismatch for ${provider}. Expected: ${expectedSig.slice(0, 8)}..., Got: ${signature.slice(0, 8)}...`);
    return { valid: false, reason: 'hmac_mismatch' };
  }

  return { valid: true };
};

module.exports = { verifyWebhook };
