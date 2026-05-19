/**
 * Revenue Calculator
 *
 * Combines yield projections × price forecasts to estimate gross revenue
 * per activity. Pure function — no DB access.
 *
 * Crop revenue:  yield_kg/ha × acreage × price/kg, distributed to harvest months
 * Dairy revenue: monthly_liters × price/liter, spread evenly with seasonal adj.
 * Fishery revenue: harvest_kg × price/kg, concentrated at harvest month
 */

const { projectCropYield, projectDairyYield, projectFisheryYield } = require('./yieldProjector');
const { forecastPrice } = require('./priceForecaster');

// ─── Crop Revenue ───────────────────────────────────────────────────

/**
 * @param {object} params
 * @param {object} params.snapshot
 * @param {object} params.benchmark       - District crop benchmark
 * @param {string} params.cropId
 * @param {number} params.acreageHectares
 * @param {string} params.season          - 'kharif' | 'rabi' | 'summer'
 * @param {string} [params.irrigationType='rainfed']
 * @param {number} [params.rainfallDeviationPct=0]
 * @param {number} [params.temperatureDeviationC=0]
 * @param {number} [params.yieldFactor=1.0]
 * @param {number} [params.priceFactor=1.0]
 * @param {number} [params.sellingPriceOverride=null]
 * @param {number} [params.mspPrice=null]
 * @param {number} [params.harvestMonthOffset=5] - Months after sowing when harvest happens
 * @returns {{ totalRevenue, yieldProjection, priceProjection, monthlyRevenue }}
 */
const calculateCropRevenue = ({
  snapshot,
  benchmark,
  cropId,
  acreageHectares,
  season = 'kharif',
  irrigationType = 'rainfed',
  rainfallDeviationPct = 0,
  temperatureDeviationC = 0,
  yieldFactor = 1.0,
  priceFactor = 1.0,
  sellingPriceOverride = null,
  mspPrice = null,
  harvestMonthOffset = 5,
}) => {
  // Step 1: Project yield
  const yieldProjection = projectCropYield({
    benchmark, snapshot, cropId, irrigationType,
    rainfallDeviationPct, temperatureDeviationC, yieldFactor,
  });

  // Step 2: Forecast price
  const priceProjection = forecastPrice({
    commodityId: cropId, snapshot, season, activityType: 'crop',
    horizonMonths: 12, priceFactor, mspPrice, sellingPriceOverride,
  });

  // Step 3: Calculate total yield
  const totalYieldKg = yieldProjection.yieldKgPerHectare * acreageHectares;

  // Step 4: Revenue at harvest-time price
  const harvestMonthIdx = harvestMonthOffset % 12;
  const harvestPrice = priceProjection.monthlyPrices[harvestMonthIdx] || priceProjection.avgPrice;
  const totalRevenue = Math.round(totalYieldKg * harvestPrice * 100) / 100;

  // Step 5: Monthly revenue distribution — bulk at harvest, some staggered sale
  const monthlyRevenue = new Array(12).fill(0);
  // 70% sold at harvest, 20% next month, 10% month after
  monthlyRevenue[harvestMonthIdx] = totalRevenue * 0.70;
  monthlyRevenue[(harvestMonthIdx + 1) % 12] = totalRevenue * 0.20;
  monthlyRevenue[(harvestMonthIdx + 2) % 12] = totalRevenue * 0.10;

  for (let i = 0; i < 12; i++) {
    monthlyRevenue[i] = Math.round(monthlyRevenue[i] * 100) / 100;
  }

  return {
    totalRevenue,
    totalYieldKg: Math.round(totalYieldKg * 100) / 100,
    pricePerKg: harvestPrice,
    yieldProjection,
    priceProjection,
    monthlyRevenue,
  };
};

// ─── Dairy Revenue ──────────────────────────────────────────────────

/**
 * @param {object} params
 * @param {object} params.snapshot
 * @param {object} [params.benchmark]
 * @param {number} [params.animalCount]
 * @param {number} [params.avgDailyMilkLiters]
 * @param {string} [params.feedQuality='standard']
 * @param {number} [params.milkPricePerLiter] - If null, uses benchmark or default
 * @returns {{ monthlyRevenue, annualRevenue, yieldProjection, monthlyRevenueArray }}
 */
