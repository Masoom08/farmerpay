/**
 * Sathi Issue Service
 *
 * Raise, list, acknowledge, and resolve flags that a Sathi escalates to
 * a banker. Used by both the Sathi-facing "Flag issue" button and the
 * banker inbox aggregation.
 */

const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

const raiseIssue = async ({ intermediaryId, farmerId, body }) => {
  const { SathiIssueFlag } = getDb();
  const row = await SathiIssueFlag.create({
    intermediary_id: intermediaryId,
    farmer_id: farmerId,
    loan_application_id: body.loanApplicationId || null,
    issue_type: body.issueType,
    severity: body.severity || 'medium',
    description: body.description,
    status: 'open',
    opened_at: new Date(),
  });
  logger.info(
    `[sathi-issue] Intermediary ${intermediaryId} raised ${body.issueType} (${body.severity || 'medium'}) for farmer ${farmerId}`
  );
  return row;
};

const listForIntermediary = async (intermediaryId, { status = null } = {}) => {
  const { SathiIssueFlag } = getDb();
  const where = { intermediary_id: intermediaryId };
  if (status) where.status = status;
  return SathiIssueFlag.findAll({ where, order: [['opened_at', 'DESC']] });
};

const listForBanker = async ({ bankerId = null, status = 'open' } = {}) => {
  const { SathiIssueFlag } = getDb();
  const where = { status };
  if (bankerId) where.assigned_banker_id = bankerId;
  return SathiIssueFlag.findAll({ where, order: [['severity', 'DESC'], ['opened_at', 'DESC']] });
};

const updateStatus = async (issueId, { status, resolutionNotes = null, bankerId = null }) => {
  const { SathiIssueFlag } = getDb();
  const row = await SathiIssueFlag.findByPk(issueId);
  if (!row) {
    const err = new Error('Issue not found');
    err.statusCode = 404;
    throw err;
  }
  const patch = { status };
  if (resolutionNotes) patch.resolution_notes = resolutionNotes;
  if (bankerId) patch.assigned_banker_id = bankerId;
  if (status === 'acknowledged' && !row.acknowledged_at) patch.acknowledged_at = new Date();
  if ((status === 'resolved' || status === 'dismissed') && !row.resolved_at) {
    patch.resolved_at = new Date();
  }
  await row.update(patch);
  return row;
};

module.exports = { raiseIssue, listForIntermediary, listForBanker, updateStatus };
