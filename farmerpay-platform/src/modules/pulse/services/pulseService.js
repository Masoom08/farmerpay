/**
 * Pulse Service
 * Business logic for market prices, mandis, forecasts, MSP, alerts, and recommendations.
 * Enriched with PULSE Blueprint fields and DICE integration.
 */

const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

/**
 * Lists commodities with optional language translations.
 * Response includes Blueprint enrichment: volatilityClass, perishabilityIndex.
 */
const getCommodities = async (language) => {
  const { PulseCommodity, PulseCommodityTranslation } = getDb();

  const include = [];
  if (language && language !== 'en') {
    include.push({
      model: PulseCommodityTranslation,
      as: 'translations',
      where: { language_code: language, is_active: true },
      required: false,
    });
  }

  const commodities = await PulseCommodity.findAll({
    where: { is_active: true },
    include,
    order: [['commodity_name', 'ASC']],
  });

  return {
    commodities: commodities.map((c) => {
      const translated = c.translations && c.translations.length > 0
        ? c.translations[0].commodity_name_translated
        : null;
      return {
        commodityId: c.commodity_id,
        commodityCode: c.commodity_code,
        commodityName: translated || c.commodity_name,
        type: c.commodity_type,
        unit: c.unit_of_measurement,
        // Blueprint enrichment fields
        volatilityClass: c.volatility_class,
        perishabilityIndex: c.perishability_index,
        storageFactor: c.storage_factor ? parseFloat(c.storage_factor) : null,
        mspApplicable: c.msp_applicable,
        shelfLifeDays: c.shelf_life_days,
        coldChainDependency: c.cold_chain_dependency,
      };
    }),
    total: commodities.length,
  };
};

/**
 * Lists mandis with optional state/district filtering.
 * Response includes Blueprint enrichment: coldStorageProximity, priceDiscoveryRank.
 */
const getMandis = async (filters = {}) => {
  const { PulseMandi, LgdState, LgdDistrict } = getDb();

  const where = { is_active: true };
  if (filters.stateId) where.mandi_state_id = filters.stateId;
  if (filters.districtId) where.mandi_district_id = filters.districtId;

  const mandis = await PulseMandi.findAll({
    where,
    include: [
      { model: LgdState, as: 'state', attributes: ['id', 'state_name'] },
      { model: LgdDistrict, as: 'district', attributes: ['id', 'district_name'] },
    ],
    order: [['mandi_name', 'ASC']],
  });

  return mandis.map((m) => ({
    mandiId: m.id,
    mandiName: m.mandi_name,
    mandiCode: m.mandi_code,
    location: {
      state: m.state ? m.state.state_name : null,
      district: m.district ? m.district.district_name : null,
      latitude: m.mandi_latitude,
      longitude: m.mandi_longitude,
    },
    regulatedBy: m.mandi_regulated_by,
    // Blueprint enrichment fields
    mandiType: m.mandi_type,
    coldStorageProximity: m.cold_storage_proximity_km ? parseFloat(m.cold_storage_proximity_km) : null,
    priceDiscoveryRank: m.price_discovery_rank,
    densityScore: m.density_score ? parseFloat(m.density_score) : null,
    transportCostIndex: m.transport_cost_index ? parseFloat(m.transport_cost_index) : null,
    fpoAggregation: m.fpo_aggregation_flag,
  }));
};

/**
 * Gets latest price records for a commodity, optionally at a specific mandi.
 * Response includes Blueprint enrichment: modalPrice, qualityFlag, policyRegime.
 */
