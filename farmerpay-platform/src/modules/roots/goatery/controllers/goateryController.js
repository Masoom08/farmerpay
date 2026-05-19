/**
 * Goatery Controller — REST handlers for goatery module.
 */
const { success } = require('../../../../shared/utils/responseHelper');
const STATUS_CODES = require('../../../../shared/constants/statusCodes');
const { User } = require('../../../../shared/models');
const { generateUUID } = require('../../../../shared/utils/uuidHelper');

const herdService = require('../services/herdService');
const animalService = require('../services/animalService');
const breedingService = require('../services/breedingService');
const healthService = require('../services/healthService');
const economicsService = require('../services/economicsService');
const popComparison = require('../services/popComparisonService');

const resolveUserId = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) { const err = new Error('User not found'); err.statusCode = 404; throw err; }
  return user.id;
};

const herdId = (req) => parseInt(req.params.herdId, 10);

// ─── Herds ──────────────────────────────────────────────────
const createHerd = async (req, res, next) => { try { const fid = await resolveUserId(req); const r = await herdService.createHerd(fid, req.body); return success(res, { message: 'Herd created', data: r, statusCode: STATUS_CODES.CREATED }); } catch (e) { next(e); } };
const listMyHerds = async (req, res, next) => { try { const fid = await resolveUserId(req); const r = await herdService.listFarmerHerds(fid); return success(res, { message: 'Herds', data: r }); } catch (e) { next(e); } };
const getHerdDetail = async (req, res, next) => { try { const r = await herdService.getHerdById(herdId(req)); return success(res, { message: 'Herd detail', data: r }); } catch (e) { next(e); } };
const updateHerd = async (req, res, next) => { try { const r = await herdService.updateHerd(herdId(req), req.body); return success(res, { message: 'Herd updated', data: r }); } catch (e) { next(e); } };

// ─── Animals ────────────────────────────────────────────────
const registerAnimal = async (req, res, next) => { try { const r = await animalService.registerAnimal(herdId(req), req.body); return success(res, { message: 'Animal registered', data: r, statusCode: STATUS_CODES.CREATED }); } catch (e) { next(e); } };
const listAnimals = async (req, res, next) => { try { const r = await animalService.listHerdAnimals(herdId(req), req.query); return success(res, { message: 'Animals', data: r }); } catch (e) { next(e); } };
const updateWeight = async (req, res, next) => { try { const r = await animalService.updateAnimalWeight(parseInt(req.params.animalId, 10), req.body.weightKg); return success(res, { message: 'Weight updated', data: r }); } catch (e) { next(e); } };
const sellAnimal = async (req, res, next) => { try { const r = await animalService.markSold(parseInt(req.params.animalId, 10), req.body); return success(res, { message: 'Animal sold', data: r }); } catch (e) { next(e); } };
const markDead = async (req, res, next) => { try { const r = await animalService.markDead(parseInt(req.params.animalId, 10), req.body); return success(res, { message: 'Death recorded', data: r }); } catch (e) { next(e); } };

// ─── Growth logs ────────────────────────────────────────────
const createGrowthLog = async (req, res, next) => {
  try {
    const { GoatGrowthLog } = require('../../../../shared/models');
    const log = await GoatGrowthLog.create({
      uuid: generateUUID(), animal_id: parseInt(req.params.animalId, 10),
      log_date: req.body.logDate, weight_kg: req.body.weightKg,
      body_condition_score: req.body.bodyConditionScore || null,
      notes: req.body.notes || null, photo_url: req.body.photoUrl || null,
    });
    return success(res, { message: 'Growth log recorded', data: { logId: log.id }, statusCode: STATUS_CODES.CREATED });
  } catch (e) { next(e); }
};
const getGrowthLogs = async (req, res, next) => {
  try {
    const { GoatGrowthLog } = require('../../../../shared/models');
    const logs = await GoatGrowthLog.findAll({
      where: { animal_id: parseInt(req.params.animalId, 10), is_active: true },
      order: [['log_date', 'DESC']],
    });
    return success(res, { message: 'Growth logs', data: logs });
  } catch (e) { next(e); }
};

// ─── Breeding ───────────────────────────────────────────────
const recordBreedingService = async (req, res, next) => { try { const r = await breedingService.recordService(parseInt(req.params.doeId, 10), req.body); return success(res, { message: 'Service recorded', data: r, statusCode: STATUS_CODES.CREATED }); } catch (e) { next(e); } };
const recordKidding = async (req, res, next) => { try { const r = await breedingService.recordKidding(parseInt(req.params.eventId, 10), req.body); return success(res, { message: 'Kidding recorded', data: r }); } catch (e) { next(e); } };
const getBreedingCalendar = async (req, res, next) => { try { const r = await breedingService.getBreedingCalendar(herdId(req)); return success(res, { message: 'Breeding calendar', data: r }); } catch (e) { next(e); } };

