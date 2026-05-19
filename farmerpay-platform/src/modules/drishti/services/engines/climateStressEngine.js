/**
 * Climate Stress Testing Engine
 *
 * Answers: "What if the monsoon fails?"
 *
 * Takes a farmer snapshot + climate scenario and cascades the impact:
 *   rainfall deviation → yield adjustment → revenue change
 *     → dairy feed cost change → household cash flow stress
 *     → loan repayment capacity → SMA migration probability
 *
 * Supports both deterministic (single-point) and Monte Carlo modes.
 *
 * Climate scenarios modeled:
 *  - Drought:         rainfall -20% to -50%, temperature +1-3°C
 *  - Flood:           rainfall +30% to +60%, crop damage from waterlogging
 *  - Delayed monsoon: sowing delayed 2-6 weeks, compressed growing window
 *  - Heatwave:        temperature +3-5°C during critical growth stages
 *
 * No DB access — pure function on snapshot + benchmarks.
 */

const { projectCropYield, projectDairyYield } = require('../computation/yieldProjector');
const { forecastPrice } = require('../computation/priceForecaster');
const { estimateCropCost, estimateDairyCost, estimateFisheryCost } = require('../computation/costEstimator');
const { calculateCropRevenue, calculateDairyRevenue, calculateFisheryRevenue } = require('../computation/revenueCalculator');
const { projectCashFlow } = require('../computation/cashFlowProjector');
const { computeRiskScore } = require('../computation/riskScorer');
const { projectHouseholdIncome } = require('../computation/householdIncomeProjector');
const { runMonteCarlo, DEFAULT_DISTRIBUTIONS } = require('../computation/monteCarloSimulator');

// ─── Climate Impact Curves ──────────────────────────────────────────
// How each climate variable cascades through the farming system.

/**
 * Yield impact from delayed monsoon: each week of delay reduces yield.
 * Kharif crops are most sensitive — sowing window is narrow.
 */
const DELAYED_MONSOON_YIELD_PENALTY = {
  // weeks delayed → additional yield reduction factor
  0: 0.00,
  1: 0.03,   // 3% reduction
  2: 0.08,   // 8%
  3: 0.15,   // 15%
  4: 0.25,   // 25% — significant damage
  5: 0.35,
  6: 0.45,   // Nearly half the yield lost
};

/**
 * Flood/excess rainfall impact: waterlogging destroys standing crops.
 * Above +30% rainfall, damage begins.
 */
const FLOOD_YIELD_CURVE = (rainfallDevPct) => {
  if (rainfallDevPct <= 30) return 0;      // Normal surplus is fine
  if (rainfallDevPct <= 40) return 0.10;   // 10% loss
  if (rainfallDevPct <= 50) return 0.25;   // 25% loss
  if (rainfallDevPct <= 60) return 0.40;   // 40% loss
  return 0.55;                              // >60% surplus → catastrophic
};

/**
 * Dairy feed cost increase under climate stress.
 * Drought → green fodder scarce → feed costs rise.
 */
const DAIRY_FEED_COST_MULTIPLIER = (rainfallDevPct) => {
  if (rainfallDevPct >= -10) return 1.0;    // Normal
  if (rainfallDevPct >= -20) return 1.10;   // Mild stress → 10% feed cost increase
  if (rainfallDevPct >= -30) return 1.20;   // Moderate
  if (rainfallDevPct >= -40) return 1.35;   // Severe drought
  return 1.50;                               // Extreme — fodder prices spike 50%
};

/**
 * Fishery impact: temperature stress on fish, water quality issues.
 */
const FISHERY_STRESS_FACTOR = (rainfallDevPct, tempDevC) => {
  let factor = 1.0;
  // Drought → water level drops
  if (rainfallDevPct < -20) factor *= 0.85;
  if (rainfallDevPct < -40) factor *= 0.70;
  // Heat → fish mortality
  if (tempDevC > 2) factor *= 0.90;
  if (tempDevC > 4) factor *= 0.75;
  return factor;
};

// ─── Pre-built Scenario Templates ───────────────────────────────────