const getLatestPrices = async (commodityId, mandiId, days) => {
  const { PulsePriceRecord } = getDb();

  const where = { commodity_id: commodityId, is_active: true };
  if (mandiId) where.mandi_id = mandiId;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (days || 7));
  where.record_date = { [Op.gte]: startDate };

  const records = await PulsePriceRecord.findAll({
    where,
    order: [['record_date', 'DESC']],
  });

  return records.map((r) => ({
    date: r.record_date,
    modalPrice: r.modal_price ? parseFloat(r.modal_price) : null,
    openPrice: r.opening_price ? parseFloat(r.opening_price) : null,
    closePrice: r.closing_price ? parseFloat(r.closing_price) : null,
    highPrice: r.highest_price ? parseFloat(r.highest_price) : null,
    lowPrice: r.lowest_price ? parseFloat(r.lowest_price) : null,
    trend: r.price_trend,
    volumeTraded: r.quantity_traded_quintals,
    // Blueprint enrichment fields
    qualityFlag: r.quality_flag,
    arrivalsTonnes: r.arrivals_tonnes ? parseFloat(r.arrivals_tonnes) : null,
    futuresBasis: r.futures_basis ? parseFloat(r.futures_basis) : null,
    policyRegime: r.policy_regime,
  }));
};

/**
 * Gets price chart data for a date range with trend, volatility, and MSP.
 */
const getPriceChart = async (commodityId, mandiId, startDate, endDate) => {
  const { PulsePriceRecord, PulseMsp } = getDb();

  const where = {
    commodity_id: commodityId,
    record_date: { [Op.between]: [startDate, endDate] },
    is_active: true,
  };
  if (mandiId) where.mandi_id = mandiId;

  const records = await PulsePriceRecord.findAll({
    where,
    order: [['record_date', 'ASC']],
  });

  // Use modal_price as primary, fallback to closing_price
  const prices = records.map((r) => parseFloat(r.modal_price || r.closing_price || 0)).filter(Boolean);
  const avgPrice = prices.length > 0 ? (prices.reduce((s, p) => s + p, 0) / prices.length).toFixed(2) : null;

  let trend = 'stable';
  if (prices.length >= 2) {
    const first = prices[0];
    const last = prices[prices.length - 1];
    if (last > first * 1.05) trend = 'rising';
    else if (last < first * 0.95) trend = 'falling';
  }

  const volatility = prices.length >= 2
    ? (Math.max(...prices) - Math.min(...prices)).toFixed(2)
    : null;

  // Fetch MSP for this commodity
  const msp = await PulseMsp.findOne({
    where: { commodity_id: commodityId, is_active: true },
    order: [['msp_year', 'DESC']],
  });

  return {
    prices: records.map((r) => ({
      date: r.record_date,
      modalPrice: r.modal_price ? parseFloat(r.modal_price) : null,
      closePrice: r.closing_price ? parseFloat(r.closing_price) : null,
      highPrice: r.highest_price ? parseFloat(r.highest_price) : null,
      lowPrice: r.lowest_price ? parseFloat(r.lowest_price) : null,
    })),
    trend,
    volatility,
    averagePrice: avgPrice,
    mspPrice: msp ? parseFloat(msp.msp_price) : null,
  };
};

/**
 * Gets price forecast for a commodity with Blueprint enrichment.
 * Supports mandiId and horizonDays filtering.
 */
const getPriceForecast = async (commodityId, mandiId, horizonDays) => {
  const { PulsePriceForecast } = getDb();

  const where = { commodity_id: commodityId, is_active: true };
  if (mandiId) where.mandi_id = mandiId;
  if (horizonDays) where.horizon_days = horizonDays;

  const forecast = await PulsePriceForecast.findOne({
    where,
    order: [['forecast_date', 'DESC']],
  });

  if (!forecast) return null;

  return {
    forecastDate: forecast.forecast_date,
    horizonDays: forecast.horizon_days,
    predictedPrice: forecast.predicted_price ? parseFloat(forecast.predicted_price) : null,
    forecastPriceMin: forecast.forecast_price_min ? parseFloat(forecast.forecast_price_min) : null,
    forecastPriceMax: forecast.forecast_price_max ? parseFloat(forecast.forecast_price_max) : null,
    confidence: forecast.forecast_confidence ? parseFloat(forecast.forecast_confidence) : null,
    // Blueprint enrichment fields
    riskScore: forecast.risk_score,
    directionalConfidence: forecast.directional_confidence ? parseFloat(forecast.directional_confidence) : null,
    factors: forecast.forecast_factors,
    modelVersion: forecast.model_version,
  };
};

