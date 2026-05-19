/**
 * Yield Projector
 *
 * Projects crop, dairy, and fishery yield from snapshot data + scenario params.
 * Pure function — no DB access. Works entirely on the snapshot object passed in.
 *
 * Crop yield: benchmark × irrigation adjustment × climate elasticity, blended
 * with farmer's personal history when available (60/40 split).
 *
 * Dairy yield: projects monthly milk output from animal count × breed average,
 * adjusted by feed quality factor.
 *
 * Fishery yield: projects harvest kg from pond area × stocking density ×
 * species-specific growth rate.
 */

// ─── Crop Yield ─────────────────────────────────────────────────────

/**
 * @param {object} params
 * @param {object} params.benchmark     - District benchmark from DrishtiBenchmarkProfile
 * @param {object} params.snapshot      - DrishtiFarmerSnapshot data
 * @param {string} params.cropId
 * @param {string} params.irrigationType - 'rainfed' | 'irrigated' | 'mixed'
 * @param {number} params.rainfallDeviationPct - % deviation from normal (-80 to +80)
 * @param {number} params.temperatureDeviationC - °C deviation from normal
 * @param {number} [params.yieldFactor=1.0]    - Override multiplier (MC sampling)
 * @returns {{ yieldKgPerHectare: number, confidence: string, method: string }}
 */
const projectCropYield = ({
  benchmark,
  snapshot,
  cropId,
  irrigationType = 'rainfed',
  rainfallDeviationPct = 0,
  temperatureDeviationC = 0,
  yieldFactor = 1.0,
}) => {
  if (!benchmark || !benchmark.avg_yield_kg_per_hectare) {
    return { yieldKgPerHectare: 0, confidence: 'none', method: 'no_benchmark' };
  }

  // Step 1: Base yield from district + crop benchmark
  let baseYield = parseFloat(benchmark.avg_yield_kg_per_hectare);

  // Step 2: Irrigation adjustment — rainfed typically 15% below irrigated baseline
  const irrigationFactors = { rainfed: 0.85, irrigated: 1.0, mixed: 0.92 };
  baseYield *= irrigationFactors[irrigationType] || 0.85;

  // Step 3: Climate adjustment using elasticity coefficients
  // Elasticity convention: stored as negative (e.g., -0.5) meaning
  // "10% less rain → 5% less yield". We use absolute value so that
  // negative rainfall deviation always reduces yield.
  const rainfallElasticity = Math.abs(parseFloat(benchmark.yield_rainfall_elasticity) || 0.5);
  const tempSensitivity = Math.abs(parseFloat(benchmark.yield_temperature_sensitivity) || 0.3);

  // Less rain → less yield; more heat → less yield
  const rainfallImpactPct = rainfallDeviationPct * rainfallElasticity;
  const temperatureImpactPct = -temperatureDeviationC * tempSensitivity * 10; // warming hurts

  const climateFactor = 1 + (rainfallImpactPct + temperatureImpactPct) / 100;
  const climateAdjustedYield = baseYield * Math.max(climateFactor, 0.1); // floor at 10%

  // Step 4: Apply external yield factor (for MC sampling or user override)
  let projectedYield = climateAdjustedYield * yieldFactor;

  // Step 5: Blend with farmer's personal history if available
  let method = 'benchmark_only';
  let confidence = 'low';

  const history = (snapshot.historical_crop_profitability || [])
    .filter(h => h.cropId === cropId && h.actualProfit !== undefined);

  if (history.length >= 2) {
    // Derive per-hectare yield proxy from profit history
    // (actual implementations would have yield_per_hectare; using profit as proxy)
    const personalAvg = history.reduce((sum, h) => sum + (h.actualProfit || 0), 0) / history.length;
    if (personalAvg > 0 && benchmark.avg_profit_per_hectare > 0) {
      const personalYieldRatio = personalAvg / parseFloat(benchmark.avg_profit_per_hectare);
      const personalYield = baseYield * personalYieldRatio * yieldFactor;
      // 60% personal, 40% benchmark (per design doc)
      projectedYield = personalYield * 0.6 + projectedYield * 0.4;
      method = 'blended_personal_benchmark';
      confidence = 'medium';
    }
  }

  if (history.length >= 4) confidence = 'high';

  return {
    yieldKgPerHectare: Math.round(Math.max(projectedYield, 0) * 100) / 100,
    confidence,
    method,
    climateFactor: Math.round(climateFactor * 1000) / 1000,
  };
};