const CLIMATE_TEMPLATES = {
  mild_drought: {
    label: 'mild_drought',
    description: 'Below-average rainfall, slightly above-normal temperatures',
    rainfall_deviation_pct: -15,
    temperature_deviation_celsius: 1,
    delayed_monsoon_weeks: 0,
  },
  severe_drought: {
    label: 'severe_drought',
    description: 'Significant rainfall deficit, prolonged heat',
    rainfall_deviation_pct: -35,
    temperature_deviation_celsius: 2.5,
    delayed_monsoon_weeks: 2,
  },
  delayed_monsoon: {
    label: 'delayed_monsoon',
    description: 'Monsoon onset delayed by 3-4 weeks, compressed growing season',
    rainfall_deviation_pct: -10,
    temperature_deviation_celsius: 1,
    delayed_monsoon_weeks: 4,
  },
  flood: {
    label: 'flood',
    description: 'Excess rainfall causing waterlogging and crop damage',
    rainfall_deviation_pct: 45,
    temperature_deviation_celsius: -1,
    delayed_monsoon_weeks: 0,
  },
  heatwave: {
    label: 'heatwave',
    description: 'Extended heatwave during critical flowering/grain-fill stage',
    rainfall_deviation_pct: -5,
    temperature_deviation_celsius: 4,
    delayed_monsoon_weeks: 0,
  },
};

// ─── Main Compute ───────────────────────────────────────────────────

/**
 * @param {object} params
 * @param {object} params.snapshot
 * @param {Array}  params.benchmarks
 * @param {object} params.input - Validated request body
 * @returns {object} Full result matching the climate stress API contract
 */
const compute = ({ snapshot, benchmarks, input }) => {
  const {
    climate_scenario,
    include_household_impact = true,
    active_loan_ids,
    computation_mode = 'deterministic',
    monte_carlo_runs = 1000,
  } = input;

  const rainfallDev = climate_scenario.rainfall_deviation_pct;
  const tempDev = climate_scenario.temperature_deviation_celsius || 0;
  const delayedWeeks = climate_scenario.delayed_monsoon_weeks || 0;

  // ── Run deterministic base scenario ──
  const baseResult = runDeterministicScenario(snapshot, benchmarks, {
    rainfallDev: 0, tempDev: 0, delayedWeeks: 0, yieldFactor: 1.0, costFactor: 1.0, priceFactor: 1.0,
  }, include_household_impact);

  // ── Run stressed scenario ──
  const stressResult = runDeterministicScenario(snapshot, benchmarks, {
    rainfallDev, tempDev, delayedWeeks, yieldFactor: 1.0, costFactor: 1.0, priceFactor: 1.0,
  }, include_household_impact);

  // ── Monte Carlo (if requested) ──
  let monteCarloResult = null;
  if (computation_mode === 'monte_carlo') {
    monteCarloResult = runClimateStressMC(snapshot, benchmarks, {
      baseRainfallDev: rainfallDev,
      baseTempDev: tempDev,
      baseDelayedWeeks: delayedWeeks,
      numRuns: Math.min(monte_carlo_runs, 5000),
      includeHouseholdImpact: include_household_impact,
    });
  }

  // ── Build impact cascade ──
  const cascade = buildImpactCascade(baseResult, stressResult, rainfallDev, tempDev, delayedWeeks);

  // ── Build scenarios array for drishtiService storage ──
  const scenarios = [
    formatScenario('baseline', 'Normal conditions (no climate stress)', baseResult, { rainfall_deviation_pct: 0, temperature_deviation_celsius: 0, delayed_monsoon_weeks: 0 }),
    formatScenario('stress', describeClimateScenario(rainfallDev, tempDev, delayedWeeks), stressResult, climate_scenario),
  ];

  // ── Risk factors ──
  const riskFactors = identifyClimateRiskFactors(snapshot, stressResult, rainfallDev, tempDev, delayedWeeks);

  // ── Recommendations ──
  const recommendations = generateRecommendations(cascade, stressResult, monteCarloResult, snapshot);

  return {
    farmerSummary: buildFarmerSummary(snapshot),
    climateScenario: {
      rainfall_deviation_pct: rainfallDev,
      temperature_deviation_celsius: tempDev,
      delayed_monsoon_weeks: delayedWeeks,
      scenario_type: classifyScenarioType(rainfallDev, tempDev, delayedWeeks),
      severity: classifySeverity(rainfallDev, tempDev, delayedWeeks),
    },
    impactCascade: cascade,
    scenarios,
    monteCarlo: monteCarloResult ? {
      num_runs: monteCarloResult.summary.num_runs,
      probability_profitable: monteCarloResult.probabilities.profitable,
      probability_sma_stress: monteCarloResult.probabilities.sma_stress,
      probability_loan_default: monteCarloResult.probabilities.loan_default,
      income_p10: monteCarloResult.percentiles.income_p10,
      income_p50: monteCarloResult.percentiles.income_p50,
      income_p90: monteCarloResult.percentiles.income_p90,
      health_status_distribution: monteCarloResult.distribution.health_status,
      sma_distribution: monteCarloResult.distribution.sma_class,
    } : null,
    riskFactors,
    recommendations,
  };
};

