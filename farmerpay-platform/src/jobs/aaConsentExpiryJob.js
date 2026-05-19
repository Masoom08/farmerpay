/**
 * AA Consent Expiry Job
 * Finds approved consents past their expires_at date and marks them expired.
 * Runs daily at 6:00 AM (server local time).
 */

const cron = require('node-cron');
const logger = require('../shared/utils/logger');

let task = null;

const start = () => {
  if (task) return task;

  // Daily at 06:03 — offset to avoid minute-0 collisions
  task = cron.schedule('3 6 * * *', async () => {
    try {
      const result = await expireConsents();
      logger.info(`[aaConsentExpiryJob] expired ${result.expiredCount} consents`);
    } catch (err) {
      logger.error(`[aaConsentExpiryJob] failed: ${err.message}`, { stack: err.stack });
    }
  });

  logger.info('[aaConsentExpiryJob] scheduled (3 6 * * *)');
  return task;
};

const stop = () => {
  if (task) {
    task.stop();
    task = null;
  }
};

const expireConsents = async () => {
  const db = require('../shared/models');
  const { Op } = require('sequelize');
  const { logEvent } = require('../modules/aa/services/aaAuditLogger');

  const now = new Date();

  // Find all approved consents that have passed their expiry date
  const expiredConsents = await db.AaConsent.findAll({
    where: {
      consent_status: 'approved',
      is_active: true,
      expires_at: { [Op.lt]: now },
    },
  });

  let expiredCount = 0;

  for (const consent of expiredConsents) {
    try {
      await consent.update({ consent_status: 'expired', is_active: false });

      // Audit log for each expired consent
      logEvent({
        consentId: consent.id,
        farmerId: consent.farmer_id,
        eventType: 'consent_expired',
        eventSource: 'scheduler',
        provider: consent.aa_provider,
        metadata: { expiresAt: consent.expires_at, expiredBy: 'aaConsentExpiryJob' },
      });

      // TODO: Trigger notification to farmer via Sathi module
      // e.g., sathiNotificationService.notifyConsentExpiry(consent.farmer_id, consent.consent_uuid)

      expiredCount++;
    } catch (err) {
      logger.error(`[aaConsentExpiryJob] Failed to expire consent ${consent.id}: ${err.message}`);
    }
  }

  // Invalidate Redis cache for affected farmers
  if (expiredConsents.length > 0) {
    const { deleteKeys } = require('../config/redis');
    for (const consent of expiredConsents) {
      await deleteKeys(`aa:consent:${consent.farmer_id}`).catch(() => {});
    }
  }

  return { expiredCount, checkedAt: now };
};

const runNow = () => expireConsents();

module.exports = { start, stop, runNow };
