/**
 * PULSE Forecast Service — Phase 3
 *
 * v1 model: SMA-SEASONAL-v1
 *   predicted_price = sma_21d * seasonal_multiplier(target_month) * trend_factor
 *   trend_factor    = 1 + clamp((sma_7d - sma_21d) / sma_21d, ±0.08)
 *
 * Confidence band:
 *   σ_recent           = std-dev of the last 21 daily returns
 *   forecast_price_min = predicted * (1 - σ_recent)
 *   forecast_price_max = predicted * (1 + σ_recent)
 *   forecast_confidence = max(40, 90 - σ_pct * 100)   // volatile → lower
 *   directional_confidence = % of last 7 days moving in the predicted direction
 *
 * Generates 3 horizons (7d, 15d, 30d) for every (commodity, mandi) pair
 * with at least 21 days of price history. Idempotent: deletes then
 * re-inserts forecasts for the same forecast_date so re-running the
 * cron is safe.
 *
 * NOT a sophisticated model — but it's transparent, deterministic, runs
 * in pure Node, and is good enough for v1 demo + farmer-app integration.
 * v2 (ARIMA / Prophet / XGBoost) is deferred to Phase 3.5.
 */

const crypto = require('crypto');
const logger = require('../../../shared/utils/logger');

let db = null;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

const MODEL_VERSION = 'SMA-SEASONAL-v1';
const HORIZONS = [7, 15, 30];
const MIN_HISTORY_DAYS = 21;

// Same monthly multipliers used by the mock fetcher in agmarknetClient,
// duplicated here so the forecast service has zero coupling to the data
// source. Calibrated against FAO / DGCIS seasonality reports.
const SEASONAL_MULTIPLIER = {
  Wheat:  [0.97, 0.98, 1.04, 1.05, 1.02, 1.00, 0.98, 0.95, 0.96, 0.99, 1.00, 0.98],
  Rice:   [0.99, 0.98, 0.97, 0.97, 0.98, 0.99, 1.00, 1.01, 1.02, 1.04, 1.05, 1.02],
  Tomato: [1.10, 1.05, 0.95, 0.85, 0.80, 0.85, 0.95, 1.05, 1.15, 1.20, 1.15, 1.10],
  Onion:  [0.95, 0.95, 0.90, 0.88, 0.92, 0.98, 1.05, 1.10, 1.15, 1.10, 1.05, 1.00],
  Cotton: [0.98, 0.97, 0.96, 0.97, 0.98, 0.99, 1.00, 1.01, 1.02, 1.04, 1.06, 1.05],
};

const FLAT = Array(12).fill(1);

// ─── Math helpers ───────────────────────────────────────────────────

const mean = (arr) => arr.reduce((s, x) => s + x, 0) / (arr.length || 1);
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

const stdDev = (arr) => {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const v = arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(v);
};

const dailyReturns = (prices) => {
  const out = [];
  for (let i = 1; i < prices.length; i += 1) {
    if (prices[i - 1] > 0) {
      out.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
  }
  return out;
};

const formatDate = (d) => {
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
};

const todayIso = () => formatDate(new Date());

const addDays = (dateStr, days) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDate(d);
};

const forecastUuidFor = (commodityId, mandiId, forecastDate, horizon) => {
  const h = crypto
    .createHash('sha1')
    .update(`forecast|${commodityId}|${mandiId}|${forecastDate}|${horizon}`)
    .digest('hex');
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    h.slice(12, 16),
    h.slice(16, 20),
    h.slice(20, 32),
  ].join('-');
};

// ─── Model ───────────────────────────────────────────────────────────