/**
 * Gets MSP for a commodity with optional season/year filtering.
 */
const getMsp = async (commodityId, season, year) => {
  const { PulseMsp } = getDb();

  const where = { commodity_id: commodityId, is_active: true };
  if (season) where.msp_season = season;
  if (year) where.msp_year = year;

  const msp = await PulseMsp.findOne({
    where,
    order: [['msp_year', 'DESC'], ['msp_announced_date', 'DESC']],
  });

  if (!msp) return null;

  return {
    mspPrice: msp.msp_price ? parseFloat(msp.msp_price) : null,
    season: msp.msp_season,
    year: msp.msp_year,
    announcedDate: msp.msp_announced_date,
  };
};

/**
 * Creates a farmer price alert for a commodity.
 */
const createFarmerPriceAlert = async (farmerId, data) => {
  const { PulseFarmerPriceAlert } = getDb();

  const alert = await PulseFarmerPriceAlert.create({
    alert_uuid: uuidv4(),
    farmer_id: farmerId,
    commodity_id: data.commodityId,
    target_price: data.targetPrice,
    alert_type: data.alertType,
  });

  logger.info(`Price alert created for farmer ${farmerId}: ${data.alertType} at ${data.targetPrice}`);
  return { alertId: alert.id, status: 'active' };
};

/**
 * Gets sell recommendations for a farmer, optionally filtered by cycle.
 * Response includes DICE integration fields per spec Section 3.1.
 */
const getSellRecommendations = async (farmerId, cycleId) => {
  const { PulseSellRecommendation, PulseCommodity } = getDb();

  const where = { farmer_id: farmerId, is_active: true };
  if (cycleId) where.cycle_id = cycleId;

  const recommendations = await PulseSellRecommendation.findAll({
    where,
    include: [
      { model: PulseCommodity, as: 'commodity', attributes: ['commodity_name', 'commodity_code', 'commodity_type'] },
    ],
    order: [['recommendation_generated_date', 'DESC']],
  });

  return recommendations.map((r) => ({
    recommendationId: r.id,
    commodity: r.commodity ? r.commodity.commodity_name : null,
    commodityCode: r.commodity ? r.commodity.commodity_code : null,
    recommendedTiming: r.recommended_timing,
    recommendedPrice: r.recommended_price ? parseFloat(r.recommended_price) : null,
    rationale: r.rationale,
    mandiOptions: r.mandi_recommendations,
    generatedDate: r.recommendation_generated_date,
    followed: r.farmer_followed_recommendation,
    actualPrice: r.actual_price_achieved ? parseFloat(r.actual_price_achieved) : null,
    // DICE integration fields
    loanOutstanding: r.loan_outstanding_at_recommendation ? parseFloat(r.loan_outstanding_at_recommendation) : null,
    sellNowRealisation: r.sell_now_realisation ? parseFloat(r.sell_now_realisation) : null,
    store15dRealisation: r.store_15d_realisation ? parseFloat(r.store_15d_realisation) : null,
    store30dRealisation: r.store_30d_realisation ? parseFloat(r.store_30d_realisation) : null,
    optimalStrategy: r.optimal_strategy,
    topupEligible: r.topup_loan_eligible,
    topupMaxAmount: r.topup_loan_max_amount ? parseFloat(r.topup_loan_max_amount) : null,
  }));
};

module.exports = {
  getCommodities,
  getMandis,
  getLatestPrices,
  getPriceChart,
  getPriceForecast,
  getMsp,
  createFarmerPriceAlert,
  getSellRecommendations,
};
