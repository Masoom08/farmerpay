/**
 * Trust Controller — Handles HTTP requests for TRUST scoring endpoints.
 */
const trustService = require('../services/trustService');
const { success } = require('../../../shared/utils/responseHelper');
const STATUS_CODES = require('../../../shared/constants/statusCodes');
const logger = require('../../../shared/utils/logger');
const { getRedisClient } = require('../../../config/redis');
const { User } = require('../../../shared/models');

const resolveUserId = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) { const err = new Error('User not found'); err.statusCode = 404; throw err; }
  return user.id;
};

/**
 * Enforces access control on endpoints that take a `:farmerId` path param.
 * FARMER role may only access their own record. Non-farmer roles (banker,
 * admin, sathi, dice_analyst, system_admin) are allowed through — further
 * portfolio/assignment scoping is the caller's responsibility.
 */
const assertFarmerScopeOrRole = async (req, targetFarmerId) => {
  const callerRole = req.user?.role;
  if (callerRole === 'FARMER') {
    const callerFarmerId = await resolveUserId(req);
    if (callerFarmerId !== targetFarmerId) {
      const err = new Error('Forbidden: cannot access another farmer\'s record');
      err.statusCode = 403;
      err.errorCode = 'TRUST_FORBIDDEN';
      throw err;
    }
  }
};

/** GET /trust/sections */
const getSections = async (req, res, next) => {
  try {
    const sections = await trustService.getSections();
    return success(res, { message: 'Sections retrieved', data: sections, meta: { total: sections.length } });
  } catch (err) { next(err); }
};

/** GET /trust/sections/:sectionId/questions */
const getSectionQuestions = async (req, res, next) => {
  try {
    const questions = await trustService.getSectionQuestions(parseInt(req.params.sectionId, 10));
    return success(res, { message: 'Questions retrieved', data: questions, meta: { total: questions.length } });
  } catch (err) { next(err); }
};

/** POST /trust/responses */
const saveResponses = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await trustService.saveResponses(farmerId, req.body.sectionId, req.body.responses);
    return success(res, { message: 'Responses saved', data: result, statusCode: STATUS_CODES.CREATED });
  } catch (err) { next(err); }
};

/** GET /trust/progress */
const getProgress = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await trustService.getProgress(farmerId);
    return success(res, { message: 'Progress retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /trust/score */
const getScore = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await trustService.getScore(farmerId);
    return success(res, { message: 'TRUST score retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /trust/score/history */
const getScoreHistory = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await trustService.getScoreHistory(farmerId, req.query);
    return success(res, { message: 'Score history retrieved', data: result.history, meta: result.meta });
  } catch (err) { next(err); }
};

/** POST /trust/appeal */
const submitAppeal = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await trustService.submitAppeal(farmerId, req.body);
    return success(res, { message: 'Appeal submitted', data: result, statusCode: STATUS_CODES.CREATED });
  } catch (err) { next(err); }
};

/** GET /trust/appeal/:appealId */
const getAppeal = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await trustService.getAppeal(farmerId, req.params.appealId);
    return success(res, { message: 'Appeal retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /admin/trust/appeals (admin only) */
const getAppealsAdmin = async (req, res, next) => {
  try {
    const result = await trustService.getAppealsAdmin(req.query);
    return success(res, { message: 'Appeals retrieved', data: result.appeals, meta: result.meta });
  } catch (err) { next(err); }
};

/** GET /trust/home — one-call dashboard payload (score + profile + activities) */
const getHome = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const data = await trustService.getHome(farmerId);
    return success(res, { message: 'TRUST home retrieved', data });
  } catch (err) { next(err); }
};

/** GET /trust/activities */
const getActivities = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const data = await trustService.getActivities(farmerId);
    return success(res, { message: 'Activities retrieved', data });
  } catch (err) { next(err); }
};

/** PUT /trust/activities */
const upsertActivities = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const data = await trustService.upsertActivities(farmerId, req.body);
    return success(res, { message: 'Activities updated', data });
  } catch (err) { next(err); }
};

// ─── Liabilities ───────────────────────────────────────────────────