const computeForecast = ({ history, commodityName, forecastDate, horizonDays }) => {
  // history is an array of { record_date, modal_price } sorted ASC
  const prices = history.map((h) => Number(h.modal_price)).filter((p) => p > 0);
  if (prices.length < MIN_HISTORY_DAYS) return null;

  const last21 = prices.slice(-21);
  const last7 = prices.slice(-7);
  const sma21 = mean(last21);
  const sma7 = mean(last7);

  const trendFactor = 1 + clamp((sma7 - sma21) / sma21, -0.08, 0.08);

  const targetDate = addDays(forecastDate, horizonDays);
  const targetMonth = new Date(`${targetDate}T00:00:00Z`).getUTCMonth();
  const seasonalArr = SEASONAL_MULTIPLIER[commodityName] || FLAT;
  const seasonalMul = seasonalArr[targetMonth];
  // Re-base the seasonal multiplier so it's relative to the *current*
  // month — otherwise we double-count the seasonal effect already baked
  // into the recent SMA.
  const currentMonth = new Date(`${forecastDate}T00:00:00Z`).getUTCMonth();
  const currentSeasonal = seasonalArr[currentMonth];
  const relativeSeasonal = seasonalMul / (currentSeasonal || 1);

  const predicted = sma21 * relativeSeasonal * trendFactor;

  // Confidence band from recent volatility
  const returns = dailyReturns(last21);
  const sigma = stdDev(returns); // fraction (e.g. 0.025 = 2.5%)
  const sigmaScaled = sigma * Math.sqrt(horizonDays); // widen with horizon
  const minPrice = predicted * (1 - sigmaScaled);
  const maxPrice = predicted * (1 + sigmaScaled);

  const confidence = clamp(90 - sigma * 100 * 4, 40, 90);

  // Directional confidence: % of last 7 daily returns whose sign matches
  // the trend factor's sign. If trendFactor == 1 (flat) we land at 50%.
  const trendSign = trendFactor > 1 ? 1 : trendFactor < 1 ? -1 : 0;
  let aligned = 0;
  let counted = 0;
  const last7Returns = returns.slice(-7);
  for (const r of last7Returns) {
    if (r === 0) continue;
    counted += 1;
    if (Math.sign(r) === trendSign) aligned += 1;
  }
  const directional = counted > 0 ? (aligned / counted) * 100 : 50;

  // Risk score 1-100 — clamped
  const riskScore = Math.round(clamp(sigma * 100 * 20, 1, 100));

  return {
    forecast_date: forecastDate,
    horizon_days: horizonDays,
    predicted_price: Math.round(predicted * 100) / 100,
    forecast_price_min: Math.round(minPrice * 100) / 100,
    forecast_price_max: Math.round(maxPrice * 100) / 100,
    forecast_confidence: Math.round(confidence * 100) / 100,
    directional_confidence: Math.round(directional * 100) / 100,
    risk_score: riskScore,
    model_version: MODEL_VERSION,
    forecast_factors: {
      sma_21d: Math.round(sma21 * 100) / 100,
      sma_7d: Math.round(sma7 * 100) / 100,
      trend_factor: Math.round(trendFactor * 1000) / 1000,
      seasonal_multiplier: Math.round(relativeSeasonal * 1000) / 1000,
      sigma_recent: Math.round(sigma * 10000) / 10000,
    },
  };
};

// ─── Service entry points ───────────────────────────────────────────

const regenerateForPair = async ({ commodityId, commodityName, mandiId, forecastDate }) => {
  const { PulsePriceRecord, PulsePriceForecast } = getDb();
  const history = await PulsePriceRecord.findAll({
    where: {
      mandi_id: mandiId,
      commodity_id: commodityId,
      is_active: true,
    },
    attributes: ['record_date', 'modal_price'],
    order: [['record_date', 'ASC']],
    raw: true,
  });

  if (history.length < MIN_HISTORY_DAYS) {
    return { skipped: true, reason: `only ${history.length} days of history` };
  }

  // Wipe existing forecasts for this exact (commodity, mandi, forecast_date)
  // tuple so we don't accumulate stale rows. Each horizon gets its own row.
  await PulsePriceForecast.destroy({
    where: {
      commodity_id: commodityId,
      mandi_id: mandiId,
      forecast_date: forecastDate,
    },
  });

  const written = [];
  for (const horizon of HORIZONS) {
    const f = computeForecast({ history, commodityName, forecastDate, horizonDays: horizon });
    if (!f) continue;
    await PulsePriceForecast.create({
      forecast_uuid: forecastUuidFor(commodityId, mandiId, forecastDate, horizon),
      mandi_id: mandiId,
      commodity_id: commodityId,
      ...f,
      is_active: true,
    });
    written.push(horizon);
  }
  return { skipped: false, horizons: written };
};

/**
 * Regenerate forecasts for every (commodity, mandi) pair with enough
 * history. Called automatically after every successful ingest.
 */
const regenerateAll = async ({ forecastDate = todayIso() } = {}) => {
  const startedAt = Date.now();
  const { PulseCommodity, PulseMandi } = getDb();
  const [commodities, mandis] = await Promise.all([
    PulseCommodity.findAll({
      where: { is_active: true },
      attributes: ['commodity_id', 'commodity_name'],
      raw: true,
    }),
    PulseMandi.findAll({
      where: { is_active: true },
      attributes: ['id', 'mandi_name'],
      raw: true,
    }),
  ]);

  let total = 0;
  let skipped = 0;
  const errors = [];

  for (const c of commodities) {
    for (const m of mandis) {
      try {
        const r = await regenerateForPair({
          commodityId: c.commodity_id,
          commodityName: c.commodity_name,
          mandiId: m.id,
          forecastDate,
        });
        if (r.skipped) {
          skipped += 1;
        } else {
          total += r.horizons.length;
        }
      } catch (err) {
        errors.push(`${c.commodity_name}/${m.mandi_name}: ${err.message}`);
        logger.error(`[forecastService] pair failed: ${err.message}`, { stack: err.stack });
      }
    }
  }

  return {
    total,
    skipped,
    errors: errors.length,
    durationMs: Date.now() - startedAt,
    modelVersion: MODEL_VERSION,
  };
};

module.exports = {
  regenerateAll,
  regenerateForPair,
  // Exported for tests
  computeForecast,
  MODEL_VERSION,
};
