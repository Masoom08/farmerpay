/**
 * Sage Controller
 * Handles HTTP requests for advisories, alerts, and crop health observations.
 * All endpoints verify the authenticated user owns the requested resource.
 */

const sageService = require('../services/sageService');
const { success } = require('../../../shared/utils/responseHelper');
const { User } = require('../../../shared/models');

const resolveUserId = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) { const err = new Error('User not found'); err.statusCode = 404; throw err; }
  return user.id;
};

/** GET /sage/advisories/:farmerId */
const getAdvisories = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await sageService.getAdvisories(farmerId, req.query);
    return success(res, { message: 'Advisories retrieved', data: result.advisories, meta: { total: result.total } });
  } catch (err) { next(err); }
};

/** POST /sage/advisories/:farmerId/acknowledge */
const acknowledgeAdvisory = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await sageService.acknowledgeAdvisory(farmerId, req.body);
    return success(res, { message: 'Advisory acknowledged', data: { advisory: result } });
  } catch (err) { next(err); }
};

/** GET /sage/alerts/:farmerId */
const getAlerts = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await sageService.getAlerts(farmerId, req.query);
    return success(res, { message: 'Alerts retrieved', data: result });
  } catch (err) { next(err); }
};

/** POST /sage/crop-observation/:farmerId */
const createCropObservation = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await sageService.createCropObservation(farmerId, req.body);
    return success(res, { message: 'Crop observation recorded', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

/** POST /sage/soil-health/:farmerId — Save soil health card */
const saveSoilHealth = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await sageService.saveSoilHealthCard(farmerId, req.body);
    return success(res, { message: 'Soil health card saved', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

/** GET /sage/soil-health/:farmerId — Get soil health summary */
const getSoilHealth = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await sageService.getSoilHealthSummary(farmerId);
    return success(res, { message: 'Soil health summary retrieved', data: result });
  } catch (err) { next(err); }
};

// ─── Phase 2A: Crop Advisory Engine ────────────────────────────────

const cropAdvisoryEngine = require('../services/cropAdvisoryEngine');
const imdWeatherFetcher = require('../../../integrations/imd/imdWeatherFetcher');
const googleCropIdFetcher = require('../../../integrations/google/googleCropIdFetcher');

/** POST /sage/engine/run/:cycleId — manually run the engine for one cycle */
const runEngineForCycle = async (req, res, next) => {
  try {
    const cycleId = parseInt(req.params.cycleId, 10);
    const result = await cropAdvisoryEngine.runForCycle(cycleId);
    return success(res, { message: 'Engine run complete', data: result });
  } catch (err) { next(err); }
};

/** POST /sage/engine/run-farmer/me — engine for all of the auth'd farmer's cycles */
const runEngineForFarmer = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await cropAdvisoryEngine.runForFarmer(farmerId);
    return success(res, { message: 'Engine run complete', data: result });
  } catch (err) { next(err); }
};

/** POST /sage/weather/observe — admin/dev seed for a weather observation */
const seedWeatherObservation = async (req, res, next) => {
  try {
    const { WeatherObservation } = require('../../../shared/models');
    const row = await WeatherObservation.create({
      lgd_district_id: req.body.lgdDistrictId || null,
      latitude: req.body.latitude || null,
      longitude: req.body.longitude || null,
      observed_at: req.body.observedAt ? new Date(req.body.observedAt) : new Date(),
      temp_celsius: req.body.tempCelsius != null ? Number(req.body.tempCelsius) : null,
      humidity_percent: req.body.humidityPercent != null ? Number(req.body.humidityPercent) : null,
      rainfall_mm_24h: req.body.rainfallMm24h != null ? Number(req.body.rainfallMm24h) : null,
      wind_speed_kmh: req.body.windSpeedKmh != null ? Number(req.body.windSpeedKmh) : null,
      condition_text: req.body.conditionText || null,
      source: req.body.source || 'manual_seed',
      source_station_id: req.body.sourceStationId || null,
      is_active: true,
    });
    return success(res, { message: 'Weather observation stored', data: { observation: row } });
  } catch (err) { next(err); }
};

