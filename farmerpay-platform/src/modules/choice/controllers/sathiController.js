/**
 * Sathi Controller
 *
 * HTTP layer for Sathi assist, commissions, incentives, issues, nudges,
 * and the Sathi dashboard. The JWT subject is mapped to an Intermediary
 * row via resolveCallerIntermediary() in each handler that needs the
 * calling Sathi's identity.
 */

const assistService = require('../services/sathiAssistService');
const commissionService = require('../services/sathiCommissionService');
const incentiveService = require('../services/sathiIncentiveService');
const issueService = require('../services/sathiIssueService');
const nudgeService = require('../services/sathiNudgeService');
const dashboardService = require('../services/sathiDashboardService');
const { success } = require('../../../shared/utils/responseHelper');
const { User, Intermediary } = require('../../../shared/models');

/**
 * Resolve the numeric users.id from the JWT subject (which stores user_id uuid).
 */
const resolveUserId = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }
  return user.id;
};

/**
 * Load the Intermediary row for the current caller.
 */
const resolveMe = async (req) => {
  const userId = await resolveUserId(req);
  const me = await Intermediary.findOne({ where: { user_id: userId, is_active: true } });
  if (!me) {
    const err = new Error('Sathi profile not registered for this user');
    err.statusCode = 403;
    err.errorCode = 'SATHI_NOT_REGISTERED';
    throw err;
  }
  return { userId, me };
};

// ─── Assist Endpoints ───────────────────────────────────────────────

const assistLoan = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const result = await assistService.assistLoan({
      callerUserId: userId,
      farmerId: req.body.farmerId,
      loanBody: req.body,
    });
    return success(res, { message: 'Loan draft created', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

const assistInsurance = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const result = await assistService.assistInsurance({
      callerUserId: userId,
      farmerId: req.body.farmerId,
      insuranceBody: req.body,
    });
    return success(res, { message: 'Insurance referral created', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

const assistDataEntry = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const result = await assistService.assistDataEntry({
      callerUserId: userId,
      farmerId: req.body.farmerId,
      fields: req.body.fields,
    });
    return success(res, { message: 'Farmer profile updated', data: result });
  } catch (err) { next(err); }
};

// ─── Commission & Incentive ────────────────────────────────────────

const listCommissions = async (req, res, next) => {
  try {
    const { me } = await resolveMe(req);
    const rows = await commissionService.listCommissions(me.id, { period: req.query.period });
    const totals = await commissionService.getTotals(me.id, { period: req.query.period });
    return success(res, {
      message: 'Commission ledger retrieved',
      data: { items: rows, totals },
    });
  } catch (err) { next(err); }
};

const listIncentives = async (req, res, next) => {
  try {
    const { me } = await resolveMe(req);
    const rows = await incentiveService.listIncentives(me.id);
    return success(res, { message: 'Incentive ledger retrieved', data: rows });
  } catch (err) { next(err); }
};

// ─── Issues ────────────────────────────────────────────────────────

const raiseIssue = async (req, res, next) => {
  try {
    const { me } = await resolveMe(req);
    const row = await issueService.raiseIssue({
      intermediaryId: me.id,
      farmerId: req.body.farmerId,
      body: req.body,
    });
    return success(res, { message: 'Issue flagged', data: row, statusCode: 201 });
  } catch (err) { next(err); }
};

const listMyIssues = async (req, res, next) => {
  try {
    const { me } = await resolveMe(req);
    const rows = await issueService.listForIntermediary(me.id, { status: req.query.status });
    return success(res, { message: 'Issues retrieved', data: rows });
  } catch (err) { next(err); }
};

const listBankerIssues = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const rows = await issueService.listForBanker({
      bankerId: req.query.unassigned === 'true' ? null : userId,
      status: req.query.status || 'open',
    });
    return success(res, { message: 'Banker issue queue', data: rows });
  } catch (err) { next(err); }
};

const updateIssue = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const row = await issueService.updateStatus(parseInt(req.params.issueId, 10), {
      status: req.body.status,
      resolutionNotes: req.body.resolutionNotes,
      bankerId: req.body.bankerId || userId,
    });
    return success(res, { message: 'Issue updated', data: row });
  } catch (err) { next(err); }
};

// ─── Nudges ────────────────────────────────────────────────────────

const scheduleNudge = async (req, res, next) => {
  try {
    const { me } = await resolveMe(req);
    const row = await nudgeService.scheduleNudge({
      intermediaryId: me.id,
      farmerId: req.body.farmerId,
      nudgeType: req.body.nudgeType,
      channel: req.body.channel,
      payload: req.body.payload,
      scheduledFor: req.body.scheduledFor,
    });
    return success(res, { message: 'Nudge scheduled', data: row, statusCode: 201 });
  } catch (err) { next(err); }
};

const listNudges = async (req, res, next) => {
  try {
    const { me } = await resolveMe(req);
    const rows = await nudgeService.listForIntermediary(me.id);
    return success(res, { message: 'Nudges retrieved', data: rows });
  } catch (err) { next(err); }
};

// ─── Dashboard ─────────────────────────────────────────────────────

const getDashboardOverview = async (req, res, next) => {
  try {
    const { me } = await resolveMe(req);
    const data = await dashboardService.overview(me.id);
    return success(res, { message: 'Dashboard overview', data });
  } catch (err) { next(err); }
};

const getDashboardLoans = async (req, res, next) => {
  try {
    const { me } = await resolveMe(req);
    const data = await dashboardService.loansSummary(me.id);
    return success(res, { message: 'Loans summary', data });
  } catch (err) { next(err); }
};

const getDashboardInsurance = async (req, res, next) => {
  try {
    const { me } = await resolveMe(req);
    const data = await dashboardService.insuranceSummary(me.id);
    return success(res, { message: 'Insurance summary', data });
  } catch (err) { next(err); }
};

const getDashboardFarmers = async (req, res, next) => {
  try {
    const { me } = await resolveMe(req);
    const data = await dashboardService.getAssignedFarmers(me.id);
    return success(res, { message: 'Assigned farmers', data });
  } catch (err) { next(err); }
};

module.exports = {
  assistLoan,
  assistInsurance,
  assistDataEntry,
  listCommissions,
  listIncentives,
  raiseIssue,
  listMyIssues,
  listBankerIssues,
  updateIssue,
  scheduleNudge,
  listNudges,
  getDashboardOverview,
  getDashboardLoans,
  getDashboardInsurance,
  getDashboardFarmers,
};