/** GET /trust/liabilities */
const listLiabilities = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const data = await trustService.listLiabilities(farmerId);
    return success(res, { message: 'Liabilities retrieved', data });
  } catch (err) { next(err); }
};

/** POST /trust/liabilities */
const createLiability = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const data = await trustService.createLiability(farmerId, req.body);
    return success(res, { message: 'Liability created', data, statusCode: STATUS_CODES.CREATED });
  } catch (err) { next(err); }
};

/** PUT /trust/liabilities/:loanUuid */
const updateLiability = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const data = await trustService.updateLiability(farmerId, req.params.loanUuid, req.body);
    return success(res, { message: 'Liability updated', data });
  } catch (err) { next(err); }
};

/** DELETE /trust/liabilities/:loanUuid */
const deleteLiability = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const data = await trustService.deleteLiability(farmerId, req.params.loanUuid);
    return success(res, { message: 'Liability deleted', data });
  } catch (err) { next(err); }
};

/** GET /trust/liabilities/:loanUuid/repayments */
const listRepayments = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const data = await trustService.listRepayments(farmerId, req.params.loanUuid);
    return success(res, { message: 'Repayments retrieved', data });
  } catch (err) { next(err); }
};

/** POST /trust/liabilities/:loanUuid/repayments */
const logRepayment = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const data = await trustService.logRepayment(farmerId, req.params.loanUuid, req.body);
    return success(res, { message: 'Repayment logged', data, statusCode: STATUS_CODES.CREATED });
  } catch (err) { next(err); }
};

// ─── Household Expenses ────────────────────────────────────────────

/** GET /trust/expenses */
const listExpenses = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const data = await trustService.listExpenses(farmerId, req.query);
    return success(res, { message: 'Expenses retrieved', data });
  } catch (err) { next(err); }
};

/** GET /trust/expenses/current */
const getCurrentMonthExpense = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const data = await trustService.getCurrentMonthExpense(farmerId);
    return success(res, { message: 'Current month expense retrieved', data });
  } catch (err) { next(err); }
};

/** GET /trust/expenses/summary */
const getExpenseSummary = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const data = await trustService.getExpenseSummary(farmerId);
    return success(res, { message: 'Expense summary retrieved', data });
  } catch (err) { next(err); }
};

/** POST /trust/expenses */
const upsertMonthlyExpense = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const data = await trustService.upsertMonthlyExpense(farmerId, req.body);
    return success(res, { message: 'Expense saved', data, statusCode: STATUS_CODES.CREATED });
  } catch (err) { next(err); }
};

/** GET /trust/leverage — L5 borrowing capacity calculator */
const getLeverage = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const data = await trustService.getLeverage(farmerId);
    return success(res, { message: 'Leverage computed', data });
  } catch (err) { next(err); }
};

// ─── TRUST v2 Handlers ───────────────────────────────────────────

/** GET /trust/farmer/:farmerId/snapshot */
const getSnapshot = async (req, res, next) => {
  try {
    const farmerId = parseInt(req.params.farmerId, 10);
    await assertFarmerScopeOrRole(req, farmerId);
    const data = await trustService.getLatestSnapshot(farmerId);
    if (!data) {
      const err = new Error('No snapshot found for this farmer');
      err.statusCode = 404;
      err.errorCode = 'TRUST_SNAPSHOT_NOT_FOUND';
      throw err;
    }
    return success(res, { message: 'Snapshot retrieved', data });
  } catch (err) { next(err); }
};

