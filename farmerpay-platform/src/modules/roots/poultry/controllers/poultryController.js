/**
 * Poultry Controller — REST handlers for poultry module.
 */
const { success } = require('../../../../shared/utils/responseHelper');
const STATUS_CODES = require('../../../../shared/constants/statusCodes');
const { User } = require('../../../../shared/models');
const { generateUUID } = require('../../../../shared/utils/uuidHelper');

const flockService = require('../services/flockService');
const dailyLogService = require('../services/dailyLogService');
const batchAnalytics = require('../services/batchAnalyticsService');
const popComparison = require('../services/popComparisonService');
const alertService = require('../services/alertService');

const resolveUserId = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) { const err = new Error('User not found'); err.statusCode = 404; throw err; }
  return user.id;
};

// ─── Flock CRUD ─────────────────────────────────────────────

const createFlock = async (req, res, next) => {
  try { const fid = await resolveUserId(req); const r = await flockService.createFlock(fid, req.body);
    return success(res, { message: 'Flock created', data: r, statusCode: STATUS_CODES.CREATED }); } catch (e) { next(e); }
};

const listMyFlocks = async (req, res, next) => {
  try { const fid = await resolveUserId(req); const r = await flockService.listFarmerFlocks(fid, req.query);
    return success(res, { message: 'Flocks retrieved', data: r }); } catch (e) { next(e); }
};

const getFlockDetail = async (req, res, next) => {
  try { const r = await flockService.getFlockById(parseInt(req.params.flockId, 10));
    return success(res, { message: 'Flock detail', data: r }); } catch (e) { next(e); }
};

const updateFlock = async (req, res, next) => {
  try { const r = await flockService.updateFlock(parseInt(req.params.flockId, 10), req.body);
    return success(res, { message: 'Flock updated', data: r }); } catch (e) { next(e); }
};

const completeFlock = async (req, res, next) => {
  try { const r = await flockService.completeFlock(parseInt(req.params.flockId, 10), req.body?.completionDate);
    return success(res, { message: 'Flock batch completed', data: r }); } catch (e) { next(e); }
};

const getFlockDashboard = async (req, res, next) => {
  try { const r = await flockService.getFlockDashboard(parseInt(req.params.flockId, 10));
    return success(res, { message: 'Flock dashboard', data: r }); } catch (e) { next(e); }
};

// ─── Daily Logs ─────────────────────────────────────────────

const createDailyLog = async (req, res, next) => {
  try { const r = await dailyLogService.createDailyLog(parseInt(req.params.flockId, 10), req.body);
    return success(res, { message: 'Daily log recorded', data: r, statusCode: STATUS_CODES.CREATED }); } catch (e) { next(e); }
};

const getDailyLogs = async (req, res, next) => {
  try { const r = await dailyLogService.getDailyLogs(parseInt(req.params.flockId, 10), req.query);
    return success(res, { message: 'Daily logs', data: r }); } catch (e) { next(e); }
};

// ─── Health Events ──────────────────────────────────────────

const createHealthEvent = async (req, res, next) => {
  try {
    const { PoultryHealthEvent } = require('../../../../shared/models');
    const event = await PoultryHealthEvent.create({
      uuid: generateUUID(), flock_id: parseInt(req.params.flockId, 10),
      event_date: req.body.eventDate, event_type: req.body.eventType,
      vaccine_name: req.body.vaccineName || null, disease_name: req.body.diseaseName || null,
      medicine_name: req.body.medicineName || null, dosage: req.body.dosage || null,
      birds_affected: req.body.birdsAffected || null, cost: req.body.cost || null,
      administered_by: req.body.administeredBy || null, notes: req.body.notes || null,
    });
    return success(res, { message: 'Health event recorded', data: { eventId: event.id }, statusCode: STATUS_CODES.CREATED });
  } catch (e) { next(e); }
};

