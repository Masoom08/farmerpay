/**
 * Benchmark Comparer
 *
 * Compares a farmer's actual or projected metrics against district/crop/activity
 * benchmarks from drishti_benchmark_profiles.
 *
 * Pure function — no DB access. Works on pre-loaded benchmark data.
 *
 * Produces:
 *  - Percentile ranking (where does this farmer fall relative to district peers?)
 *  - Above/below/at benchmark classification per metric
 *  - Variance from benchmark with severity rating
 *  - Composite benchmark score (0-100)
 */

// ─── Comparison Thresholds ──────────────────────────────────────────

const VARIANCE_BANDS = {
  excellent: 1.20,   // ≥ 120% of benchmark
  good: 1.05,        // 105-120%
  average: 0.90,     // 90-105%
  below_average: 0.75, // 75-90%
  poor: 0.0,         // < 75%
};

// ─── Main Comparer ──────────────────────────────────────────────────

/**
 * Compare a farmer's metrics against the relevant benchmark.
 *
 * @param {object} params
 * @param {object} params.farmerMetrics   - { yieldKgPerHa, costPerHa, revenuePerHa, profitPerHa, ... }
 * @param {object} params.benchmark       - DrishtiBenchmarkProfile row (plain object)
 * @param {string} params.activityType    - 'crop' | 'dairy' | 'fishery'
 * @returns {{ comparisons: Array, compositeScore: number, compositeRating: string, summary: string }}
 */
const compareToBenchmark = ({ farmerMetrics, benchmark, activityType = 'crop' }) => {
  if (!benchmark) {
    return {
      comparisons: [],
      compositeScore: 50,
      compositeRating: 'no_benchmark',
      summary: 'No benchmark data available for comparison',
    };
  }

  const comparisons = [];

  if (activityType === 'crop') {
    comparisons.push(...compareCropMetrics(farmerMetrics, benchmark));
  } else if (activityType === 'dairy') {
    comparisons.push(...compareDairyMetrics(farmerMetrics, benchmark));
  } else if (activityType === 'fishery') {
    comparisons.push(...compareFisheryMetrics(farmerMetrics, benchmark));
  }

  // Composite score: weighted average of individual metric scores
  const validComparisons = comparisons.filter(c => c.score !== null);
  const compositeScore = validComparisons.length > 0
    ? Math.round(validComparisons.reduce((s, c) => s + c.score * c.weight, 0) / validComparisons.reduce((s, c) => s + c.weight, 0))
    : 50;

  const compositeRating = classifyComposite(compositeScore);
  const summary = buildSummary(comparisons, compositeRating);

  return { comparisons, compositeScore, compositeRating, summary };
};

/**
 * Compare a farmer's price realization against market benchmarks.
 *
 * @param {object} params
 * @param {number} params.farmerPrice       - Price farmer received/expects per unit
 * @param {number} params.benchmarkPrice    - District average market price
 * @param {number} params.mspPrice          - Minimum Support Price (if applicable)
 * @param {string} params.commodityId
 * @returns {{ priceComparison: object }}
 */
const comparePriceToMarket = ({ farmerPrice, benchmarkPrice, mspPrice = null, commodityId }) => {
  if (!benchmarkPrice || benchmarkPrice <= 0) {
    return {
      farmer_price: farmerPrice,
      benchmark_price: null,
      variance_pct: null,
      rating: 'no_data',
    };
  }

  const variancePct = round2(((farmerPrice - benchmarkPrice) / benchmarkPrice) * 100);
  const ratio = farmerPrice / benchmarkPrice;

  let rating;
  if (ratio >= VARIANCE_BANDS.excellent) rating = 'excellent';
  else if (ratio >= VARIANCE_BANDS.good) rating = 'good';
  else if (ratio >= VARIANCE_BANDS.average) rating = 'average';
  else if (ratio >= VARIANCE_BANDS.below_average) rating = 'below_average';
  else rating = 'poor';

  const result = {
    farmer_price: farmerPrice,
    benchmark_price: benchmarkPrice,
    variance_pct: variancePct,
    ratio: round2(ratio),
    rating,
  };

  // MSP comparison if available
  if (mspPrice && mspPrice > 0) {
    result.msp_price = mspPrice;
    result.above_msp = farmerPrice >= mspPrice;
    result.msp_premium_pct = round2(((farmerPrice - mspPrice) / mspPrice) * 100);
  }

  return result;
};