/** POST /sage/pests/alert — admin/dev seed for a regional pest alert */
const seedPestAlert = async (req, res, next) => {
  try {
    const { RegionalPestAlert } = require('../../../shared/models');
    const today = new Date();
    const oneWeekOut = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const row = await RegionalPestAlert.create({
      lgd_district_id: req.body.lgdDistrictId || null,
      crop_id: req.body.cropId,
      pest_code: req.body.pestCode,
      severity: req.body.severity || 'medium',
      observed_from: req.body.observedFrom || today.toISOString().slice(0, 10),
      observed_until: req.body.observedUntil || oneWeekOut.toISOString().slice(0, 10),
      source: req.body.source || 'manual_seed',
      notes: req.body.notes || null,
      is_active: true,
    });
    return success(res, { message: 'Regional pest alert stored', data: { alert: row } });
  } catch (err) { next(err); }
};

/** POST /sage/imd/fetch — manually trigger an IMD scrape sweep */
const fetchImdNow = async (req, res, next) => {
  try {
    const report = await imdWeatherFetcher.fetchAndStoreAll();
    return success(res, { message: 'IMD fetch complete', data: { report } });
  } catch (err) { next(err); }
};

/** POST /sage/google/fetch/:cycleId — mock-fetch a Google ALU observation */
const fetchGoogleForCycle = async (req, res, next) => {
  try {
    const cycleId = parseInt(req.params.cycleId, 10);
    const result = await googleCropIdFetcher.fetchAndStoreForCycle(cycleId);
    return success(res, { message: 'Google ALU fetch complete', data: result });
  } catch (err) { next(err); }
};

/** POST /sage/google/observe — admin/dev seed a Google observation directly */
const seedGoogleObservation = async (req, res, next) => {
  try {
    const { GoogleFieldObservation } = require('../../../shared/models');
    const row = await GoogleFieldObservation.create({
      farmer_id: req.body.farmerId,
      cycle_id: req.body.cycleId || null,
      field_id: req.body.fieldId || null,
      latitude: req.body.latitude || null,
      longitude: req.body.longitude || null,
      polygon_geojson: req.body.polygonGeojson || null,
      area_hectares: req.body.areaHectares || null,
      detected_crop_code: req.body.detectedCropCode || null,
      detected_crop_id: req.body.detectedCropId || null,
      sowing_date: req.body.sowingDate || null,
      harvest_date: req.body.harvestDate || null,
      confidence: req.body.confidence != null ? Number(req.body.confidence) : null,
      latest_ndvi: req.body.latestNdvi != null ? Number(req.body.latestNdvi) : null,
      latest_ndwi: req.body.latestNdwi != null ? Number(req.body.latestNdwi) : null,
      ndvi_time_series: req.body.ndviTimeSeries || null,
      season: req.body.season || null,
      season_year: req.body.seasonYear || null,
      source: req.body.source || 'manual_seed',
      last_observed_at: req.body.lastObservedAt ? new Date(req.body.lastObservedAt) : new Date(),
      is_active: true,
    });
    return success(res, { message: 'Google observation stored', data: { observation: row } });
  } catch (err) { next(err); }
};

/** GET /sage/feed/me — ₹-framed advisory feed for the authenticated farmer */
const getFeed = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await sageService.getAdvisoriesForFarmer(farmerId, req.query);
    return success(res, {
      message: 'SAGE feed retrieved',
      data: {
        advisories: result.advisories,
        shcStatus: result.shcStatus,
        nextEmi: result.nextEmi,
        googleConfirmation: result.googleConfirmation,
      },
      meta: { total: result.total },
    });
  } catch (err) { next(err); }
};

/** POST /sage/feed/acknowledge — Acknowledge an advisory by id */
const acknowledgeFeedAdvisory = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await sageService.acknowledgeAdvisory(farmerId, req.body);
    return success(res, { message: 'Advisory acknowledged', data: { advisory: result } });
  } catch (err) { next(err); }
};

/** POST /sage/feedback/:farmerId — Submit advisory feedback */
const submitFeedback = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await sageService.submitFeedback(farmerId, req.body);
    return success(res, { message: 'Feedback submitted', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

module.exports = {
  getAdvisories,
  acknowledgeAdvisory,
  getAlerts,
  createCropObservation,
  saveSoilHealth,
  getSoilHealth,
  submitFeedback,
  getFeed,
  acknowledgeFeedAdvisory,
  runEngineForCycle,
  runEngineForFarmer,
  seedWeatherObservation,
  seedPestAlert,
  fetchImdNow,
  fetchGoogleForCycle,
  seedGoogleObservation,
};
