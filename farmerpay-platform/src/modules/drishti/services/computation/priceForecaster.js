/**
 * Price Forecaster
 *
 * Forecasts commodity prices using PULSE market data from the snapshot.
 * Pure function — no DB access.
 *
 * Methods:
 *  - Uses PULSE 30-day forecast when available (with confidence weighting)
 *  - Falls back to current price + seasonal trend adjustment
 *  - Supports MSP floor price enforcement
 *  - Applies user/MC price override factor
 */

// ─── Seasonal price indices by crop type (normalized: avg = 1.0) ────
// These represent typical Indian agricultural commodity price seasonality.
// Months 1-12. Index > 1.0 means price above annual average.
const SEASONAL_INDICES = {
  // Kharif crops: harvest Oct-Nov, prices lowest then, rise toward June
  kharif: [1.08, 1.12, 1.15, 1.10, 1.05, 1.02, 0.98, 0.95, 0.92, 0.88, 0.85, 0.90],
  // Rabi crops: harvest Mar-Apr, prices lowest then, rise toward Nov
  rabi:   [0.95, 0.92, 0.88, 0.85, 0.90, 0.95, 1.00, 1.05, 1.08, 1.12, 1.15, 1.10],
  // Dairy: relatively stable, slight dip in flush season (Oct-Feb)
  dairy:  [0.97, 0.96, 0.98, 1.00, 1.02, 1.04, 1.05, 1.04, 1.02, 0.99, 0.97, 0.96],
  // Fishery: prices rise in lean catch months
  fishery:[1.02, 0.98, 0.95, 0.92, 0.95, 1.00, 1.05, 1.08, 1.10, 1.05, 1.00, 0.95],
  // Default: flat
  default:[1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00],
};

/**
 * Forecast price for a commodity over a time horizon.
 *
 * @param {object} params
 * @param {string} params.commodityId
 * @param {object} params.snapshot       - DrishtiFarmerSnapshot data
 * @param {string} [params.season='kharif'] - For seasonal index selection
 * @param {string} [params.activityType='crop'] - 'crop' | 'dairy' | 'fishery'
 * @param {number} [params.horizonMonths=12]
 * @param {number} [params.priceFactor=1.0] - Override multiplier (MC sampling)
 * @param {number} [params.mspPrice=null]   - MSP floor price if applicable
 * @param {number} [params.sellingPriceOverride=null] - User-provided fixed price
 * @returns {{ monthlyPrices: Array, avgPrice: number, confidence: string }}
 */
const forecastPrice = ({
  commodityId,
  snapshot,
  season = 'kharif',
  activityType = 'crop',
  horizonMonths = 12,
  priceFactor = 1.0,
  mspPrice = null,
  sellingPriceOverride = null,
}) => {
  // If user provided a fixed price, use it for all months
  if (sellingPriceOverride && sellingPriceOverride > 0) {
    const fixedPrice = sellingPriceOverride * priceFactor;
    const monthlyPrices = buildMonthlyArray(horizonMonths, () => fixedPrice);
    return {
      monthlyPrices,
      avgPrice: fixedPrice,
      confidence: 'user_override',
      method: 'user_override',
    };
  }

  // Find PULSE data for this commodity in the snapshot
  const pulseData = (snapshot.relevant_commodity_prices || [])
    .find(p => p.commodityId === commodityId);

  const currentPrice = pulseData ? pulseData.currentPrice : null;
  const forecast30d = pulseData ? pulseData.forecast30dPrice : null;
  const forecastConfidence = pulseData ? pulseData.forecastConfidence : null;

  if (!currentPrice) {
    // No price data at all — return zeros
    return {
      monthlyPrices: buildMonthlyArray(horizonMonths, () => 0),
      avgPrice: 0,
      confidence: 'none',
      method: 'no_data',
    };
  }

  // Determine base annual price
  let basePrice = currentPrice;
  let method = 'current_price_seasonal';
  let confidence = 'low';

  // If PULSE forecast available, blend: 70% forecast, 30% current
  if (forecast30d && forecastConfidence && forecastConfidence > 30) {
    basePrice = forecast30d * 0.7 + currentPrice * 0.3;
    method = 'pulse_forecast_blend';
    confidence = forecastConfidence > 60 ? 'medium' : 'low';
  }

  // Apply MC / scenario price factor
  basePrice *= priceFactor;

  // Build month-by-month prices with seasonal adjustment
  const seasonalIndex = SEASONAL_INDICES[season] || SEASONAL_INDICES[activityType] || SEASONAL_INDICES.default;
  const now = new Date();
  const startMonth = now.getMonth(); // 0-indexed

  const monthlyPrices = buildMonthlyArray(horizonMonths, (i) => {
    const monthIdx = (startMonth + i) % 12;
    let price = basePrice * seasonalIndex[monthIdx];

    // Enforce MSP floor
    if (mspPrice && price < mspPrice) {
      price = mspPrice;
    }

    return Math.round(price * 100) / 100;
  });

  const avgPrice = monthlyPrices.reduce((s, p) => s + p, 0) / monthlyPrices.length;

  return {
    monthlyPrices,
    avgPrice: Math.round(avgPrice * 100) / 100,
    confidence,
    method,
    currentPrice,
    priceTrend: pulseData ? pulseData.priceTrend : null,
  };
};

/**
 * Get a single-point price estimate (for quick revenue calculation).
 */
const getSpotPrice = (commodityId, snapshot) => {
  const pulseData = (snapshot.relevant_commodity_prices || [])
    .find(p => p.commodityId === commodityId);
  return pulseData ? pulseData.currentPrice || 0 : 0;
};

// ─── Helpers ────────────────────────────────────────────────────────

const buildMonthlyArray = (months, valueFn) => {
  return Array.from({ length: months }, (_, i) => valueFn(i));
};

module.exports = {
  forecastPrice,
  getSpotPrice,
  SEASONAL_INDICES,
};
