/**
 * Cost Estimator
 *
 * Estimates input costs for crop, dairy, and fishery activities.
 * Pure function — no DB access. Works on snapshot + benchmark data.
 *
 * Crop costs: benchmark per-hectare cost × acreage, broken into categories
 * with monthly timing aligned to crop calendar.
 *
 * Dairy costs: per-animal monthly cost from benchmark, adjusted for feed quality.
 *
 * Fishery costs: per-hectare-per-cycle from benchmark, spread across cycle months.
 */

// ─── Default cost breakdowns (% of total) when benchmark lacks detail ──
const CROP_COST_BREAKDOWN = {
  seeds:       0.12,
  fertilizer:  0.25,
  pesticide:   0.08,
  labor:       0.30,
  irrigation:  0.10,
  machinery:   0.10,
  other:       0.05,
};

// Typical crop cost timing: when each expense hits relative to sowing month (0-indexed offset)
const CROP_COST_TIMING = {
  seeds:       [0],           // At sowing
  fertilizer:  [0, 1, 3],    // Basal + top dressing
  pesticide:   [2, 3, 4],    // During growing
  labor:       [0, 1, 2, 3, 4, 5], // Throughout cycle
  irrigation:  [1, 2, 3, 4], // Growing season
  machinery:   [0, 5],       // Sowing + harvest
  other:       [0, 2, 4],
};

// ─── Crop Cost Estimation ───────────────────────────────────────────

/**
 * @param {object} params
 * @param {object} params.benchmark        - District benchmark
 * @param {number} params.acreageHectares
 * @param {number} [params.costFactor=1.0] - Override multiplier (MC sampling)
 * @param {string} [params.inputLevel='standard'] - 'low' | 'standard' | 'high'
 * @param {number} [params.sowingMonthOffset=0]  - Month offset from scenario start
 * @param {number} [params.cycleMonths=6]
 * @returns {{ totalCost, itemizedCosts, monthlyCosts, costPerHectare }}
 */
const estimateCropCost = ({
  benchmark,
  acreageHectares,
  costFactor = 1.0,
  inputLevel = 'standard',
  sowingMonthOffset = 0,
  cycleMonths = 6,
}) => {
  if (!acreageHectares || acreageHectares <= 0) {
    return { totalCost: 0, itemizedCosts: {}, monthlyCosts: [], costPerHectare: 0 };
  }

  // Base cost per hectare from benchmark
  let costPerHectare = 50000; // conservative default INR
  if (benchmark && benchmark.avg_cost_per_hectare) {
    costPerHectare = parseFloat(benchmark.avg_cost_per_hectare);
  }

  // Input level adjustment
  const inputFactors = { low: 0.75, standard: 1.0, high: 1.30 };
  costPerHectare *= inputFactors[inputLevel] || 1.0;

  // MC / scenario factor
  costPerHectare *= costFactor;

  const totalCost = Math.round(costPerHectare * acreageHectares * 100) / 100;

  // Itemized breakdown
  const itemizedCosts = {};
  for (const [category, pct] of Object.entries(CROP_COST_BREAKDOWN)) {
    itemizedCosts[category] = Math.round(totalCost * pct * 100) / 100;
  }

  // Monthly distribution
  const monthlyCosts = new Array(12).fill(0);
  for (const [category, months] of Object.entries(CROP_COST_TIMING)) {
    const catCost = itemizedCosts[category] || 0;
    const perMonth = catCost / months.length;
    for (const offset of months) {
      const monthIdx = (sowingMonthOffset + offset) % 12;
      monthlyCosts[monthIdx] += perMonth;
    }
  }

  // Round monthly values
  for (let i = 0; i < 12; i++) {
    monthlyCosts[i] = Math.round(monthlyCosts[i] * 100) / 100;
  }

  return {
    totalCost,
    costPerHectare: Math.round(costPerHectare * 100) / 100,
    acreageHectares,
    itemizedCosts,
    monthlyCosts,
  };
};

// ─── Dairy Cost Estimation ──────────────────────────────────────────

/**
 * @param {object} params
 * @param {object} [params.benchmark]      - District dairy benchmark
 * @param {number} params.animalCount
 * @param {string} [params.feedQuality='standard']
 * @param {number} [params.costFactor=1.0]
 * @returns {{ monthlyCost, annualCost, costPerAnimalMonthly, monthlyCosts }}
 */
