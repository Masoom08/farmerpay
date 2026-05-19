/**
 * AA Audit Logger
 * Fire-and-forget immutable logging of consent lifecycle events for RBI compliance.
 */

const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

/**
 * Log a consent lifecycle event. Fire-and-forget — never throws to caller.
 * @param {Object} params
 * @param {number} params.consentId - FK to aa_consents
 * @param {number} params.farmerId - FK to users
 * @param {string} params.eventType - One of the event_type ENUM values
 * @param {string} params.eventSource - One of: farmer, system, webhook, admin, scheduler
 * @param {string} [params.provider] - AA provider name
 * @param {Object} [params.metadata] - Event-specific details (JSON)
 * @param {string} [params.ipAddress] - Client IP for consent requests
 */
const logEvent = async ({ consentId, farmerId, eventType, eventSource, provider, metadata, ipAddress }) => {
  try {
    const { AaConsentAuditLog } = getDb();

    await AaConsentAuditLog.create({
      consent_id: consentId,
      farmer_id: farmerId,
      event_type: eventType,
      event_source: eventSource,
      provider: provider || null,
      metadata: metadata || null,
      ip_address: ipAddress || null,
    });

    logger.info(`[AAAudit] ${eventType} | consent=${consentId} farmer=${farmerId} source=${eventSource}`);
  } catch (err) {
    // Fire-and-forget: log error but never propagate
    logger.error(`[AAAudit] Failed to log event: ${err.message}`, {
      consentId, farmerId, eventType, eventSource,
    });
  }
};

/**
 * Read the consent audit trail for a single farmer. This is the ONLY
 * supported read path — it hardcodes farmer_id filtering so a future API
 * endpoint cannot accidentally leak one farmer's audit log to another.
 * Callers must resolve farmerId from req.user, not from client input.
 */
const readForFarmer = async (farmerId, { limit = 100, offset = 0 } = {}) => {
  const { AaConsentAuditLog } = getDb();
  return AaConsentAuditLog.findAll({
    where: { farmer_id: farmerId },
    order: [['created_at', 'DESC']],
    limit: Math.min(limit, 500),
    offset,
  });
};

/**
 * Mask a transaction narration for log output. Narrations contain
 * merchant names, VPA handles, and reference numbers that identify
 * counterparties — RBI AA guidelines require masking in audit pipelines.
 * Returns the first 20 chars + a SHA-256 prefix as a stable correlation
 * key, so log searchers can still group identical narrations without
 * seeing their contents.
 */
const maskNarration = (narration) => {
  if (!narration) return narration;
  const s = String(narration);
  const head = s.slice(0, 20);
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(s).digest('hex').slice(0, 8);
  return `${head}…[${hash}]`;
};

module.exports = { logEvent, readForFarmer, maskNarration };
