/**
 * Pulse Controller
 * Handles HTTP requests for commodities, mandis, prices, forecasts, MSP, alerts, and recommendations.
 */

const pulseService = require('../services/pulseService');
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

/** GET /pulse/commodities */
const getCommodities = async (req, res, next) => {
  try {
    const language = req.headers['x-language'] || 'en';
    const result = await pulseService.getCommodities(language);
    return success(res, { message: 'Commodities retrieved', data: result.commodities, meta: { total: result.total } });
  } catch (err) { next(err); }
};

/** GET /pulse/mandis */
const getMandis = async (req, res, next) => {
  try {
    const result = await pulseService.getMandis(req.query);
    return success(res, { message: 'Mandis retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /pulse/prices/latest */
const getLatestPrices = async (req, res, next) => {
  try {
    const result = await pulseService.getLatestPrices(
      req.query.commodityId,
      req.query.mandiId ? parseInt(req.query.mandiId, 10) : null,
      parseInt(req.query.days, 10) || 7
    );
    return success(res, { message: 'Latest prices retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /pulse/prices/chart */
const getPriceChart = async (req, res, next) => {
  try {
    const result = await pulseService.getPriceChart(
      req.query.commodityId,
      req.query.mandiId ? parseInt(req.query.mandiId, 10) : null,
      req.query.startDate,
      req.query.endDate
    );
    return success(res, { message: 'Price chart data retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /pulse/price-forecast/:commodityId */
const getPriceForecast = async (req, res, next) => {
  try {
    const result = await pulseService.getPriceForecast(
      req.params.commodityId,
      req.query.mandiId ? parseInt(req.query.mandiId, 10) : null,
      req.query.horizonDays ? parseInt(req.query.horizonDays, 10) : null
    );
    return success(res, { message: 'Price forecast retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /pulse/msp/:commodityId */
const getMsp = async (req, res, next) => {
  try {
    const result = await pulseService.getMsp(
      req.params.commodityId,
      req.query.season || null,
      req.query.year ? parseInt(req.query.year, 10) : null
    );
    return success(res, { message: 'MSP retrieved', data: result });
  } catch (err) { next(err); }
};

/** POST /pulse/farmer-price-alert */
const createFarmerPriceAlert = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await pulseService.createFarmerPriceAlert(farmerId, req.body);
    return success(res, { message: 'Price alert created', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

/** GET /pulse/sell-recommendations/:farmerId */
const getSellRecommendations = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await pulseService.getSellRecommendations(farmerId, req.query.cycleId || null);
    return success(res, { message: 'Sell recommendations retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /pulse/price-realisation/:farmerId — PULSE x DICE Bridge */
const getPriceRealisation = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const priceRealisationService = require('../services/priceRealisationService');
    const result = await priceRealisationService.calculateRealisation({
      farmerId,
      loanApplicationId: parseInt(req.query.loanApplicationId, 10),
      commodityId: req.query.commodityId,
      quantityQuintals: parseFloat(req.query.quantityQuintals) || 10,
      mandiId: parseInt(req.query.mandiId, 10)
    });
    return success(res, { message: 'Price realisation calculated', data: result });
  } catch (err) { next(err); }
};

// ─── Sell-Store Advisor (Dual Loan Engine) ──────────────────────────

/** POST /pulse/sell-store-advisor — Full 5-scenario analysis with dual loans */
const sellStoreAnalysis = async (req, res, next) => {
  try {
    const sellStoreAdvisorService = require('../services/sellStoreAdvisorService');
    const farmerId = req.user ? (await resolveUserId(req)) : null;
    const result = await sellStoreAdvisorService.calculateSellStoreAnalysis({
      farmerId,
      ...req.body,
    });
    return success(res, { message: 'Sell-store analysis calculated', data: result });
  } catch (err) { next(err); }
};

/** POST /pulse/cashflow-timeline — Cashflow events for a specific scenario */
const cashflowTimeline = async (req, res, next) => {
  try {
    const sellStoreAdvisorService = require('../services/sellStoreAdvisorService');
    const { scenarioKey, ...params } = req.body;
    const farmerId = req.user ? (await resolveUserId(req)) : null;
    const result = await sellStoreAdvisorService.buildCashflowTimeline(
      { farmerId, ...params },
      scenarioKey || 'd21'
    );
    return success(res, { message: 'Cashflow timeline built', data: result });
  } catch (err) { next(err); }
};

/** GET /pulse/sell-store-defaults/:farmerId — Smart defaults from DB */
const sellStoreDefaults = async (req, res, next) => {
  try {
    const sellStoreAdvisorService = require('../services/sellStoreAdvisorService');
    const farmerId = await resolveUserId(req);
    const result = await sellStoreAdvisorService.getSmartDefaults(
      farmerId,
      req.query.commodityId || null,
      req.query.mandiId ? parseInt(req.query.mandiId, 10) : null
    );
    return success(res, { message: 'Smart defaults retrieved', data: result });
  } catch (err) { next(err); }
};

/**
 * GET /pulse/sell-store-defaults-enriched/:farmerId
 *
 * Phase 1 — returns the legacy smart defaults PLUS the auto-pulled
 * cost-of-cultivation, harvest quantity, next EMI, and active cycle
 * context. Used by the new /sell-or-store farmer wizard so it opens
 * with everything pre-filled.
 *
 * Query: ?cycleId=N&commodityId=X&mandiId=Y  (all optional)
 *  - cycleId can be either the integer PK or the cycle_uuid; the
 *    service resolves both. When omitted, the most recent
 *    harvestable cycle is auto-picked.
 */
const sellStoreDefaultsEnriched = async (req, res, next) => {
  try {
    const sellStoreAdvisorService = require('../services/sellStoreAdvisorService');
    const farmerId = await resolveUserId(req);
    const result = await sellStoreAdvisorService.loadDefaultsFromROOTSAndDICE(
      farmerId,
      req.query.cycleId || null,
      req.query.commodityId || null,
      req.query.mandiId ? parseInt(req.query.mandiId, 10) : null,
    );
    return success(res, { message: 'Enriched defaults retrieved', data: result });
  } catch (err) { next(err); }
};

/**
 * POST /pulse/sell-store-recommendations
 *
 * Phase 1 — persists a sell-or-store recommendation row to
 * pulse_sell_recommendations after the farmer hits "I'll sell now"
 * or "I'll store for X days" on Step 6 of the wizard. The body
 * carries the full scenarios object + recommendation block returned
 * by /pulse/sell-store-advisor — no recomputation server-side.
 */
const saveSellRecommendation = async (req, res, next) => {
  try {
    const sellStoreAdvisorService = require('../services/sellStoreAdvisorService');
    const farmerId = await resolveUserId(req);
    const {
      cycleUuid, commodityId, scenarios, recommendation,
      linkedLoanApplicationId, loanOutstandingAtRecommendation,
    } = req.body || {};

    if (!commodityId || !scenarios || !recommendation) {
      const err = new Error('commodityId, scenarios, and recommendation are required');
      err.statusCode = 400;
      err.errorCode = 'VAL_001';
      throw err;
    }

    const row = await sellStoreAdvisorService.saveRecommendation({
      farmerId,
      cycleUuid,
      commodityId,
      scenarios,
      recommendation,
      linkedLoanApplicationId,
      loanOutstandingAtRecommendation,
    });

    return success(res, {
      message: 'Recommendation saved',
      data: { recommendationId: row.id, recommendationUuid: row.recommendation_uuid },
      statusCode: 201,
    });
  } catch (err) { next(err); }
};

/** GET /pulse/warehouse-presets — Warehouse type presets */
const warehousePresets = async (req, res, next) => {
  try {
    const sellStoreAdvisorService = require('../services/sellStoreAdvisorService');
    return success(res, { message: 'Warehouse presets', data: sellStoreAdvisorService.WAREHOUSE_PRESETS });
  } catch (err) { next(err); }
};

// ─── PULSE Phase 2 — Nudges + feedback ──────────────────────────

/**
 * GET /pulse/nudges/me
 *
 * Returns the active nudges for the current farmer, sorted by
 * severity. The farmer-app persona home renders the highest-severity
 * one as an amber banner directly under the welcome strip.
 */
const getNudges = async (req, res, next) => {
  try {
    const nudgeService = require('../services/nudgeService');
    const farmerId = await resolveUserId(req);
    const nudges = await nudgeService.getActiveNudges(farmerId);
    return success(res, { message: 'Nudges retrieved', data: nudges });
  } catch (err) { next(err); }
};

/**
 * POST /pulse/sell-recommendations/:recommendationId/feedback
 *
 * Body: { followed: boolean, actualPriceAchieved?: number, actualSaleDate?: string }
 *
 * Farmer reports back on whether they followed the system's
 * recommendation and what price they actually got. The data feeds
 * into Phase 3's forecast backtest accuracy tracking.
 */
const saveRecommendationFeedback = async (req, res, next) => {
  try {
    const nudgeService = require('../services/nudgeService');
    const farmerId = await resolveUserId(req);
    const recommendationId = parseInt(req.params.recommendationId, 10);
    const { followed, actualPriceAchieved, actualSaleDate } = req.body || {};

    const result = await nudgeService.saveFeedback(farmerId, recommendationId, {
      followed,
      actualPriceAchieved,
      actualSaleDate,
    });
    return success(res, { message: 'Feedback saved', data: result });
  } catch (err) { next(err); }
};

const getPersonalizedSellRecommendation = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const cycleId = parseInt(req.query.cycleId, 10);
    if (!cycleId) { const err = new Error('cycleId required'); err.statusCode = 400; throw err; }
    const rootsPulseService = require('../services/rootsPulseIntegrationService');
    const result = await rootsPulseService.getPersonalizedSellRecommendation(farmerId, cycleId);
    return success(res, { message: 'Personalized sell recommendation', data: result });
  } catch (err) { next(err); }
};

module.exports = {
  getCommodities, getMandis, getLatestPrices, getPriceChart,
  getPriceForecast, getMsp, createFarmerPriceAlert, getSellRecommendations,
  getPriceRealisation,
  sellStoreAnalysis, cashflowTimeline, sellStoreDefaults, warehousePresets,
  // Phase 1 additions for the /sell-or-store farmer wizard
  sellStoreDefaultsEnriched, saveSellRecommendation,
  // Phase 2 additions — nudges + feedback
  getNudges, saveRecommendationFeedback,
  // ROOTS × PULSE personalized recommendation
  getPersonalizedSellRecommendation,
};
