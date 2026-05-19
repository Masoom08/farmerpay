/**
 * Sentinel Controller
 * Handles loan health, risk analysis, cash flow, SMA classification, red flags, and alerts.
 */

const healthScoringService = require('../services/healthScoringService');
const riskAnalysisService = require('../services/riskAnalysisService');
const ewsService = require('../services/ewsService');
const { success } = require('../../../shared/utils/responseHelper');
const { User } = require('../../../shared/models');

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

/** GET /sentinel/loan/:applicationId/health */
const getLoanHealth = async (req, res, next) => {
  try {
    const result = await healthScoringService.getLoanHealth(parseInt(req.params.applicationId, 10));
    return success(res, { message: 'Loan health retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /sentinel/loan/:applicationId/risk */
const getLoanRisk = async (req, res, next) => {
  try {
    const result = await riskAnalysisService.getLoanRisk(parseInt(req.params.applicationId, 10));
    return success(res, { message: 'Loan risk analysis retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /sentinel/loan/:applicationId/cashflow */
const getCashFlow = async (req, res, next) => {
  try {
    const result = await riskAnalysisService.getCashFlow(parseInt(req.params.applicationId, 10));
    return success(res, { message: 'Cash flow projections retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /sentinel/sma-classification/:applicationId */
const getSmaClassification = async (req, res, next) => {
  try {
    const result = await healthScoringService.getSmaClassification(parseInt(req.params.applicationId, 10));
    return success(res, { message: 'SMA classification retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /sentinel/red-flags/:applicationId */
const getRedFlags = async (req, res, next) => {
  try {
    const result = await healthScoringService.getRedFlags(parseInt(req.params.applicationId, 10));
    return success(res, {
      message: 'Red flags retrieved',
      data: result.flags,
      meta: { total: result.total, unresolvedCount: result.unresolvedCount },
    });
  } catch (err) { next(err); }
};

/** GET /sentinel/alerts */
const getAlerts = async (req, res, next) => {
  try {
    const result = await ewsService.getAlerts(req.query);
    return success(res, {
      message: 'Alerts retrieved',
      data: result.alerts,
      meta: { total: result.total, unacknowledged: result.unacknowledged },
    });
  } catch (err) { next(err); }
};

/** POST /sentinel/alerts/:alertId/acknowledge */
const acknowledgeAlert = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const result = await ewsService.acknowledgeAlert(parseInt(req.params.alertId, 10), userId, req.body);
    return success(res, { message: 'Alert acknowledged', data: { alert: result } });
  } catch (err) { next(err); }
};

/** POST /sentinel/alerts/:alertId/action */
const alertAction = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const result = await ewsService.takeAlertAction(parseInt(req.params.alertId, 10), userId, req.body);
    return success(res, { message: 'Alert action recorded', data: result });
  } catch (err) { next(err); }
};

module.exports = {
  getLoanHealth,
  getLoanRisk,
  getCashFlow,
  getSmaClassification,
  getRedFlags,
  getAlerts,
  acknowledgeAlert,
  alertAction,
};