const getHealthEvents = async (req, res, next) => {
  try {
    const { PoultryHealthEvent } = require('../../../../shared/models');
    const events = await PoultryHealthEvent.findAll({
      where: { flock_id: parseInt(req.params.flockId, 10), is_active: true },
      order: [['event_date', 'DESC']],
    });
    return success(res, { message: 'Health events', data: events });
  } catch (e) { next(e); }
};

// ─── Cost Events ────────────────────────────────────────────

const createCostEvent = async (req, res, next) => {
  try {
    const { PoultryCostEvent } = require('../../../../shared/models');
    const event = await PoultryCostEvent.create({
      uuid: generateUUID(), flock_id: parseInt(req.params.flockId, 10),
      event_date: req.body.eventDate, category: req.body.category,
      description: req.body.description || null, amount: req.body.amount,
      quantity: req.body.quantity || null, unit: req.body.unit || null,
      is_recurring: req.body.isRecurring || false, recurring_frequency: req.body.recurringFrequency || null,
    });
    return success(res, { message: 'Cost recorded', data: { eventId: event.id }, statusCode: STATUS_CODES.CREATED });
  } catch (e) { next(e); }
};

const getCostEvents = async (req, res, next) => {
  try {
    const { PoultryCostEvent } = require('../../../../shared/models');
    const events = await PoultryCostEvent.findAll({
      where: { flock_id: parseInt(req.params.flockId, 10), is_active: true },
      order: [['event_date', 'DESC']],
    });
    return success(res, { message: 'Cost events', data: events });
  } catch (e) { next(e); }
};

// ─── Revenue Events ─────────────────────────────────────────

const createRevenueEvent = async (req, res, next) => {
  try {
    const { PoultryRevenueEvent } = require('../../../../shared/models');
    const event = await PoultryRevenueEvent.create({
      uuid: generateUUID(), flock_id: parseInt(req.params.flockId, 10),
      event_date: req.body.eventDate, category: req.body.category,
      quantity: req.body.quantity, unit: req.body.unit || null,
      rate_per_unit: req.body.ratePerUnit || null, total_amount: req.body.totalAmount,
      buyer_name: req.body.buyerName || null, buyer_type: req.body.buyerType || null,
    });
    return success(res, { message: 'Revenue recorded', data: { eventId: event.id }, statusCode: STATUS_CODES.CREATED });
  } catch (e) { next(e); }
};

const getRevenueEvents = async (req, res, next) => {
  try {
    const { PoultryRevenueEvent } = require('../../../../shared/models');
    const events = await PoultryRevenueEvent.findAll({
      where: { flock_id: parseInt(req.params.flockId, 10), is_active: true },
      order: [['event_date', 'DESC']],
    });
    return success(res, { message: 'Revenue events', data: events });
  } catch (e) { next(e); }
};

// ─── Analytics ──────────────────────────────────────────────

const getBatchSummary = async (req, res, next) => {
  try { const r = await batchAnalytics.generateBatchSummary(parseInt(req.params.flockId, 10));
    return success(res, { message: 'Batch summary', data: r }); } catch (e) { next(e); }
};

const getPopComparison = async (req, res, next) => {
  try { const r = await popComparison.compareToStandard(parseInt(req.params.flockId, 10));
    return success(res, { message: 'PoP comparison', data: r }); } catch (e) { next(e); }
};

const getAlerts = async (req, res, next) => {
  try { const r = await alertService.runAllChecks(parseInt(req.params.flockId, 10));
    return success(res, { message: 'Alerts', data: r }); } catch (e) { next(e); }
};

module.exports = {
  createFlock, listMyFlocks, getFlockDetail, updateFlock, completeFlock, getFlockDashboard,
  createDailyLog, getDailyLogs,
  createHealthEvent, getHealthEvents,
  createCostEvent, getCostEvents,
  createRevenueEvent, getRevenueEvents,
  getBatchSummary, getPopComparison, getAlerts,
};
