/**
 * Fishery v2 Controller — financial logbook
 * Thin HTTP layer over the v2 fishery service modules. Resolves the internal
 * numeric farmerId (users.id) from the JWT's business user_id and delegates.
 */

const { success } = require('../../../../shared/utils/responseHelper');
const { User } = require('../../../../shared/models');

const profileService = require('../services/fisheryProfileService');
const pondService = require('../services/fisheryPondV2Service');
const vesselService = require('../services/fisheryVesselService');
const costService = require('../services/fisheryCostEventService');
const revenueService = require('../services/fisheryRevenueEventService');
const stockingService = require('../services/fisheryStockingService');
const harvestService = require('../services/fisheryHarvestService');
const tripService = require('../services/fisheryTripService');
const treatmentService = require('../services/fisheryTreatmentService');
const recurringService = require('../services/fisheryRecurringService');
const weeklyService = require('../services/fisheryWeeklySummaryService');
const pnlService = require('../services/fisheryPnlService');
const aggregateService = require('../services/fisheryAggregateService');

const resolveFarmerId = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }
  return user.id;
};

// ---------- Persona phase: aggregate units save-and-lock ----------
/**
 * POST /roots/fishery/v2/units/aggregate
 * Body: { ponds, vessels, species, waterSource }
 * Creates N placeholder rows in fishery_ponds + fishery_vessels and flips
 * the farmer's FISHERY activity subscription setup_complete = true.
 */
const saveAggregateUnits = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const result = await aggregateService.saveAggregateUnits(farmerId, req.body || {});
    return success(res, { message: 'Fishery units aggregate saved', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

// ---------- Profile ----------
const upsertProfile = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const profile = await profileService.upsertProfile(farmerId, req.body);
    return success(res, { message: 'Fishery profile saved', data: profile, statusCode: 201 });
  } catch (err) { next(err); }
};

const getProfile = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const profile = await profileService.getProfile(farmerId);
    return success(res, { message: 'Fishery profile retrieved', data: profile });
  } catch (err) { next(err); }
};

// ---------- Ponds ----------
const addPond = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const pond = await pondService.addPond(farmerId, req.body);
    return success(res, { message: 'Pond added', data: pond, statusCode: 201 });
  } catch (err) { next(err); }
};

const listPonds = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const ponds = await pondService.listPonds(farmerId, req.query);
    return success(res, { message: 'Ponds retrieved', data: ponds });
  } catch (err) { next(err); }
};

const getPond = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const pond = await pondService.getPond(farmerId, req.params.pondUuid);
    return success(res, { message: 'Pond retrieved', data: pond });
  } catch (err) { next(err); }
};

const updatePond = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const pond = await pondService.updatePond(farmerId, req.params.pondUuid, req.body);
    return success(res, { message: 'Pond updated', data: pond });
  } catch (err) { next(err); }
};

const exitPond = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const pond = await pondService.exitPond(farmerId, req.params.pondUuid, req.body);
    return success(res, { message: 'Pond exited', data: pond });
  } catch (err) { next(err); }
};

// ---------- Vessels ----------
const addVessel = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const vessel = await vesselService.addVessel(farmerId, req.body);
    return success(res, { message: 'Vessel added', data: vessel, statusCode: 201 });
  } catch (err) { next(err); }
};

const listVessels = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const vessels = await vesselService.listVessels(farmerId, req.query);
    return success(res, { message: 'Vessels retrieved', data: vessels });
  } catch (err) { next(err); }
};

const getVessel = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const vessel = await vesselService.getVessel(farmerId, req.params.vesselUuid);
    return success(res, { message: 'Vessel retrieved', data: vessel });
  } catch (err) { next(err); }
};

const updateVessel = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const vessel = await vesselService.updateVessel(farmerId, req.params.vesselUuid, req.body);
    return success(res, { message: 'Vessel updated', data: vessel });
  } catch (err) { next(err); }
};

const exitVessel = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const vessel = await vesselService.exitVessel(farmerId, req.params.vesselUuid, req.body);
    return success(res, { message: 'Vessel exited', data: vessel });
  } catch (err) { next(err); }
};

// ---------- Cost events ----------
const createCostEvent = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const event = await costService.createCostEvent(farmerId, req.body);
    return success(res, { message: 'Cost event logged', data: event, statusCode: 201 });
  } catch (err) { next(err); }
};

const listCostEvents = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const events = await costService.listCostEvents(farmerId, req.query);
    return success(res, { message: 'Cost events retrieved', data: events });
  } catch (err) { next(err); }
};

const listPendingEvents = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const events = await costService.listPendingEvents(farmerId);
    return success(res, { message: 'Pending events retrieved', data: events });
  } catch (err) { next(err); }
};

const confirmPendingEvent = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const event = await costService.confirmPendingEvent(
      farmerId, req.params.eventUuid, req.body,
    );
    return success(res, { message: 'Pending event confirmed', data: event });
  } catch (err) { next(err); }
};

