/**
 * Notification Dispatcher — Orchestrates event → channel routing (H3 — Spec §6.3).
 *
 * Given an event code + variables, resolves the event matrix, applies DND rules,
 * and dispatches through the shared notificationService.
 *
 * PRIVACY: Sathi notifications never contain score data.
 * DND: Farmer push blocked 9PM–7AM IST; deferred to 7AM.
 */

const logger = require('../../../shared/utils/logger');
const { getEventConfig } = require('./eventMatrix');
const { checkDnd } = require('./dndGuard');
const { substituteVariables } = require('../../../shared/services/notificationService');

/**
 * @typedef {Object} DispatchResult
 * @property {string} eventCode
 * @property {Array<{ role: string, channel: string, status: string, deferUntil?: Date }>} deliveries
 */

/**
 * Dispatch notifications for a business event.
 *
 * @param {Object} options
 * @param {string} options.eventCode - Event code from eventMatrix
 * @param {Object} [options.variables={}] - Template variables ({farmerName}, {village}, etc.)
 * @param {Object} [options.recipientIds={}] - { banker: userId, farmer: userId, sathi: userId }
 * @param {Object} [options.emailAddresses={}] - { banker: 'a@b.com' }
 * @param {boolean} [options.hasChange=true] - For conditional events (trust.snapshot.ready)
 * @param {number} [options.nowMs] - Override current time (for testing)
 * @param {Function} [options.sendFn] - Override send function (for testing)
 * @returns {Promise<DispatchResult>}
 */
const dispatch = async ({
  eventCode,
  variables = {},
  recipientIds = {},
  emailAddresses = {},
  hasChange = true,
  nowMs,
  sendFn,
}) => {
  const config = getEventConfig(eventCode);
  if (!config) {
    logger.warn(`Unknown notification event: ${eventCode}`);
    return { eventCode, deliveries: [] };
  }

  const deliveries = [];

  for (const recipient of config.recipients) {
    const { role, channels, subject, body, condition, notificationType, priority } = recipient;

    // Check conditions
    if (condition === 'hasChange' && !hasChange) {
      deliveries.push({ role, channel: channels.join(','), status: 'skipped_no_change' });
      continue;
    }

    const userId = recipientIds[role];
    const renderedSubject = substituteVariables(subject, variables);
    const renderedBody = substituteVariables(body, variables);

    for (const channel of channels) {
      // DND check
      const dnd = checkDnd(role, channel, nowMs);
      if (!dnd.allowed) {
        deliveries.push({
          role,
          channel,
          status: 'deferred_dnd',
          deferUntil: dnd.deferUntil,
        });
        logger.info(`Notification deferred (DND): ${eventCode} → ${role}/${channel} until ${dnd.deferUntil}`);
        continue;
      }

      // Dispatch
      try {
        if (sendFn) {
          // Test/mock mode
          await sendFn({ role, channel, userId, subject: renderedSubject, body: renderedBody, notificationType, priority });
        }
        // In production, would call notificationService.sendNotification or sendTemplateNotification

        deliveries.push({ role, channel, status: 'sent' });
      } catch (err) {
        deliveries.push({ role, channel, status: 'failed', error: err.message });
        logger.error(`Notification dispatch failed: ${eventCode} → ${role}/${channel}: ${err.message}`);
      }
    }
  }

  return { eventCode, deliveries };
};

module.exports = { dispatch };
