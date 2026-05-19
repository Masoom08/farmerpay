/**
 * Audit Logger — TRUST v2
 * Writes immutable rows to trust_audit_events.
 */

const { generateUUID } = require('../../../shared/utils/uuidHelper');
const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

/**
 * Logs an audit event.
 * @param {Object} params
 * @param {number} params.farmerId
 * @param {'BANKER'|'SATHI'|'SYSTEM'|'FARMER'} params.actorType
 * @param {number|null} params.actorId
 * @param {string} params.action - e.g. 'SNAPSHOT_CREATED', 'DECISION_RECORDED'
 * @param {Object|null} [params.payload]
 * @param {number|null} [params.scoreHistoryId]
 * @param {Object} [params.transaction] - Sequelize transaction
 * @returns {Promise<Object>} Created audit event
 */
const logEvent = async ({ farmerId, actorType, actorId, action, payload, scoreHistoryId, transaction }) => {
  const { TrustAuditEvent } = getDb();

  const event = await TrustAuditEvent.create({
    event_uuid: generateUUID(),
    farmer_id: farmerId,
    actor_type: actorType,
    actor_id: actorId || null,
    action,
    payload: payload || null,
    score_history_id: scoreHistoryId || null,
  }, { transaction });

  logger.info(`[TRUST/audit] ${action} for farmer ${farmerId} by ${actorType}${actorId ? `:${actorId}` : ''}`);

  return event;
};

module.exports = { logEvent };