const calculateDairyRevenue = ({
  snapshot,
  benchmark = null,
  animalCount = null,
  avgDailyMilkLiters = null,
  feedQuality = 'standard',
  milkPricePerLiter = null,
}) => {
  const yieldProjection = projectDairyYield({
    snapshot, benchmark, animalCount, avgDailyMilkLiters, feedQuality,
  });

  // Milk price: user override → benchmark → default
  let pricePerLiter = milkPricePerLiter;
  if (!pricePerLiter && benchmark && benchmark.avg_monthly_revenue_per_animal) {
    const avgRevenue = parseFloat(benchmark.avg_monthly_revenue_per_animal);
    const avgYield = parseFloat(benchmark.avg_milk_yield_per_animal) || 6;
    pricePerLiter = avgRevenue / (avgYield * 30);
  }
  if (!pricePerLiter) pricePerLiter = 35; // default INR/liter

  const monthlyRevenue = Math.round(yieldProjection.monthlyMilkLiters * pricePerLiter * 100) / 100;

  // Seasonal variation — flush season (Oct-Feb) has more volume but lower price
  const seasonalFactors = [0.97, 0.96, 0.98, 1.00, 1.02, 1.04, 1.05, 1.04, 1.02, 0.99, 0.97, 0.96];
  const monthlyRevenueArray = seasonalFactors.map(f => Math.round(monthlyRevenue * f * 100) / 100);

  return {
    monthlyRevenue,
    annualRevenue: Math.round(monthlyRevenue * 12 * 100) / 100,
    pricePerLiter: Math.round(pricePerLiter * 100) / 100,
    yieldProjection,
    monthlyRevenueArray,
  };
};

// ─── Fishery Revenue ────────────────────────────────────────────────

/**
 * @param {object} params
 * @param {object} params.snapshot
 * @param {object} [params.benchmark]
 * @param {number} [params.pondAreaHectares]
 * @param {string} [params.stockingDensity='standard']
 * @param {number} [params.cycleMonths=8]
 * @param {number} [params.fishPricePerKg]
 * @returns {{ cycleRevenue, annualRevenue, yieldProjection, monthlyRevenueArray }}
 */
const calculateFisheryRevenue = ({
  snapshot,
  benchmark = null,
  pondAreaHectares = null,
  stockingDensity = 'standard',
  cycleMonths = 8,
  fishPricePerKg = null,
}) => {
  const yieldProjection = projectFisheryYield({
    snapshot, benchmark, pondAreaHectares, stockingDensity, cycleMonths,
  });

  // Fish price: user → benchmark-derived → default
  let pricePerKg = fishPricePerKg;
  if (!pricePerKg && benchmark) {
    const avgRevenue = parseFloat(benchmark.avg_revenue_per_hectare_pond) || 0;
    const avgYield = parseFloat(benchmark.avg_yield_kg_per_hectare_pond) || 1;
    if (avgRevenue > 0 && avgYield > 0) pricePerKg = avgRevenue / avgYield;
  }
  if (!pricePerKg) pricePerKg = 120; // default INR/kg

  const cycleRevenue = Math.round(yieldProjection.harvestKg * pricePerKg * 100) / 100;

  // Revenue arrives at harvest month — concentrated at end of cycle
  const monthlyRevenueArray = new Array(12).fill(0);
  const harvestMonth = Math.min(cycleMonths - 1, 11);
  monthlyRevenueArray[harvestMonth] = cycleRevenue;

  const cyclesPerYear = 12 / cycleMonths;
  const annualRevenue = Math.round(cycleRevenue * cyclesPerYear * 100) / 100;

  return {
    cycleRevenue,
    annualRevenue,
    pricePerKg: Math.round(pricePerKg * 100) / 100,
    yieldProjection,
    monthlyRevenueArray,
  };
};

module.exports = {
  calculateCropRevenue,
  calculateDairyRevenue,
  calculateFisheryRevenue,
};