// ─── Deterministic Scenario Runner ──────────────────────────────────

const runDeterministicScenario = (snapshot, benchmarks, climateVars, includeHousehold) => {
  const { rainfallDev, tempDev, delayedWeeks, yieldFactor = 1.0, costFactor = 1.0, priceFactor = 1.0 } = climateVars;

  const farmRevenue = { crop: new Array(12).fill(0), dairy: new Array(12).fill(0), fishery: new Array(12).fill(0) };
  const farmCosts = { crop: new Array(12).fill(0), dairy: new Array(12).fill(0), fishery: new Array(12).fill(0) };
  let totalRevenue = 0;
  let totalCost = 0;

  // ── Delayed monsoon yield penalty ──
  const delayPenalty = DELAYED_MONSOON_YIELD_PENALTY[Math.min(Math.round(delayedWeeks), 6)] || 0;

  // ── Flood penalty ──
  const floodPenalty = rainfallDev > 0 ? FLOOD_YIELD_CURVE(rainfallDev) : 0;

  // Combined yield modifier: climate elasticity + delay + flood
  const combinedYieldFactor = yieldFactor * (1 - delayPenalty) * (1 - floodPenalty);

  // ── Crop activities from snapshot ──
  const activeCrops = snapshot.active_crop_cycles || [];
  for (const crop of activeCrops) {
    const benchmark = findBenchmark(benchmarks, 'crop', crop.cropId, crop.season);
    const acreage = parseFloat(snapshot.total_farm_size_hectares) || 1;
    const harvestOffset = HARVEST_OFFSETS[crop.season] || 5;
    const sowingMonth = SOWING_MONTHS[crop.season] || 5;

    const rev = calculateCropRevenue({
      snapshot, benchmark, cropId: crop.cropId,
      acreageHectares: acreage / Math.max(activeCrops.length, 1),
      season: crop.season, irrigationType: 'rainfed',
      rainfallDeviationPct: rainfallDev,
      temperatureDeviationC: tempDev,
      yieldFactor: combinedYieldFactor,
      priceFactor,
      harvestMonthOffset: harvestOffset,
    });

    const cost = estimateCropCost({
      benchmark,
      acreageHectares: acreage / Math.max(activeCrops.length, 1),
      costFactor,
      sowingMonthOffset: sowingMonth,
      cycleMonths: harvestOffset + 1,
    });

    for (let i = 0; i < 12; i++) {
      farmRevenue.crop[i] += rev.monthlyRevenue[i] || 0;
      farmCosts.crop[i] += cost.monthlyCosts[i] || 0;
    }
    totalRevenue += rev.totalRevenue;
    totalCost += cost.totalCost;
  }

  // ── Dairy (climate affects feed costs) ──
  if (snapshot.active_dairy_profile) {
    const dairyBenchmark = findBenchmark(benchmarks, 'dairy');
    const animalCount = snapshot.active_dairy_profile.animalCount || 0;

    if (animalCount > 0) {
      const rev = calculateDairyRevenue({ snapshot, benchmark: dairyBenchmark, animalCount });
      const feedMultiplier = DAIRY_FEED_COST_MULTIPLIER(rainfallDev);
      const cost = estimateDairyCost({
        benchmark: dairyBenchmark, animalCount,
        costFactor: costFactor * feedMultiplier,
      });

      for (let i = 0; i < 12; i++) {
        farmRevenue.dairy[i] = rev.monthlyRevenueArray[i] || 0;
        farmCosts.dairy[i] = cost.monthlyCosts[i] || 0;
      }
      totalRevenue += rev.annualRevenue;
      totalCost += cost.annualCost;
    }
  }

  // ── Fishery (climate affects survival) ──
  if (snapshot.active_fishery_profile) {
    const fishBenchmark = findBenchmark(benchmarks, 'fishery');
    const pondArea = snapshot.active_fishery_profile.totalPondAreaHectares || 0;

    if (pondArea > 0) {
      const stressFactor = FISHERY_STRESS_FACTOR(rainfallDev, tempDev);
      const rev = calculateFisheryRevenue({ snapshot, benchmark: fishBenchmark, pondAreaHectares: pondArea });
      const cost = estimateFisheryCost({ benchmark: fishBenchmark, pondAreaHectares: pondArea, costFactor });

      // Apply stress to revenue (mortality reduces harvest)
      for (let i = 0; i < 12; i++) {
        farmRevenue.fishery[i] = round2((rev.monthlyRevenueArray[i] || 0) * stressFactor);
        farmCosts.fishery[i] = cost.monthlyCosts[i] || 0;
      }
      totalRevenue += round2(rev.annualRevenue * stressFactor);
      totalCost += cost.totalCycleCost;
    }
  }

  // ── Cash flow with household ──
  const cashFlow = projectCashFlow({
    snapshot, horizonMonths: 12,
    farmRevenue, farmCosts,
  });

  const netFarmIncome = round2(totalRevenue - totalCost);
  const totalIncomeWithOther = round2(netFarmIncome + (cashFlow.summary.totalNonFarmIncome || 0));
  const monthlyIncome = totalIncomeWithOther / 12;
  const monthlyEmi = parseFloat(snapshot.total_monthly_emi) || 0;
  const emiToIncomeRatio = monthlyIncome > 0 ? round2(monthlyEmi / monthlyIncome) : 99;

  // Risk scoring
  const risk = computeRiskScore({
    snapshot,
    cashFlowSummary: cashFlow.summary,
    irrigationType: 'rainfed',
    rainfallDeviationPct: rainfallDev,
    projectedNetIncome: netFarmIncome,
  });

  return {
    totalRevenue: round2(totalRevenue),
    totalCost: round2(totalCost),
    netFarmIncome,
    totalIncomeWithOther,
    emiToIncomeRatio,
    healthStatus: risk.healthStatus,
    smaClass: risk.smaClass,
    incomeAdequacy: risk.incomeAdequacy,
    riskScore: risk.riskScore,
    deficitMonths: cashFlow.summary.deficitMonths,
    workingCapitalGap: cashFlow.summary.workingCapitalGap,
    cashFlow,
  };
};