// ---------- Revenue events ----------
const createRevenueEvent = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const event = await revenueService.createRevenueEvent(farmerId, req.body);
    return success(res, { message: 'Revenue event logged', data: event, statusCode: 201 });
  } catch (err) { next(err); }
};

const listRevenueEvents = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const events = await revenueService.listRevenueEvents(farmerId, req.query);
    return success(res, { message: 'Revenue events retrieved', data: events });
  } catch (err) { next(err); }
};

// ---------- Stocking / Harvest ----------
const createStockingEvent = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const event = await stockingService.createStockingEvent(farmerId, req.body);
    return success(res, { message: 'Stocking event logged', data: event, statusCode: 201 });
  } catch (err) { next(err); }
};

const createHarvestEvent = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const event = await harvestService.createHarvestEvent(farmerId, req.body);
    return success(res, { message: 'Harvest event logged', data: event, statusCode: 201 });
  } catch (err) { next(err); }
};

// ---------- Trips ----------
const createTrip = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const trip = await tripService.createTrip(farmerId, req.body);
    return success(res, { message: 'Trip logged', data: trip, statusCode: 201 });
  } catch (err) { next(err); }
};

const listTrips = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const trips = await tripService.listTrips(farmerId, req.query);
    return success(res, { message: 'Trips retrieved', data: trips });
  } catch (err) { next(err); }
};

// ---------- Treatment ----------
const createTreatmentEvent = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const event = await treatmentService.createTreatmentEvent(farmerId, req.body);
    return success(res, { message: 'Treatment event logged', data: event, statusCode: 201 });
  } catch (err) { next(err); }
};

const listTreatmentEvents = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const events = await treatmentService.listTreatmentEvents(farmerId, req.query);
    return success(res, { message: 'Treatment events retrieved', data: events });
  } catch (err) { next(err); }
};

// ---------- Recurring templates ----------
const createTemplate = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const tpl = await recurringService.createTemplate(farmerId, req.body);
    return success(res, { message: 'Recurring template created', data: tpl, statusCode: 201 });
  } catch (err) { next(err); }
};

const listTemplates = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const tpls = await recurringService.listTemplates(farmerId);
    return success(res, { message: 'Templates retrieved', data: tpls });
  } catch (err) { next(err); }
};

const deleteTemplate = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    await recurringService.deleteTemplate(farmerId, req.params.templateUuid);
    return success(res, { message: 'Template deactivated' });
  } catch (err) { next(err); }
};

// ---------- Weekly summary ----------
const upsertWeeklySummary = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const s = await weeklyService.upsertWeeklySummary(farmerId, req.body);
    return success(res, { message: 'Weekly summary saved', data: s, statusCode: 201 });
  } catch (err) { next(err); }
};

const finalizeWeek = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const s = await weeklyService.finalizeWeek(farmerId, req.params.summaryUuid);
    return success(res, { message: 'Weekly summary finalized', data: s });
  } catch (err) { next(err); }
};

const listWeeklySummaries = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const list = await weeklyService.listWeeklySummaries(farmerId);
    return success(res, { message: 'Weekly summaries retrieved', data: list });
  } catch (err) { next(err); }
};

// ---------- P&L ----------
const getFarmPnl = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const pnl = await pnlService.getFarmPnl(farmerId, req.query.startDate, req.query.endDate);
    return success(res, { message: 'Farm P&L computed', data: pnl });
  } catch (err) { next(err); }
};

const getPerPondPnl = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const pnl = await pnlService.getPerPondPnl(farmerId, req.query.startDate, req.query.endDate);
    return success(res, { message: 'Per-pond P&L computed', data: pnl });
  } catch (err) { next(err); }
};

const getPerVesselPnl = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const pnl = await pnlService.getPerVesselPnl(farmerId, req.query.startDate, req.query.endDate);
    return success(res, { message: 'Per-vessel P&L computed', data: pnl });
  } catch (err) { next(err); }
};

const getPerTripPnl = async (req, res, next) => {
  try {
    const farmerId = await resolveFarmerId(req);
    const pnl = await pnlService.getPerTripPnl(farmerId, req.query.startDate, req.query.endDate);
    return success(res, { message: 'Per-trip P&L computed', data: pnl });
  } catch (err) { next(err); }
};

module.exports = {
  upsertProfile, getProfile,
  addPond, listPonds, getPond, updatePond, exitPond,
  addVessel, listVessels, getVessel, updateVessel, exitVessel,
  createCostEvent, listCostEvents, listPendingEvents, confirmPendingEvent,
  createRevenueEvent, listRevenueEvents,
  createStockingEvent, createHarvestEvent,
  createTrip, listTrips,
  createTreatmentEvent, listTreatmentEvents,
  createTemplate, listTemplates, deleteTemplate,
  upsertWeeklySummary, finalizeWeek, listWeeklySummaries,
  getFarmPnl, getPerPondPnl, getPerVesselPnl, getPerTripPnl,
  saveAggregateUnits,
};