/** POST /trust/farmer/:farmerId/recompute */
const RECOMPUTE_DAILY_LIMIT = 5;
const recomputeSnapshot = async (req, res, next) => {
  try {
    const farmerId = parseInt(req.params.farmerId, 10);

    // Throttle recomputes per farmer per day. Recompute pulls evidence from
    // CIBIL/AA (paid + rate-limited upstream), so an unbounded banker can
    // burn money and data quotas on a single farmer. 5/day is enough for
    // legitimate decisioning — more than that is suspicious.
    const bankerId = req.user?.id || 'unknown';
    const redis = getRedisClient();
    const rateKey = `trust:recompute:${farmerId}:${new Date().toISOString().slice(0, 10)}`;
    const count = await redis.incr(rateKey);
    if (count === 1) await redis.expire(rateKey, 24 * 60 * 60);
    if (count > RECOMPUTE_DAILY_LIMIT) {
      const err = new Error(`Recompute limit reached for this farmer today (max ${RECOMPUTE_DAILY_LIMIT})`);
      err.statusCode = 429;
      err.errorCode = 'TRUST_RECOMPUTE_RATE_LIMITED';
      throw err;
    }

    // Audit trail: every banker-triggered recompute is logged with actor,
    // target, and reason so the portfolio-assignment check (when it lands)
    // can retroactively flag out-of-scope access.
    logger.info('trust.recompute', {
      bankerId,
      bankerRole: req.user?.role,
      farmerId,
      reason: req.body?.reason || null,
      ip: req.ip,
      countToday: count,
    });

    const data = await trustService.computeSnapshot(farmerId, { reason: req.body.reason });
    return success(res, { message: 'Snapshot recomputed', data, statusCode: STATUS_CODES.CREATED });
  } catch (err) { next(err); }
};

/** POST /trust/decisions */
const recordDecision = async (req, res, next) => {
  try {
    const bankerId = await resolveUserId(req);
    const data = await trustService.recordDecision({
      snapshotUuid: req.body.snapshotUuid,
      bankerId,
      decision: req.body.decision,
      reasonCode: req.body.reasonCode,
      reasonText: req.body.reasonText,
      cibilAcknowledged: req.body.cibilAcknowledged,
    });
    return success(res, { message: 'Decision recorded', data, statusCode: STATUS_CODES.CREATED });
  } catch (err) { next(err); }
};

/** GET /trust/portfolio */
const getPortfolio = async (req, res, next) => {
  try {
    const data = await trustService.getPortfolio(req.query);
    return success(res, { message: 'Portfolio retrieved', data: data.items, meta: data.meta });
  } catch (err) { next(err); }
};

/** POST /trust/export/pdf */
const exportPdf = async (req, res, next) => {
  try {
    const data = await trustService.exportPdf(req.body.snapshotUuid);
    return success(res, { message: 'PDF export initiated', data });
  } catch (err) { next(err); }
};

/** GET /sathi/tasks */
const getSathiTasks = async (req, res, next) => {
  try {
    const sathiId = await resolveUserId(req);
    const data = await trustService.getSathiTasks(sathiId, req.query);
    return success(res, { message: 'Tasks retrieved', data: data.items, meta: data.meta });
  } catch (err) { next(err); }
};

/** POST /sathi/tasks/:taskId/submit */
const submitSathiTask = async (req, res, next) => {
  try {
    const sathiId = await resolveUserId(req);
    const taskId = parseInt(req.params.taskId, 10);
    const data = await trustService.submitSathiTask(sathiId, taskId, req.body);
    return success(res, { message: 'Task submitted', data, statusCode: STATUS_CODES.CREATED });
  } catch (err) { next(err); }
};

/** POST /trust/farmer/:farmerId/request-data */
const requestMoreData = async (req, res, next) => {
  try {
    const farmerId = parseInt(req.params.farmerId, 10);
    const bankerId = await resolveUserId(req);
    const data = await trustService.requestMoreData(farmerId, {
      missingPillars: req.body.missingPillars,
      bankerId,
    });
    return success(res, { message: 'Data request tasks created', data, statusCode: STATUS_CODES.CREATED });
  } catch (err) { next(err); }
};

module.exports = {
  getSections, getSectionQuestions, saveResponses, getProgress,
  getScore, getScoreHistory, submitAppeal, getAppeal, getAppealsAdmin,
  getHome, getActivities, upsertActivities,
  getLeverage,
  listLiabilities, createLiability, updateLiability, deleteLiability,
  listRepayments, logRepayment,
  listExpenses, getCurrentMonthExpense, getExpenseSummary, upsertMonthlyExpense,
  // TRUST v2
  getSnapshot, recomputeSnapshot, recordDecision, getPortfolio, exportPdf,
  getSathiTasks, submitSathiTask, requestMoreData,
};