// ─── Monte Carlo Climate Stress ─────────────────────────────────────

const runClimateStressMC = (snapshot, benchmarks, config) => {
  const {
    baseRainfallDev, baseTempDev, baseDelayedWeeks,
    numRuns, includeHouseholdImpact,
  } = config;

  const computeFn = (sampledVars) => {
    const result = runDeterministicScenario(snapshot, benchmarks, {
      rainfallDev: sampledVars.rainfall_deviation_pct,
      tempDev: sampledVars.temperature_deviation_c,
      delayedWeeks: sampledVars.delayed_monsoon_weeks,
      yieldFactor: sampledVars.yield_factor,
      costFactor: sampledVars.cost_factor,
      priceFactor: sampledVars.price_factor,
    }, includeHouseholdImpact);

    return {
      netIncome: result.netFarmIncome,
      net_income: result.netFarmIncome,
      healthStatus: result.healthStatus,
      health_status: result.healthStatus,
      smaClass: result.smaClass,
      sma_class: result.smaClass,
      riskScore: result.riskScore,
      deficitMonths: result.deficitMonths,
    };
  };

  // Center the distributions around the user's climate scenario
  const distributions = {
    rainfall_deviation_pct:  { mean: baseRainfallDev, stddev: 10,   min: -80, max: 80,  type: 'normal' },
    temperature_deviation_c: { mean: baseTempDev,     stddev: 1.0,  min: -3,  max: 10,  type: 'normal' },
    delayed_monsoon_weeks:   { mean: baseDelayedWeeks, stddev: 1.5, min: 0,   max: 8,   type: 'normal' },
    yield_factor:            { ...DEFAULT_DISTRIBUTIONS.yield_factor },
    cost_factor:             { ...DEFAULT_DISTRIBUTIONS.cost_factor },
    price_factor:            { ...DEFAULT_DISTRIBUTIONS.price_factor },
  };

  return runMonteCarlo({
    computeFn,
    baseVariables: {
      rainfall_deviation_pct: baseRainfallDev,
      temperature_deviation_c: baseTempDev,
      delayed_monsoon_weeks: baseDelayedWeeks,
      yield_factor: 1.0,
      cost_factor: 1.0,
      price_factor: 1.0,
    },
    distributions,
    numRuns,
  });
};