/**
 * Rank a farmer's yield within the district distribution.
 * Uses a simple percentile estimation assuming normal distribution.
 *
 * @param {number} farmerYield
 * @param {number} benchmarkAvg    - District average
 * @param {number} [stddevEstimate] - If unknown, assume 25% of mean
 * @returns {{ percentile: number, rating: string }}
 */
const estimatePercentileRank = (farmerYield, benchmarkAvg, stddevEstimate = null) => {
  if (!benchmarkAvg || benchmarkAvg <= 0) {
    return { percentile: 50, rating: 'unknown' };
  }

  const stddev = stddevEstimate || benchmarkAvg * 0.25;
  if (stddev <= 0) return { percentile: 50, rating: 'unknown' };

  // Z-score
  const z = (farmerYield - benchmarkAvg) / stddev;

  // Approximate CDF using Abramowitz & Stegun formula
  const percentile = Math.round(normalCDF(z) * 100);
  const clamped = Math.max(1, Math.min(99, percentile));

  let rating;
  if (clamped >= 80) rating = 'top_performer';
  else if (clamped >= 60) rating = 'above_average';
  else if (clamped >= 40) rating = 'average';
  else if (clamped >= 20) rating = 'below_average';
  else rating = 'needs_improvement';

  return { percentile: clamped, rating };
};

// ─── Activity-Specific Comparisons ──────────────────────────────────

const compareCropMetrics = (metrics, benchmark) => {
  const comparisons = [];

  if (metrics.yieldKgPerHa !== undefined && benchmark.avg_yield_kg_per_hectare) {
    comparisons.push(compareMetric(
      'yield_per_hectare', 'Yield (kg/ha)',
      metrics.yieldKgPerHa, parseFloat(benchmark.avg_yield_kg_per_hectare),
      0.30, true // higher is better
    ));
  }

  if (metrics.costPerHa !== undefined && benchmark.avg_cost_per_hectare) {
    comparisons.push(compareMetric(
      'cost_per_hectare', 'Cost (₹/ha)',
      metrics.costPerHa, parseFloat(benchmark.avg_cost_per_hectare),
      0.20, false // lower is better
    ));
  }

  if (metrics.revenuePerHa !== undefined && benchmark.avg_revenue_per_hectare) {
    comparisons.push(compareMetric(
      'revenue_per_hectare', 'Revenue (₹/ha)',
      metrics.revenuePerHa, parseFloat(benchmark.avg_revenue_per_hectare),
      0.25, true
    ));
  }

  if (metrics.profitPerHa !== undefined && benchmark.avg_profit_per_hectare) {
    comparisons.push(compareMetric(
      'profit_per_hectare', 'Profit (₹/ha)',
      metrics.profitPerHa, parseFloat(benchmark.avg_profit_per_hectare),
      0.25, true
    ));
  }

  return comparisons;
};

const compareDairyMetrics = (metrics, benchmark) => {
  const comparisons = [];

  if (metrics.milkYieldPerAnimal !== undefined && benchmark.avg_milk_yield_per_animal) {
    comparisons.push(compareMetric(
      'milk_yield_per_animal', 'Milk yield (L/animal/day)',
      metrics.milkYieldPerAnimal, parseFloat(benchmark.avg_milk_yield_per_animal),
      0.40, true
    ));
  }

  if (metrics.costPerAnimal !== undefined && benchmark.avg_monthly_cost_per_animal) {
    comparisons.push(compareMetric(
      'cost_per_animal', 'Monthly cost per animal (₹)',
      metrics.costPerAnimal, parseFloat(benchmark.avg_monthly_cost_per_animal),
      0.30, false
    ));
  }

  if (metrics.revenuePerAnimal !== undefined && benchmark.avg_monthly_revenue_per_animal) {
    comparisons.push(compareMetric(
      'revenue_per_animal', 'Monthly revenue per animal (₹)',
      metrics.revenuePerAnimal, parseFloat(benchmark.avg_monthly_revenue_per_animal),
      0.30, true
    ));
  }

  return comparisons;
};

