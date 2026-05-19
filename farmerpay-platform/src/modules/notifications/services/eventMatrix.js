/**
 * Event Matrix — Notification routing rules (H3 — Spec §6.3).
 *
 * Maps business events to (role, channel, message) tuples.
 * This is the single source of truth for "who gets notified, how, and what they see."
 *
 * PRIVACY (§5.6): Sathi messages NEVER reference score.
 *
 * Events:
 *   trust.score.dropped.50      → banker: email + in_app (bell)
 *   cibil.flag.raised           → banker: email + in_app (bell)
 *   trust.snapshot.ready        → farmer: push (if change)
 *   sathi.task.assigned         → sathi: push
 *   sathi.visit.cancelled       → sathi: push + farmer: push
 */

const EVENTS = {
  'trust.score.dropped.50': {
    description: 'TRUST score dropped by ≥50 points',
    recipients: [
      {
        role: 'banker',
        channels: ['email', 'in_app'],
        subject: 'TRUST score alert: {farmerName}',
        body: 'TRUST score for {farmerName} has dropped significantly. Please review the account.',
        priority: 'high',
        notificationType: 'alert',
      },
    ],
  },

  'cibil.flag.raised': {
    description: 'CIBIL adverse flag detected',
    recipients: [
      {
        role: 'banker',
        channels: ['email', 'in_app'],
        subject: 'CIBIL flag: {farmerName}',
        body: 'A CIBIL adverse flag has been raised for {farmerName}. Immediate review recommended.',
        priority: 'high',
        notificationType: 'alert',
      },
    ],
  },

  'trust.snapshot.ready': {
    description: 'New TRUST snapshot computed with changes',
    recipients: [
      {
        role: 'farmer',
        channels: ['push'],
        subject: 'Your profile has been updated',
        // NEVER mention score value in farmer notification
        body: 'Your profile information has been updated. Open the app to see the latest.',
        priority: 'normal',
        notificationType: 'info',
        /** Only send if there was an actual change */
        condition: 'hasChange',
      },
    ],
  },

  'sathi.task.assigned': {
    description: 'New task assigned to Sathi',
    recipients: [
      {
        role: 'sathi',
        channels: ['push'],
        subject: 'New task assigned',
        // NEVER reference score in Sathi notification (§5.6)
        body: 'You have a new task for {farmerName} in {village}. Due: {dueDate}.',
        priority: 'normal',
        notificationType: 'info',
      },
    ],
  },

  'sathi.visit.cancelled': {
    description: 'Scheduled Sathi visit has been cancelled',
    recipients: [
      {
        role: 'sathi',
        channels: ['push'],
        subject: 'Visit cancelled',
        body: 'The visit to {farmerName} in {village} has been cancelled.',
        priority: 'normal',
        notificationType: 'info',
      },
      {
        role: 'farmer',
        channels: ['push'],
        subject: 'Visit update',
        body: 'Your scheduled visit has been cancelled. You can book a new one in the app.',
        priority: 'normal',
        notificationType: 'info',
      },
    ],
  },
};

/**
 * List of all known event codes.
 * @type {string[]}
 */
const EVENT_CODES = Object.keys(EVENTS);

/**
 * Get the routing config for an event.
 * @param {string} eventCode - Event code (e.g., 'trust.score.dropped.50')
 * @returns {Object|null} Event config or null if unknown.
 */
const getEventConfig = (eventCode) => {
  return EVENTS[eventCode] || null;
};

/**
 * Validate that no Sathi message references score-adjacent terms.
 * Used in tests and CI to enforce §5.6.
 * @returns {{ valid: boolean, violations: string[] }}
 */
const validateSathiPrivacy = () => {
  const violations = [];
  const forbidden = ['score', 'trust score', 'point', 'band', 'pillar'];

  for (const [eventCode, config] of Object.entries(EVENTS)) {
    for (const recipient of config.recipients) {
      if (recipient.role === 'sathi') {
        const text = (recipient.subject + ' ' + recipient.body).toLowerCase();
        for (const term of forbidden) {
          if (text.includes(term)) {
            violations.push(`Event "${eventCode}" Sathi message contains "${term}"`);
          }
        }
      }
    }
  }

  return { valid: violations.length === 0, violations };
};

module.exports = { EVENTS, EVENT_CODES, getEventConfig, validateSathiPrivacy };
