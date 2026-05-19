/**
 * DRISHTI Benchmark Service
 *
 * Manages district-level benchmark profiles:
 *  - Loads from DB with multi-level Redis caching
 *  - Provides lookup by district + activity + crop + season
 *  - Supports cache warming for nightly refresh jobs
 *  - Provides MSP reference prices
 *
 * Cache key structure (from design doc §8.1):
 *  drishti:benchmark:{district_id}:{season}:{activity_type}:{crop_id}
 *  drishti:msp:{commodity_id}:{season}
 *  drishti:pulse_forecast:{commodity_id}
 */

const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');
const { getKey, setWithTTL, deleteKeys } = require('../../../config/redis');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

const BENCHMARK_CACHE_TTL = 86400; // 24 hours
const MSP_CACHE_TTL = 86400;
const FORECAST_CACHE_TTL = 21600; // 6 hours

// ─── Primary Benchmark Retrieval ────────────────────────────────────

/**
 * Get all benchmarks for a district. Returns array of benchmark profiles.
 * Checks Redis first, falls through to DB.
 */
const getBenchmarks = async (districtId) => {
  const cacheKey = `drishti:benchmark:${districtId}`;

  try {
    const cached = await getKey(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (_) { /* cache miss */ }

  const { DrishtiBenchmarkProfile } = getDb();
  const benchmarks = await DrishtiBenchmarkProfile.findAll({
    where: { district_id: districtId, is_active: true },
    order: [['activity_type', 'ASC'], ['season', 'ASC']],
  });

  if (benchmarks.length > 0) {
    try {
      await setWithTTL(cacheKey, JSON.stringify(benchmarks), BENCHMARK_CACHE_TTL);
    } catch (_) { /* cache write failure is non-critical */ }
  }

  return benchmarks;
};

/**
 * Get a specific benchmark by district + activity + crop + season.
 * Uses granular cache keys for targeted lookups.
 */
const getBenchmark = async (districtId, activityType, cropId = null, season = null) => {
  const cacheKey = `drishti:benchmark:${districtId}:${season || 'any'}:${activityType}:${cropId || 'any'}`;

  try {
    const cached = await getKey(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (_) { /* cache miss */ }

  const { DrishtiBenchmarkProfile } = getDb();
  const where = { district_id: districtId, activity_type: activityType, is_active: true };
  if (cropId) where.crop_id = cropId;
  if (season) where.season = season;

  const benchmark = await DrishtiBenchmarkProfile.findOne({
    where,
    order: [['benchmark_date', 'DESC']],
  });

  if (benchmark) {
    try {
      await setWithTTL(cacheKey, JSON.stringify(benchmark), BENCHMARK_CACHE_TTL);
    } catch (_) { /* non-critical */ }
  }

  return benchmark;
};

// ─── MSP Reference Prices ───────────────────────────────────────────

/**
 * Get MSP (Minimum Support Price) for a commodity + season.
 */
const getMspPrice = async (commodityId, season = null) => {
  const cacheKey = `drishti:msp:${commodityId}:${season || 'latest'}`;

  try {
    const cached = await getKey(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (_) { /* cache miss */ }

  const { PulseMsp } = getDb();
  const where = { commodity_id: commodityId, is_active: true };
  if (season) where.msp_season = season;

  const msp = await PulseMsp.findOne({
    where,
    order: [['msp_year', 'DESC']],
  });

  if (msp) {
    const result = {
      commodityId,
      mspPrice: parseFloat(msp.msp_price) || 0,
      season: msp.msp_season,
      year: msp.msp_year,
      announcedDate: msp.msp_announced_date,
    };
    try {
      await setWithTTL(cacheKey, JSON.stringify(result), MSP_CACHE_TTL);
    } catch (_) { /* non-critical */ }
    return result;
  }

  return null;
};

// ─── Price Forecast (from PULSE cache) ──────────────────────────────

/**
 * Get latest price forecast for a commodity.
 */
const getPriceForecast = async (commodityId, horizonDays = 30) => {
  const cacheKey = `drishti:pulse_forecast:${commodityId}`;

  try {
    const cached = await getKey(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (_) { /* cache miss */ }

  const { PulsePriceForecast } = getDb();
  const forecast = await PulsePriceForecast.findOne({
    where: {
      commodity_id: commodityId,
      horizon_days: horizonDays,
      is_active: true,
    },
    order: [['forecast_date', 'DESC']],
  });

  if (forecast) {
    const result = {
      commodityId,
      forecastDate: forecast.forecast_date,
      horizonDays: forecast.horizon_days,
      predictedPrice: parseFloat(forecast.predicted_price) || 0,
      forecastMin: parseFloat(forecast.forecast_price_min) || 0,
      forecastMax: parseFloat(forecast.forecast_price_max) || 0,
      confidence: parseFloat(forecast.forecast_confidence) || 0,
    };
    try {
      await setWithTTL(cacheKey, JSON.stringify(result), FORECAST_CACHE_TTL);
    } catch (_) { /* non-critical */ }
    return result;
  }

  return null;
};

// ─── Latest Price Record ────────────────────────────────────────────

/**
 * Get latest market price for a commodity from PULSE.
 */
const getLatestPrice = async (commodityId) => {
  const { PulsePriceRecord } = getDb();
  const price = await PulsePriceRecord.findOne({
    where: { commodity_id: commodityId, is_active: true, quality_flag: 'clean' },
    order: [['record_date', 'DESC']],
  });

  if (price) {
    return {
      commodityId,
      modalPrice: parseFloat(price.modal_price) || 0,
      highestPrice: parseFloat(price.highest_price) || 0,
      lowestPrice: parseFloat(price.lowest_price) || 0,
      recordDate: price.record_date,
      priceTrend: price.price_trend,
    };
  }

  return null;
};

// ─── Cache Management ───────────────────────────────────────────────

/**
 * Invalidate all benchmark caches for a district.
 */
const invalidateBenchmarkCache = async (districtId) => {
  try {
    await deleteKeys([`drishti:benchmark:${districtId}`]);
    logger.info(`DRISHTI: benchmark cache invalidated for district ${districtId}`);
  } catch (_) { /* non-critical */ }
};

/**
 * Warm the benchmark cache for a district (called by nightly cron job).
 */
const warmBenchmarkCache = async (districtId) => {
  await invalidateBenchmarkCache(districtId);
  const benchmarks = await getBenchmarks(districtId);
  logger.info(`DRISHTI: warmed benchmark cache for district ${districtId} — ${benchmarks.length} profiles`);
  return benchmarks.length;
};

module.exports = {
  getBenchmarks,
  getBenchmark,
  getMspPrice,
  getPriceForecast,
  getLatestPrice,
  invalidateBenchmarkCache,
  warmBenchmarkCache,
};