// ─── Impact Cascade ─────────────────────────────────────────────────

const buildImpactCascade = (baseResult, stressResult, rainfallDev, tempDev, delayedWeeks) => {
  const revenueChange = round2(stressResult.totalRevenue - baseResult.totalRevenue);
  const costChange = round2(stressResult.totalCost - baseResult.totalCost);
  const netIncomeChange = round2(stressResult.netFarmIncome - baseResult.netFarmIncome);

  return {
    // Level 1: Climate → Yield
    yield_impact: {
      rainfall_effect_pct: round2(rainfallDev * 0.5), // elasticity
      temperature_effect_pct: round2(tempDev * 3),     // per °C
      monsoon_delay_penalty_pct: round2((DELAYED_MONSOON_YIELD_PENALTY[Math.min(Math.round(delayedWeeks), 6)] || 0) * 100),
      flood_damage_pct: round2(FLOOD_YIELD_CURVE(rainfallDev) * 100),
    },
    // Level 2: Yield → Revenue
    revenue_impact: {
      baseline_revenue: baseResult.totalRevenue,
      stress_revenue: stressResult.totalRevenue,
      change: revenueChange,
      change_pct: baseResult.totalRevenue > 0 ? round2((revenueChange / baseResult.totalRevenue) * 100) : 0,
    },
    // Level 3: Feed cost increase
    cost_impact: {
      baseline_cost: baseResult.totalCost,
      stress_cost: stressResult.totalCost,
      change: costChange,
      dairy_feed_multiplier: DAIRY_FEED_COST_MULTIPLIER(rainfallDev),
    },
    // Level 4: Net income
    income_impact: {
      baseline_net_income: baseResult.netFarmIncome,
      stress_net_income: stressResult.netFarmIncome,
      change: netIncomeChange,
      change_pct: baseResult.netFarmIncome !== 0 ? round2((netIncomeChange / Math.abs(baseResult.netFarmIncome)) * 100) : 0,
    },
    // Level 5: Loan stress
    loan_stress: {
      baseline_emi_ratio: baseResult.emiToIncomeRatio,
      stress_emi_ratio: stressResult.emiToIncomeRatio,
      baseline_health: baseResult.healthStatus,
      stress_health: stressResult.healthStatus,
      sma_migration: baseResult.healthStatus !== stressResult.healthStatus
        ? `${baseResult.healthStatus} → ${stressResult.healthStatus}`
        : 'no_change',
    },
    // Level 6: Cash flow
    cash_flow_stress: {
      baseline_deficit_months: baseResult.deficitMonths,
      stress_deficit_months: stressResult.deficitMonths,
      additional_deficit_months: stressResult.deficitMonths - baseResult.deficitMonths,
      stress_working_capital_gap: stressResult.workingCapitalGap,
    },
  };
};

// ─── Scenario Formatter ─────────────────────────────────────────────

const formatScenario = (label, description, result, assumptions) => ({
  label,
  label_key: `drishti.scenario.climate_${label}`,
  description,
  assumptions,
  projections: {
    total_revenue: result.totalRevenue,
    total_cost: result.totalCost,
    net_farm_income: result.netFarmIncome,
    total_income_with_other: result.totalIncomeWithOther,
    emi_burden_monthly: 0, // filled by service layer
    emi_to_income_ratio: result.emiToIncomeRatio,
    breakeven_yield_kg_per_hectare: null,
    projected_yield_kg_per_hectare: null,
    yield_safety_margin_pct: null,
    health_status: result.healthStatus,
    sma_classification: result.smaClass,
    income_adequacy: result.incomeAdequacy,
    risk_score: result.riskScore,
  },
  monthly_cashflow: result.cashFlow.monthly,
  cash_flow_summary: result.cashFlow.summary,
});

