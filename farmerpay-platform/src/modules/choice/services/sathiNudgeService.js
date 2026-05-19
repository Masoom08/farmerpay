/**
 * Sathi Nudge Service
 *
 * Schedule, dispatch, and correlate nudges. Dispatch is a stub in v1 —
 * an enqueue record is written to SathiNudge with status='sent' (a real
 * SMS/WA/push gateway can be wired in later). correlateAction() is how
 * the "repaid via nudge" dashboard KPI is attributed: when a repayment
 * or renewal event fires, we look back for the most recent matching
 * nudge and stamp linked_action_taken_at on it.
 */

const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

const scheduleNudge = async ({
  intermediaryId,
  farmerId,
  nudgeType,
  channel,
  payload = {},
  scheduledFor = null,
}) => {
  const { SathiNudge } = getDb();
  const row = await SathiNudge.create({
    intermediary_id: intermediaryId,
    farmer_id: farmerId,
    nudge_type: nudgeType,
    channel,
    payload_json: payload,
    scheduled_for: scheduledFor,
    status: 'scheduled',
  });
  return row;
};

/**
 * "Send" a single nudge. In v1 this just stamps sent_at and flips
 * status — real dispatch is a follow-up.
 */
const dispatchNudge = async (nudgeId) => {
  const { SathiNudge } = getDb();
  const row = await SathiNudge.findByPk(nudgeId);
  if (!row) return null;
  await row.update({
    sent_at: new Date(),
    status: 'sent',
  });
  return row;
};

/**
 * Dispatch all due nudges (scheduled_for <= now). Nightly/hourly job.
 */
const dispatchDueNudges = async () => {
  const { SathiNudge, Sequelize } = getDb();
  const due = await SathiNudge.findAll({
    where: {
      status: 'scheduled',
      scheduled_for: { [Sequelize.Op.lte]: new Date() },
    },
  });
  for (const n of due) await dispatchNudge(n.id);
  return due.length;
};

/**
 * Correlate an action (repayment, renewal, etc.) back to the most-recent
 * matching nudge for that farmer within a look-back window. Stamps
 * linked_action_taken_at so the dashboard can attribute the action.
 */
const correlateAction = async ({
  farmerId,
  nudgeType,
  actionRefId = null,
  lookbackHours = 72,
}) => {
  const { SathiNudge, Sequelize } = getDb();
  const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

  const nudge = await SathiNudge.findOne({
    where: {
      farmer_id: farmerId,
      nudge_type: nudgeType,
      sent_at: { [Sequelize.Op.gte]: since },
      linked_action_taken_at: null,
    },
    order: [['sent_at', 'DESC']],
  });

  if (!nudge) return null;
  await nudge.update({
    linked_action_taken_at: new Date(),
    linked_action_ref_id: actionRefId,
    status: 'acknowledged',
  });
  logger.info(`[sathi-nudge] Correlated ${nudgeType} for farmer ${farmerId} -> nudge ${nudge.id}`);
  return nudge;
};

const listForIntermediary = async (intermediaryId, { limit = 100 } = {}) => {
  const { SathiNudge } = getDb();
  return SathiNudge.findAll({
    where: { intermediary_id: intermediaryId },
    order: [['created_at', 'DESC']],
    limit,
  });
};

module.exports = {
  scheduleNudge,
  dispatchNudge,
  dispatchDueNudges,
  correlateAction,
  listForIntermediary,
};