// ─── Dairy Yield ────────────────────────────────────────────────────

/**
 * @param {object} params
 * @param {object} params.snapshot        - DrishtiFarmerSnapshot data
 * @param {object} [params.benchmark]     - District dairy benchmark
 * @param {number} [params.animalCount]   - Override animal count
 * @param {number} [params.avgDailyMilkLiters] - Override daily milk per animal
 * @param {string} [params.feedQuality='standard'] - 'basic' | 'standard' | 'premium'
 * @returns {{ monthlyMilkLiters: number, annualMilkLiters: number, confidence: string }}
 */
const projectDairyYield = ({
  snapshot,
  benchmark = null,
  animalCount = null,
  avgDailyMilkLiters = null,
  feedQuality = 'standard',
}) => {
  const dairyProfile = snapshot.active_dairy_profile;
  const animals = animalCount || (dairyProfile ? dairyProfile.animalCount : 0);

  if (animals <= 0) {
    return { monthlyMilkLiters: 0, annualMilkLiters: 0, confidence: 'none' };
  }

  // Base daily yield per animal
  let dailyPerAnimal = avgDailyMilkLiters;
  if (!dailyPerAnimal && benchmark) {
    dailyPerAnimal = parseFloat(benchmark.avg_milk_yield_per_animal) || 6;
  }
  if (!dailyPerAnimal) dailyPerAnimal = 6; // conservative default

  // Feed quality multiplier
  const feedFactors = { basic: 0.8, standard: 1.0, premium: 1.15 };
  dailyPerAnimal *= feedFactors[feedQuality] || 1.0;

  const monthlyMilk = Math.round(animals * dailyPerAnimal * 30 * 100) / 100;

  return {
    monthlyMilkLiters: monthlyMilk,
    annualMilkLiters: Math.round(monthlyMilk * 12 * 100) / 100,
    dailyPerAnimal: Math.round(dailyPerAnimal * 100) / 100,
    animalCount: animals,
    confidence: dairyProfile ? 'medium' : 'low',
  };
};

// ─── Fishery Yield ──────────────────────────────────────────────────

/**
 * @param {object} params
 * @param {object} params.snapshot
 * @param {object} [params.benchmark]       - District fishery benchmark
 * @param {number} [params.pondAreaHectares]
 * @param {string} [params.stockingDensity='standard'] - 'low' | 'standard' | 'high'
 * @param {number} [params.cycleMonths=8]
 * @returns {{ harvestKg: number, annualHarvestKg: number, confidence: string }}
 */
const projectFisheryYield = ({
  snapshot,
  benchmark = null,
  pondAreaHectares = null,
  stockingDensity = 'standard',
  cycleMonths = 8,
}) => {
  const fishProfile = snapshot.active_fishery_profile;
  const area = pondAreaHectares || (fishProfile ? fishProfile.totalPondAreaHectares : 0);

  if (area <= 0) {
    return { harvestKg: 0, annualHarvestKg: 0, confidence: 'none' };
  }

  // Base yield per hectare per cycle from benchmark
  let baseYieldPerHectare = 3000; // conservative default kg/hectare/cycle
  if (benchmark && benchmark.avg_yield_kg_per_hectare_pond) {
    baseYieldPerHectare = parseFloat(benchmark.avg_yield_kg_per_hectare_pond);
  }

  // Stocking density multiplier
  const densityFactors = { low: 0.7, standard: 1.0, high: 1.25 };
  baseYieldPerHectare *= densityFactors[stockingDensity] || 1.0;

  const harvestKg = Math.round(area * baseYieldPerHectare * 100) / 100;
  const cyclesPerYear = 12 / cycleMonths;

  return {
    harvestKg,
    annualHarvestKg: Math.round(harvestKg * cyclesPerYear * 100) / 100,
    pondAreaHectares: area,
    cycleMonths,
    confidence: fishProfile ? 'medium' : 'low',
  };
};

module.exports = {
  projectCropYield,
  projectDairyYield,
  projectFisheryYield,
};