// ─── Risk Factors ───────────────────────────────────────────────────

const identifyClimateRiskFactors = (snapshot, stressResult, rainfallDev, tempDev, delayedWeeks) => {
  const factors = [];

  if (rainfallDev <= -25) {
    factors.push({
      factor: 'Severe rainfall deficit',
      impact: 'high',
      message_key: 'drishti.risk.drought',
      message: `${Math.abs(rainfallDev)}% below-normal rainfall — crop yields may drop 30-50%`,
    });
  }

  if (rainfallDev >= 40) {
    factors.push({
      factor: 'Flood risk',
      impact: 'high',
      message_key: 'drishti.risk.flood',
      message: `${rainfallDev}% above-normal rainfall — standing crops at risk of waterlogging damage`,
    });
  }

  if (delayedWeeks >= 3) {
    factors.push({
      factor: 'Delayed monsoon',
      impact: 'high',
      message_key: 'drishti.risk.delayed_monsoon',
      message: `${delayedWeeks}-week delay compresses the growing window — yield penalty of ${Math.round((DELAYED_MONSOON_YIELD_PENALTY[Math.min(delayedWeeks, 6)] || 0) * 100)}%`,
    });
  }

  if (tempDev >= 3) {
    factors.push({
      factor: 'Heatwave exposure',
      impact: 'high',
      message_key: 'drishti.risk.heatwave',
      message: `+${tempDev}°C above normal — heat stress reduces flowering and grain fill`,
    });
  }

  if (stressResult.healthStatus === 'npa' || stressResult.healthStatus === 'stressed') {
    factors.push({
      factor: 'Loan default risk',
      impact: 'high',
      message_key: 'drishti.risk.loan_stress',
      message: `Under this climate scenario, loan health deteriorates to "${stressResult.healthStatus}"`,
    });
  }

  if (rainfallDev < -15 && snapshot.active_dairy_profile) {
    factors.push({
      factor: 'Dairy feed cost spike',
      impact: 'medium',
      message_key: 'drishti.risk.dairy_feed',
      message: `Drought increases dairy feed costs by ${Math.round((DAIRY_FEED_COST_MULTIPLIER(rainfallDev) - 1) * 100)}% — green fodder becomes scarce`,
    });
  }

  if (!snapshot.active_insurance || snapshot.active_insurance.length === 0) {
    factors.push({
      factor: 'No crop insurance',
      impact: 'high',
      message_key: 'drishti.risk.no_insurance_climate',
      message: 'No PMFBY or weather index insurance — climate loss has no safety net',
    });
  }

  return factors;
};

// ─── Recommendations ────────────────────────────────────────────────