const compareFisheryMetrics = (metrics, benchmark) => {
  const comparisons = [];

  if (metrics.yieldKgPerHa !== undefined && benchmark.avg_yield_kg_per_hectare_pond) {
    comparisons.push(compareMetric(
      'yield_per_hectare_pond', 'Yield (kg/ha/cycle)',
      metrics.yieldKgPerHa, parseFloat(benchmark.avg_yield_kg_per_hectare_pond),
      0.35, true
    ));
  }

  if (metrics.costPerHa !== undefined && benchmark.avg_cost_per_hectare_pond) {
    comparisons.push(compareMetric(
      'cost_per_hectare_pond', 'Cost per hectare (₹/cycle)',
      metrics.costPerHa, parseFloat(benchmark.avg_cost_per_hectare_pond),
      0.30, false
    ));
  }

  if (metrics.revenuePerHa !== undefined && benchmark.avg_revenue_per_hectare_pond) {
    comparisons.push(compareMetric(
      'revenue_per_hectare_pond', 'Revenue per hectare (₹/cycle)',
      metrics.revenuePerHa, parseFloat(benchmark.avg_revenue_per_hectare_pond),
      0.35, true
    ));
  }

  return comparisons;
};

// ─── Single Metric Comparison ───────────────────────────────────────

const compareMetric = (key, label, farmerValue, benchmarkValue, weight, higherIsBetter) => {
  if (!benchmarkValue || benchmarkValue === 0) {
    return { key, label, farmer: farmerValue, benchmark: null, variance_pct: null, rating: 'no_data', score: null, weight };
  }

  const ratio = farmerValue / benchmarkValue;
  const variancePct = round2((ratio - 1) * 100);

  // Score: 0-100 where 50 = at benchmark
  let score;
  if (higherIsBetter) {
    score = Math.round(Math.min(Math.max(ratio * 50, 0), 100));
  } else {
    // For costs: lower is better, so invert
    score = Math.round(Math.min(Math.max((2 - ratio) * 50, 0), 100));
  }

  const effectiveRatio = higherIsBetter ? ratio : 1 / ratio;
  let rating;
  if (effectiveRatio >= VARIANCE_BANDS.excellent) rating = 'excellent';
  else if (effectiveRatio >= VARIANCE_BANDS.good) rating = 'good';
  else if (effectiveRatio >= VARIANCE_BANDS.average) rating = 'average';
  else if (effectiveRatio >= VARIANCE_BANDS.below_average) rating = 'below_average';
  else rating = 'poor';

  return {
    key, label,
    farmer: round2(farmerValue),
    benchmark: round2(benchmarkValue),
    variance_pct: variancePct,
    ratio: round2(ratio),
    rating, score, weight,
  };
};

// ─── Helpers ────────────────────────────────────────────────────────

const classifyComposite = (score) => {
  if (score >= 80) return 'top_performer';
  if (score >= 60) return 'above_average';
  if (score >= 40) return 'average';
  if (score >= 25) return 'below_average';
  return 'needs_improvement';
};

const buildSummary = (comparisons, compositeRating) => {
  const excellent = comparisons.filter(c => c.rating === 'excellent').length;
  const poor = comparisons.filter(c => c.rating === 'poor').length;
  const total = comparisons.length;

  if (excellent >= total * 0.5) return 'Farmer outperforms district averages across most metrics';
  if (poor >= total * 0.5) return 'Farmer underperforms district averages — potential for improvement with better practices';
  return 'Farmer performs at or near district averages';
};

/**
 * Standard normal CDF approximation (Abramowitz & Stegun 26.2.17).
 */
const normalCDF = (z) => {
  if (z < -6) return 0;
  if (z > 6) return 1;
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const erf = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
};

const round2 = (n) => Math.round((n || 0) * 100) / 100;

module.exports = {
  compareToBenchmark,
  comparePriceToMarket,
  estimatePercentileRank,
  VARIANCE_BANDS,
};