const estimateDairyCost = ({
  benchmark = null,
  animalCount,
  feedQuality = 'standard',
  costFactor = 1.0,
}) => {
  if (!animalCount || animalCount <= 0) {
    return { monthlyCost: 0, annualCost: 0, costPerAnimalMonthly: 0, monthlyCosts: new Array(12).fill(0) };
  }

  // Base monthly cost per animal from benchmark
  let costPerAnimal = 4500; // conservative default INR/month
  if (benchmark && benchmark.avg_monthly_cost_per_animal) {
    costPerAnimal = parseFloat(benchmark.avg_monthly_cost_per_animal);
  }

  // Feed quality adjustment
  const feedFactors = { basic: 0.75, standard: 1.0, premium: 1.30 };
  costPerAnimal *= feedFactors[feedQuality] || 1.0;
  costPerAnimal *= costFactor;

  const monthlyCost = Math.round(costPerAnimal * animalCount * 100) / 100;

  // Dairy costs are relatively uniform across months with slight seasonal variation
  // Feed costs rise ~10% in summer (Apr-Jun) when green fodder is scarce
  const seasonalFactors = [1.0, 1.0, 1.0, 1.05, 1.10, 1.10, 1.0, 1.0, 1.0, 0.95, 0.95, 0.95];
  const monthlyCosts = seasonalFactors.map(f => Math.round(monthlyCost * f * 100) / 100);

  return {
    monthlyCost,
    annualCost: Math.round(monthlyCost * 12 * 100) / 100,
    costPerAnimalMonthly: Math.round(costPerAnimal * 100) / 100,
    animalCount,
    monthlyCosts,
  };
};

// ─── Fishery Cost Estimation ────────────────────────────────────────

/**
 * @param {object} params
 * @param {object} [params.benchmark]
 * @param {number} params.pondAreaHectares
 * @param {string} [params.stockingDensity='standard']
 * @param {number} [params.cycleMonths=8]
 * @param {number} [params.costFactor=1.0]
 * @returns {{ totalCycleCost, monthlyCost, monthlyCosts }}
 */
const estimateFisheryCost = ({
  benchmark = null,
  pondAreaHectares,
  stockingDensity = 'standard',
  cycleMonths = 8,
  costFactor = 1.0,
}) => {
  if (!pondAreaHectares || pondAreaHectares <= 0) {
    return { totalCycleCost: 0, monthlyCost: 0, monthlyCosts: new Array(12).fill(0) };
  }

  // Base cost per hectare per cycle
  let costPerHectare = 150000; // default INR/hectare/cycle
  if (benchmark && benchmark.avg_cost_per_hectare_pond) {
    costPerHectare = parseFloat(benchmark.avg_cost_per_hectare_pond);
  }

  const densityFactors = { low: 0.7, standard: 1.0, high: 1.30 };
  costPerHectare *= densityFactors[stockingDensity] || 1.0;
  costPerHectare *= costFactor;

  const totalCycleCost = Math.round(costPerHectare * pondAreaHectares * 100) / 100;

  // Cost distribution across cycle:
  // Month 0 (stocking): 30% — fingerlings, pond prep
  // Month 1-N (feeding): 60% evenly — feed, maintenance
  // Last month (harvest): 10% — harvest labor
  const monthlyCosts = new Array(12).fill(0);
  const stockingCost = totalCycleCost * 0.30;
  const feedingTotal = totalCycleCost * 0.60;
  const feedingMonths = Math.max(cycleMonths - 2, 1);
  const feedingPerMonth = feedingTotal / feedingMonths;
  const harvestCost = totalCycleCost * 0.10;

  monthlyCosts[0] = stockingCost;
  for (let i = 1; i <= feedingMonths; i++) {
    if (i < 12) monthlyCosts[i] = feedingPerMonth;
  }
  const harvestMonth = Math.min(cycleMonths - 1, 11);
  monthlyCosts[harvestMonth] += harvestCost;

  for (let i = 0; i < 12; i++) {
    monthlyCosts[i] = Math.round(monthlyCosts[i] * 100) / 100;
  }

  return {
    totalCycleCost,
    monthlyCost: Math.round((totalCycleCost / cycleMonths) * 100) / 100,
    costPerHectare: Math.round(costPerHectare * 100) / 100,
    pondAreaHectares,
    monthlyCosts,
  };
};

module.exports = {
  estimateCropCost,
  estimateDairyCost,
  estimateFisheryCost,
  CROP_COST_BREAKDOWN,
};