const generateRecommendations = (cascade, stressResult, mcResult, snapshot) => {
  const recs = [];

  // Verdict
  const severity = Math.abs(cascade.income_impact.change_pct);
  if (severity < 15) {
    recs.push({ type: 'info', message_key: 'drishti.rec.climate_mild', message: 'This climate scenario has moderate impact — your household can likely absorb the shock' });
  } else if (severity < 35) {
    recs.push({ type: 'warning', message_key: 'drishti.rec.climate_moderate', message: 'Significant income reduction expected — ensure working capital reserves and consider insurance' });
  } else {
    recs.push({ type: 'warning', message_key: 'drishti.rec.climate_severe', message: 'Severe income impact — proactive measures needed: insurance, drought-resistant varieties, irrigation investment' });
  }

  // Insurance recommendation
  if (!snapshot.active_insurance || snapshot.active_insurance.length === 0) {
    const potentialLoss = Math.abs(cascade.revenue_impact.change);
    recs.push({
      type: 'action',
      message_key: 'drishti.rec.get_insurance',
      message: `PMFBY enrollment could protect against ₹${Math.round(potentialLoss).toLocaleString('en-IN')} in climate-related losses`,
    });
  }

  // Irrigation upgrade
  if (cascade.yield_impact.rainfall_effect_pct < -10) {
    recs.push({
      type: 'action',
      message_key: 'drishti.rec.irrigation',
      message: 'Investing in irrigation reduces rainfall dependency — irrigated crops lose 40-60% less yield in drought',
    });
  }

  // Working capital
  if (stressResult.workingCapitalGap > 0) {
    recs.push({
      type: 'warning',
      message_key: 'drishti.rec.climate_working_capital',
      message: `Under stress, you'll need ₹${Math.round(stressResult.workingCapitalGap).toLocaleString('en-IN')} additional working capital`,
    });
  }

  // MC-based probability info
  if (mcResult) {
    const profitProb = Math.round(mcResult.probabilities.profitable * 100);
    recs.push({
      type: 'info',
      message_key: 'drishti.rec.mc_probability',
      message: `Monte Carlo analysis (${mcResult.summary.num_runs} simulations): ${profitProb}% chance of remaining profitable under this climate range`,
    });
  }

  // Diversification
  if (stressResult.deficitMonths >= 4) {
    recs.push({
      type: 'action',
      message_key: 'drishti.rec.diversify_climate',
      message: 'Non-farm income streams (SHG, wage labor) provide critical buffer during climate-stressed months',
    });
  }

  return recs;
};

// ─── Helpers ────────────────────────────────────────────────────────

const HARVEST_OFFSETS = { kharif: 5, rabi: 4, summer: 3, annual: 6 };
const SOWING_MONTHS = { kharif: 5, rabi: 10, summer: 1, annual: 0 };

const findBenchmark = (benchmarks, activityType, cropId, season) => {
  if (!benchmarks || benchmarks.length === 0) return null;
  if (activityType === 'crop') {
    return benchmarks.find(b => b.crop_id === cropId && b.activity_type === 'crop')
      || benchmarks.find(b => b.activity_type === 'crop' && b.season === season)
      || benchmarks.find(b => b.activity_type === 'crop')
      || null;
  }
  return benchmarks.find(b => b.activity_type === activityType) || null;
};

const buildFarmerSummary = (snapshot) => ({
  district_id: snapshot.district_id,
  total_land_hectares: parseFloat(snapshot.total_farm_size_hectares) || 0,
  trust_score: snapshot.trust_score,
  trust_band: snapshot.trust_band,
  existing_loan_emi: parseFloat(snapshot.total_monthly_emi) || 0,
  active_crops: (snapshot.active_crop_cycles || []).length,
  has_dairy: !!snapshot.active_dairy_profile,
  has_fishery: !!snapshot.active_fishery_profile,
  has_insurance: (snapshot.active_insurance || []).length > 0,
});

const classifyScenarioType = (rainfallDev, tempDev, delayedWeeks) => {
  if (rainfallDev >= 40) return 'flood';
  if (tempDev >= 3) return 'heatwave';
  if (delayedWeeks >= 3) return 'delayed_monsoon';
  if (rainfallDev <= -25) return 'severe_drought';
  if (rainfallDev <= -10) return 'mild_drought';
  return 'custom';
};

const classifySeverity = (rainfallDev, tempDev, delayedWeeks) => {
  const absRain = Math.abs(rainfallDev);
  const score = absRain * 0.5 + tempDev * 10 + delayedWeeks * 8;
  if (score >= 50) return 'extreme';
  if (score >= 30) return 'severe';
  if (score >= 15) return 'moderate';
  return 'mild';
};

const describeClimateScenario = (rainfallDev, tempDev, delayedWeeks) => {
  const parts = [];
  if (rainfallDev !== 0) parts.push(`${rainfallDev > 0 ? '+' : ''}${rainfallDev}% rainfall`);
  if (tempDev !== 0) parts.push(`${tempDev > 0 ? '+' : ''}${tempDev}°C temperature`);
  if (delayedWeeks > 0) parts.push(`${delayedWeeks}-week monsoon delay`);
  return parts.length > 0 ? `Climate stress: ${parts.join(', ')}` : 'Custom climate scenario';
};

const round2 = (n) => Math.round((n || 0) * 100) / 100;

module.exports = { compute, CLIMATE_TEMPLATES };