// ─── Health ─────────────────────────────────────────────────
const createHealthEvent = async (req, res, next) => { try { const r = await healthService.createHealthEvent(herdId(req), req.body); return success(res, { message: 'Health event recorded', data: r, statusCode: STATUS_CODES.CREATED }); } catch (e) { next(e); } };
const getHealthEvents = async (req, res, next) => { try { const r = await healthService.getHealthEvents(herdId(req), req.query); return success(res, { message: 'Health events', data: r }); } catch (e) { next(e); } };

// ─── Feed, Cost, Revenue ────────────────────────────────────
const createFeedLog = async (req, res, next) => {
  try {
    const { GoatFeedLog } = require('../../../../shared/models');
    const log = await GoatFeedLog.create({
      uuid: generateUUID(), herd_id: herdId(req),
      log_date: req.body.logDate, feed_type: req.body.feedType,
      quantity_kg: req.body.quantityKg || null, grazing_hours: req.body.grazingHours || null,
      cost: req.body.cost || null, notes: req.body.notes || null,
    });
    return success(res, { message: 'Feed log recorded', data: { logId: log.id }, statusCode: STATUS_CODES.CREATED });
  } catch (e) { next(e); }
};
const getFeedLogs = async (req, res, next) => {
  try {
    const { GoatFeedLog } = require('../../../../shared/models');
    return success(res, { message: 'Feed logs', data: await GoatFeedLog.findAll({ where: { herd_id: herdId(req), is_active: true }, order: [['log_date', 'DESC']] }) });
  } catch (e) { next(e); }
};

const createCostEvent = async (req, res, next) => {
  try {
    const { GoatCostEvent } = require('../../../../shared/models');
    const event = await GoatCostEvent.create({
      uuid: generateUUID(), herd_id: herdId(req),
      event_date: req.body.eventDate, category: req.body.category,
      amount: req.body.amount, description: req.body.description || null,
    });
    return success(res, { message: 'Cost recorded', data: { eventId: event.id }, statusCode: STATUS_CODES.CREATED });
  } catch (e) { next(e); }
};
const getCostEvents = async (req, res, next) => {
  try {
    const { GoatCostEvent } = require('../../../../shared/models');
    return success(res, { message: 'Costs', data: await GoatCostEvent.findAll({ where: { herd_id: herdId(req), is_active: true }, order: [['event_date', 'DESC']] }) });
  } catch (e) { next(e); }
};

const createRevenueEvent = async (req, res, next) => {
  try {
    const { GoatRevenueEvent } = require('../../../../shared/models');
    const event = await GoatRevenueEvent.create({
      uuid: generateUUID(), herd_id: herdId(req),
      animal_id: req.body.animalId || null, event_date: req.body.eventDate,
      category: req.body.category, quantity: req.body.quantity || null,
      unit: req.body.unit || null, rate_per_unit: req.body.ratePerUnit || null,
      total_amount: req.body.totalAmount, buyer_name: req.body.buyerName || null,
      sale_weight_kg: req.body.saleWeightKg || null,
    });
    return success(res, { message: 'Revenue recorded', data: { eventId: event.id }, statusCode: STATUS_CODES.CREATED });
  } catch (e) { next(e); }
};
const getRevenueEvents = async (req, res, next) => {
  try {
    const { GoatRevenueEvent } = require('../../../../shared/models');
    return success(res, { message: 'Revenue', data: await GoatRevenueEvent.findAll({ where: { herd_id: herdId(req), is_active: true }, order: [['event_date', 'DESC']] }) });
  } catch (e) { next(e); }
};

// ─── Analytics ──────────────────────────────────────────────
const getEconomics = async (req, res, next) => { try { const r = await economicsService.getHerdEconomics(herdId(req)); return success(res, { message: 'Herd economics', data: r }); } catch (e) { next(e); } };
const getPopComparison = async (req, res, next) => { try { const r = await popComparison.compareHerdToStandard(herdId(req)); return success(res, { message: 'PoP comparison', data: r }); } catch (e) { next(e); } };
const getVaccSchedule = async (req, res, next) => { try { const r = await healthService.getVaccinationSchedule(herdId(req)); return success(res, { message: 'Vaccination schedule', data: r }); } catch (e) { next(e); } };
const getReproductive = async (req, res, next) => { try { const r = await breedingService.getReproductiveEfficiency(herdId(req)); return success(res, { message: 'Reproductive efficiency', data: r }); } catch (e) { next(e); } };

module.exports = {
  createHerd, listMyHerds, getHerdDetail, updateHerd,
  registerAnimal, listAnimals, updateWeight, sellAnimal, markDead,
  createGrowthLog, getGrowthLogs,
  recordBreedingService, recordKidding, getBreedingCalendar,
  createHealthEvent, getHealthEvents,
  createFeedLog, getFeedLogs,
  createCostEvent, getCostEvents,
  createRevenueEvent, getRevenueEvents,
  getEconomics, getPopComparison, getVaccSchedule, getReproductive,
};
