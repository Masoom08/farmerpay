/**
 * Execution Controller — Farm, field, cultivation cycle, task execution endpoints.
 */
const executionService = require('../services/executionService');
const popComplianceService = require('../services/popComplianceService');
const { success } = require('../../../../shared/utils/responseHelper');
const STATUS_CODES = require('../../../../shared/constants/statusCodes');
const { User } = require('../../../../shared/models');

const resolveUserId = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) { const err = new Error('User not found'); err.statusCode = 404; throw err; }
  return user.id;
};

const registerFarm = async (req, res, next) => {
  try { const fid = await resolveUserId(req); const r = await executionService.registerFarm(fid, req.body); return success(res, { message: 'Farm registered', data: r, statusCode: STATUS_CODES.CREATED }); } catch (e) { next(e); }
};

const addField = async (req, res, next) => {
  try { const fid = await resolveUserId(req); const r = await executionService.addField(fid, parseInt(req.params.registerId, 10), req.body); return success(res, { message: 'Field added', data: r, statusCode: STATUS_CODES.CREATED }); } catch (e) { next(e); }
};

const createCycle = async (req, res, next) => {
  try { const fid = await resolveUserId(req); const r = await executionService.createCycle(fid, req.body); return success(res, { message: 'Cultivation cycle created', data: r, statusCode: STATUS_CODES.CREATED }); } catch (e) { next(e); }
};

const getCycleWorkbands = async (req, res, next) => {
  try { const fid = await resolveUserId(req); const r = await executionService.getCycleWorkbands(fid, parseInt(req.params.cycleId, 10)); return success(res, { message: 'Workbands retrieved', data: r }); } catch (e) { next(e); }
};

/** GET /roots/cycles/me — list all cultivation cycles for the auth'd farmer. */
const listMyCycles = async (req, res, next) => {
  try {
    const fid = await resolveUserId(req);
    const opts = {
      status: req.query.status || undefined,
      includeClosed: req.query.includeClosed === 'true',
      limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
    };
    const r = await executionService.listMyCycles(fid, opts);
    return success(res, { message: 'My cycles retrieved', data: { cycles: r, count: r.length } });
  } catch (e) { next(e); }
};

const executeWorkband = async (req, res, next) => {
  try { const fid = await resolveUserId(req); const r = await executionService.executeWorkband(parseInt(req.params.workbandId, 10), req.body, fid); return success(res, { message: 'Workband execution started', data: r }); } catch (e) { next(e); }
};

const executeTask = async (req, res, next) => {
  try { const fid = await resolveUserId(req); const r = await executionService.executeTask(parseInt(req.params.taskId, 10), req.body, fid); return success(res, { message: 'Task execution started', data: r, statusCode: STATUS_CODES.CREATED }); } catch (e) { next(e); }
};

const completeTask = async (req, res, next) => {
  try { const fid = await resolveUserId(req); const r = await executionService.completeTask(parseInt(req.params.taskId, 10), req.body, fid); return success(res, { message: 'Task completed', data: r }); } catch (e) { next(e); }
};

const recordHarvest = async (req, res, next) => {
  try { const fid = await resolveUserId(req); const r = await executionService.recordHarvest(fid, parseInt(req.params.cycleId, 10), req.body); return success(res, { message: 'Harvest recorded', data: r, statusCode: STATUS_CODES.CREATED }); } catch (e) { next(e); }
};

const recordSale = async (req, res, next) => {
  try { const fid = await resolveUserId(req); const r = await executionService.recordSale(fid, parseInt(req.params.harvestRecordId, 10), req.body); return success(res, { message: 'Sale recorded', data: r, statusCode: STATUS_CODES.CREATED }); } catch (e) { next(e); }
};

const getCycleSummary = async (req, res, next) => {
  try { const fid = await resolveUserId(req); const r = await executionService.getCycleSummary(fid, parseInt(req.params.cycleId, 10)); return success(res, { message: 'Cycle summary retrieved', data: r }); } catch (e) { next(e); }
};

/** GET /roots/cycles/:cycleId/pulse-realisation — Post-harvest PULSE x DICE intelligence */
const getCyclePulseRealisation = async (req, res, next) => {
  try {
    const fid = await resolveUserId(req);
    const r = await executionService.getCyclePulseRealisation(fid, parseInt(req.params.cycleId, 10));
    return success(res, { message: 'Post-harvest intelligence retrieved', data: r });
  } catch (e) { next(e); }
};

/** GET /roots/cycles/:cycleId/pop-compliance — Full PoP compliance snapshot */
const getPopCompliance = async (req, res, next) => {
  try {
    const fid = await resolveUserId(req);
    const r = await popComplianceService.getComplianceSnapshot(req.params.cycleId, fid);
    return success(res, { message: 'PoP compliance snapshot retrieved', data: r });
  } catch (e) { next(e); }
};

/** GET /roots/cycles/:cycleId/pop-deviations — PoP compliance deviations only */
const getPopDeviations = async (req, res, next) => {
  try {
    const fid = await resolveUserId(req);
    const r = await popComplianceService.getComplianceDeviations(req.params.cycleId, fid);
    return success(res, { message: 'PoP compliance deviations retrieved', data: r });
  } catch (e) { next(e); }
};

const getCycleCompliance = async (req, res, next) => {
  try {
    const varianceService = require('../services/varianceService');
    const result = await varianceService.computeCycleComplianceScore(parseInt(req.params.cycleId, 10));
    return success(res, { message: 'Compliance score', data: result });
  } catch (e) { next(e); }
};

const getFarmerHealthSummary = async (req, res, next) => {
  try {
    const fid = await resolveUserId(req);
    const farmerHealthService = require('../services/farmerHealthService');
    const result = await farmerHealthService.getHealthSummary(fid);
    return success(res, { message: 'Farm health summary', data: result });
  } catch (e) { next(e); }
};

const unlinkVyaparTransaction = async (req, res, next) => {
  try {
    const fid = await resolveUserId(req);
    const bridgeService = require('../services/vyaparRootsBridgeService');
    const result = await bridgeService.unlinkTransaction(fid, req.body.transactionItemId, req.body.reason);
    return success(res, { message: 'Transaction unlinked', data: result });
  } catch (e) { next(e); }
};

const getVyaparLinkSuggestions = async (req, res, next) => {
  try {
    const fid = await resolveUserId(req);
    const bridgeService = require('../services/vyaparRootsBridgeService');
    const result = await bridgeService.getSuggestedLinks(fid, parseInt(req.query.transactionId, 10));
    return success(res, { message: 'Link suggestions', data: result });
  } catch (e) { next(e); }
};

module.exports = { registerFarm, addField, createCycle, getCycleWorkbands, listMyCycles, executeWorkband, executeTask, completeTask, recordHarvest, recordSale, getCycleSummary, getCyclePulseRealisation, getPopCompliance, getPopDeviations, getCycleCompliance, getFarmerHealthSummary, unlinkVyaparTransaction, getVyaparLinkSuggestions };
