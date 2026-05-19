/**
 * Banker Portfolio Simulation Engine
 *
 * Answers: "What if monsoon fails in Vidarbha?" (portfolio-wide)
 *
 * Takes a banker's portfolio scope + shock variables:
 *  - Filters farmers by district/block/loan product/explicit IDs
 *  - Runs climate stress per farmer (using climateStressEngine internals)
 *  - Aggregates into portfolio-level metrics
 *
 * Two modes:
 *  - Synchronous (≤50 farmers): runs inline, returns results in HTTP response
 *  - Asynchronous (>50 farmers): queues via RabbitMQ, returns job ID
 *
 * Outputs:
 *  - Portfolio exposure summary
 *  - SMA migration matrix (good→watch, watch→stressed, etc.)
 *  - Top-N intervention candidates
 *  - Portfolio VaR (Value at Risk at 95th percentile)
 *  - Recommendations
 */

const logger = require('../../../../shared/utils/logger');
const { projectCropYield } = require('../computation/yieldProjector');
const { calculateCropRevenue, calculateDairyRevenue, calculateFisheryRevenue } = require('../computation/revenueCalculator');
const { estimateCropCost, estimateDairyCost, estimateFisheryCost } = require('../computation/costEstimator');
const { projectCashFlow } = require('../computation/cashFlowProjector');
const { computeRiskScore } = require('../computation/riskScorer');
const { runMonteCarlo, DEFAULT_DISTRIBUTIONS } = require('../computation/monteCarloSimulator');

// ─── Constants ──────────────────────────────────────────────────────

const SYNC_FARMER_LIMIT = 50;  // Sync processing threshold
const INTERVENTION_TOP_N = 50; // Top farmers needing intervention
const CHUNK_SIZE = 50;         // Processing chunk size for async

// ─── Delayed monsoon + flood impact curves (shared with climateStressEngine) ─
const DELAYED_MONSOON_YIELD_PENALTY = { 0: 0, 1: 0.03, 2: 0.08, 3: 0.15, 4: 0.25, 5: 0.35, 6: 0.45 };
const FLOOD_YIELD_CURVE = (dev) => { if (dev <= 30) return 0; if (dev <= 40) return 0.10; if (dev <= 50) return 0.25; if (dev <= 60) return 0.40; return 0.55; };
const DAIRY_FEED_COST_MULTIPLIER = (dev) => { if (dev >= -10) return 1.0; if (dev >= -20) return 1.10; if (dev >= -30) return 1.20; if (dev >= -40) return 1.35; return 1.50; };
const FISHERY_STRESS_FACTOR = (rain, temp) => { let f = 1.0; if (rain < -20) f *= 0.85; if (rain < -40) f *= 0.70; if (temp > 2) f *= 0.90; if (temp > 4) f *= 0.75; return f; };

// ─── Main Compute (synchronous, for ≤50 farmers) ────────────────────

/**
 * Compute portfolio-level stress analysis for a set of farmer snapshots.
 * Called directly for small portfolios, or by the RabbitMQ consumer for async.
 *
 * @param {object} params
 * @param {Array}  params.farmerSnapshots - Array of { snapshot, benchmarks } per farmer
 * @param {object} params.shockVariables  - { rainfall_deviation_pct, price_change_pct, temperature_deviation_celsius }
 * @param {string} params.computationMode - 'deterministic' | 'monte_carlo'
 * @param {number} params.monteCarloRuns
 * @param {Function} [params.onProgress]  - Optional progress callback (pct)
 * @returns {object} Aggregated portfolio result
 */
const computePortfolio = ({
  farmerSnapshots,
  shockVariables,
  computationMode = 'deterministic',
  monteCarloRuns = 500,
  onProgress = null,
}) => {
  const rainfallDev = shockVariables.rainfall_deviation_pct || 0;
  const priceFactor = 1 + (shockVariables.price_change_pct || 0) / 100;
  const tempDev = shockVariables.temperature_deviation_celsius || 0;

  const farmerResults = [];
  const total = farmerSnapshots.length;

  for (let i = 0; i < total; i++) {
    const { snapshot, benchmarks } = farmerSnapshots[i];

    try {
      // Run baseline (no stress)
      const baseline = runFarmerScenario(snapshot, benchmarks, {
        rainfallDev: 0, tempDev: 0, priceFactor: 1.0,
      });

      // Run stressed scenario
      const stressed = runFarmerScenario(snapshot, benchmarks, {
        rainfallDev, tempDev, priceFactor,
      });

      // MC for probability (lightweight — fewer runs per farmer)
      let mcProbabilities = null;
      if (computationMode === 'monte_carlo') {
        mcProbabilities = runFarmerMC(snapshot, benchmarks, {
          rainfallDev, tempDev, priceFactor,
          numRuns: Math.min(monteCarloRuns, 200), // cap per farmer
        });
      }

      farmerResults.push({
        farmerId: snapshot.farmer_id,
        districtId: snapshot.district_id,
        outstanding: parseFloat(snapshot.total_outstanding) || 0,
        monthlyEmi: parseFloat(snapshot.total_monthly_emi) || 0,
        trustScore: snapshot.trust_score,
        baseline: {
          netIncome: baseline.netFarmIncome,
          healthStatus: baseline.healthStatus,
          smaClass: baseline.smaClass,
          riskScore: baseline.riskScore,
        },
        stressed: {
          netIncome: stressed.netFarmIncome,
          healthStatus: stressed.healthStatus,
          smaClass: stressed.smaClass,
          riskScore: stressed.riskScore,
          emiToIncomeRatio: stressed.emiToIncomeRatio,
        },
        incomeChange: round2(stressed.netFarmIncome - baseline.netFarmIncome),
        statusMigration: baseline.healthStatus !== stressed.healthStatus
          ? `${baseline.healthStatus}→${stressed.healthStatus}`
          : 'no_change',
        mcProbabilities,
      });
    } catch (err) {
      logger.warn(`DRISHTI: portfolio sim failed for farmer ${snapshot.farmer_id}: ${err.message}`);
      farmerResults.push({
        farmerId: snapshot.farmer_id,
        error: err.message,
        baseline: null,
        stressed: null,
      });
    }

    if (onProgress && (i + 1) % 10 === 0) {
      onProgress(Math.round(((i + 1) / total) * 100));
    }
  }

  // ── Aggregate portfolio metrics ──
  return aggregatePortfolio(farmerResults, shockVariables, computationMode);
};

// ─── Per-Farmer Stress Scenario ─────────────────────────────────────

const runFarmerScenario = (snapshot, benchmarks, { rainfallDev, tempDev, priceFactor }) => {
  const farmRevenue = { crop: new Array(12).fill(0), dairy: new Array(12).fill(0), fishery: new Array(12).fill(0) };
  const farmCosts = { crop: new Array(12).fill(0), dairy: new Array(12).fill(0), fishery: new Array(12).fill(0) };
  let totalRevenue = 0;
  let totalCost = 0;

  const delayPenalty = 0; // No monsoon delay in portfolio-level sim (rainfall captures it)
  const floodPenalty = rainfallDev > 0 ? FLOOD_YIELD_CURVE(rainfallDev) : 0;
  const combinedYieldFactor = (1 - delayPenalty) * (1 - floodPenalty);

  // Crops
  const activeCrops = snapshot.active_crop_cycles || [];
  const acreagePerCrop = (parseFloat(snapshot.total_farm_size_hectares) || 1) / Math.max(activeCrops.length, 1);

  for (const crop of activeCrops) {
    const benchmark = findBenchmark(benchmarks, 'crop', crop.cropId);
    const harvestOffset = { kharif: 5, rabi: 4, summer: 3, annual: 6 }[crop.season] || 5;
    const sowingMonth = { kharif: 5, rabi: 10, summer: 1, annual: 0 }[crop.season] || 5;

    const rev = calculateCropRevenue({
      snapshot, benchmark, cropId: crop.cropId,
      acreageHectares: acreagePerCrop,
      season: crop.season, irrigationType: 'rainfed',
      rainfallDeviationPct: rainfallDev,
      yieldFactor: combinedYieldFactor,
      priceFactor,
      harvestMonthOffset: harvestOffset,
    });
    const cost = estimateCropCost({ benchmark, acreageHectares: acreagePerCrop, sowingMonthOffset: sowingMonth, cycleMonths: harvestOffset + 1 });

    for (let i = 0; i < 12; i++) {
      farmRevenue.crop[i] += rev.monthlyRevenue[i] || 0;
      farmCosts.crop[i] += cost.monthlyCosts[i] || 0;
    }
    totalRevenue += rev.totalRevenue;
    totalCost += cost.totalCost;
  }

  // Dairy
  if (snapshot.active_dairy_profile) {
    const animalCount = snapshot.active_dairy_profile.animalCount || 0;
    if (animalCount > 0) {
      const dBm = findBenchmark(benchmarks, 'dairy');
      const rev = calculateDairyRevenue({ snapshot, benchmark: dBm, animalCount });
      const feedMult = DAIRY_FEED_COST_MULTIPLIER(rainfallDev);
      const cost = estimateDairyCost({ benchmark: dBm, animalCount, costFactor: feedMult });
      for (let i = 0; i < 12; i++) {
        farmRevenue.dairy[i] = rev.monthlyRevenueArray[i] || 0;
        farmCosts.dairy[i] = cost.monthlyCosts[i] || 0;
      }
      totalRevenue += rev.annualRevenue;
      totalCost += cost.annualCost;
    }
  }

  // Fishery
  if (snapshot.active_fishery_profile) {
    const pond = snapshot.active_fishery_profile.totalPondAreaHectares || 0;
    if (pond > 0) {
      const fBm = findBenchmark(benchmarks, 'fishery');
      const stressFactor = FISHERY_STRESS_FACTOR(rainfallDev, tempDev);
      const rev = calculateFisheryRevenue({ snapshot, benchmark: fBm, pondAreaHectares: pond });
      const cost = estimateFisheryCost({ benchmark: fBm, pondAreaHectares: pond });
      for (let i = 0; i < 12; i++) {
        farmRevenue.fishery[i] = round2((rev.monthlyRevenueArray[i] || 0) * stressFactor);
        farmCosts.fishery[i] = cost.monthlyCosts[i] || 0;
      }
      totalRevenue += round2(rev.annualRevenue * stressFactor);
      totalCost += cost.totalCycleCost;
    }
  }

  const cashFlow = projectCashFlow({ snapshot, horizonMonths: 12, farmRevenue, farmCosts });
  const netFarmIncome = round2(totalRevenue - totalCost);
  const totalIncomeWithOther = round2(netFarmIncome + (cashFlow.summary.totalNonFarmIncome || 0));
  const monthlyIncome = totalIncomeWithOther / 12;
  const monthlyEmi = parseFloat(snapshot.total_monthly_emi) || 0;
  const emiToIncomeRatio = monthlyIncome > 0 ? round2(monthlyEmi / monthlyIncome) : 99;

  const risk = computeRiskScore({
    snapshot, cashFlowSummary: cashFlow.summary,
    irrigationType: 'rainfed', rainfallDeviationPct: rainfallDev,
    projectedNetIncome: netFarmIncome,
  });

  return { netFarmIncome, totalIncomeWithOther, emiToIncomeRatio, ...risk };
};

// ─── Per-Farmer Monte Carlo ─────────────────────────────────────────

const runFarmerMC = (snapshot, benchmarks, { rainfallDev, tempDev, priceFactor, numRuns }) => {
  const computeFn = (vars) => {
    const result = runFarmerScenario(snapshot, benchmarks, {
      rainfallDev: vars.rainfall_deviation_pct,
      tempDev: vars.temperature_deviation_c,
      priceFactor: vars.price_factor,
    });
    return {
      netIncome: result.netFarmIncome,
      healthStatus: result.healthStatus,
      smaClass: result.smaClass,
      riskScore: result.riskScore,
    };
  };

  const mc = runMonteCarlo({
    computeFn,
    baseVariables: { rainfall_deviation_pct: rainfallDev, temperature_deviation_c: tempDev, price_factor: priceFactor, yield_factor: 1.0, cost_factor: 1.0 },
    distributions: {
      rainfall_deviation_pct: { mean: rainfallDev, stddev: 8, min: -80, max: 80, type: 'normal' },
      temperature_deviation_c: { mean: tempDev, stddev: 0.8, min: -3, max: 10, type: 'normal' },
      price_factor: { mean: priceFactor, stddev: 0.10, min: 0.5, max: 2.0, type: 'normal' },
      yield_factor: DEFAULT_DISTRIBUTIONS.yield_factor,
      cost_factor: DEFAULT_DISTRIBUTIONS.cost_factor,
    },
    numRuns,
  });

  return {
    probabilityProfitable: mc.probabilities.profitable,
    probabilitySmaStress: mc.probabilities.sma_stress,
    probabilityDefault: mc.probabilities.loan_default,
    incomeP10: mc.percentiles.income_p10,
    incomeP50: mc.percentiles.income_p50,
    incomeP90: mc.percentiles.income_p90,
  };
};

// ─── Portfolio Aggregation ──────────────────────────────────────────

const aggregatePortfolio = (farmerResults, shockVariables, computationMode) => {
  const validResults = farmerResults.filter(r => r.baseline && r.stressed);
  const totalFarmers = farmerResults.length;
  const processedFarmers = validResults.length;

  // Portfolio financial summary
  const totalOutstanding = validResults.reduce((s, r) => s + r.outstanding, 0);
  const currentNpaCount = validResults.filter(r => r.baseline.healthStatus === 'npa').length;
  const currentNpaAmount = validResults
    .filter(r => r.baseline.healthStatus === 'npa')
    .reduce((s, r) => s + r.outstanding, 0);

  // Projected under stress
  const projectedNpaCount = validResults.filter(r => r.stressed.healthStatus === 'npa').length;
  const projectedNpaAmount = validResults
    .filter(r => r.stressed.healthStatus === 'npa')
    .reduce((s, r) => s + r.outstanding, 0);

  // SMA migration matrix
  const smaMigration = buildSmaMigration(validResults);

  // Top-N intervention candidates (sorted by risk score descending)
  const interventionCandidates = validResults
    .filter(r => r.stressed.healthStatus !== 'good')
    .sort((a, b) => b.stressed.riskScore - a.stressed.riskScore)
    .slice(0, INTERVENTION_TOP_N)
    .map(r => ({
      farmer_id: r.farmerId,
      outstanding: r.outstanding,
      current_status: r.baseline.healthStatus,
      projected_status: r.stressed.healthStatus,
      risk_score: r.stressed.riskScore,
      income_change: r.incomeChange,
      primary_risk: r.stressed.emiToIncomeRatio > 0.5 ? 'high_emi_burden' : 'income_decline',
    }));

  // Portfolio VaR (95th percentile loss)
  const losses = validResults.map(r => r.incomeChange).sort((a, b) => a - b);
  const var95 = losses.length > 0 ? round2(Math.abs(percentile(losses, 5))) : 0;

  // MC aggregate probabilities
  let mcAggregate = null;
  if (computationMode === 'monte_carlo') {
    const mcResults = validResults.filter(r => r.mcProbabilities);
    if (mcResults.length > 0) {
      mcAggregate = {
        avg_probability_profitable: round2(mcResults.reduce((s, r) => s + r.mcProbabilities.probabilityProfitable, 0) / mcResults.length),
        avg_probability_sma_stress: round2(mcResults.reduce((s, r) => s + r.mcProbabilities.probabilitySmaStress, 0) / mcResults.length),
        avg_probability_default: round2(mcResults.reduce((s, r) => s + r.mcProbabilities.probabilityDefault, 0) / mcResults.length),
        portfolio_income_p10: round2(mcResults.reduce((s, r) => s + r.mcProbabilities.incomeP10, 0)),
        portfolio_income_p50: round2(mcResults.reduce((s, r) => s + r.mcProbabilities.incomeP50, 0)),
      };
    }
  }

  // Build scenarios for storage
  const scenarios = [{
    label: 'portfolio_stress',
    label_key: 'drishti.scenario.portfolio_stress',
    description: describeShock(shockVariables),
    assumptions: shockVariables,
    projections: {
      total_revenue: round2(validResults.reduce((s, r) => s + (r.stressed.netIncome > 0 ? r.stressed.netIncome + r.outstanding * 0.1 : 0), 0)),
      total_cost: 0,
      net_farm_income: round2(validResults.reduce((s, r) => s + r.stressed.netIncome, 0)),
      total_income_with_other: 0,
      emi_burden_monthly: 0,
      emi_to_income_ratio: 0,
      breakeven_yield_kg_per_hectare: null,
      projected_yield_kg_per_hectare: null,
      yield_safety_margin_pct: null,
      health_status: projectedNpaCount > currentNpaCount * 2 ? 'stressed' : 'watch',
      sma_classification: 'standard',
      income_adequacy: 'adequate',
      risk_score: null,
    },
    monthly_cashflow: [],
    cash_flow_summary: {},
  }];

  // Recommendations
  const recommendations = generatePortfolioRecommendations(
    totalFarmers, projectedNpaCount, currentNpaCount, smaMigration, var95, totalOutstanding, interventionCandidates
  );

  return {
    farmerSummary: null, // Portfolio-level, no individual farmer summary
    portfolioSummary: {
      total_farmers: totalFarmers,
      processed_farmers: processedFarmers,
      failed_farmers: totalFarmers - processedFarmers,
      total_outstanding: round2(totalOutstanding),
      current_npa_count: currentNpaCount,
      current_npa_amount: round2(currentNpaAmount),
    },
    stressImpact: {
      projected_npa_count: projectedNpaCount,
      projected_npa_amount: round2(projectedNpaAmount),
      additional_npa_count: projectedNpaCount - currentNpaCount,
      additional_npa_amount: round2(projectedNpaAmount - currentNpaAmount),
      portfolio_at_risk_pct: totalOutstanding > 0
        ? round2((projectedNpaAmount / totalOutstanding) * 100)
        : 0,
      sma_migration: smaMigration,
    },
    portfolioVar95: var95,
    interventionList: interventionCandidates,
    monteCarlo: mcAggregate,
    scenarios,
    riskFactors: identifyPortfolioRisks(smaMigration, projectedNpaCount, currentNpaCount, var95, totalOutstanding),
    recommendations,
  };
};

// ─── SMA Migration Matrix ───────────────────────────────────────────

const buildSmaMigration = (results) => {
  const migration = {
    good_to_watch: 0,
    good_to_stressed: 0,
    good_to_npa: 0,
    watch_to_stressed: 0,
    watch_to_npa: 0,
    stressed_to_npa: 0,
    improved: 0,
    no_change: 0,
  };

  const STATUS_ORDER = { good: 0, watch: 1, stressed: 2, npa: 3 };

  for (const r of results) {
    const from = r.baseline.healthStatus;
    const to = r.stressed.healthStatus;

    if (from === to) { migration.no_change++; continue; }

    const fromOrder = STATUS_ORDER[from] ?? 0;
    const toOrder = STATUS_ORDER[to] ?? 0;

    if (toOrder < fromOrder) { migration.improved++; continue; }

    const key = `${from}_to_${to}`;
    if (migration[key] !== undefined) migration[key]++;
  }

  return migration;
};

// ─── Risk Factors ───────────────────────────────────────────────────

const identifyPortfolioRisks = (smaMigration, projNpa, currNpa, var95, totalOutstanding) => {
  const factors = [];

  const npaIncrease = projNpa - currNpa;
  if (npaIncrease > 0) {
    factors.push({
      factor: 'NPA increase',
      impact: npaIncrease > 10 ? 'high' : 'medium',
      message_key: 'drishti.risk.portfolio_npa',
      message: `${npaIncrease} additional farmers projected to become NPA under stress`,
    });
  }

  const totalDeteriorations = smaMigration.good_to_watch + smaMigration.good_to_stressed + smaMigration.good_to_npa
    + smaMigration.watch_to_stressed + smaMigration.watch_to_npa + smaMigration.stressed_to_npa;
  if (totalDeteriorations > 0) {
    factors.push({
      factor: 'SMA migration',
      impact: totalDeteriorations > 20 ? 'high' : 'medium',
      message_key: 'drishti.risk.sma_migration',
      message: `${totalDeteriorations} farmers projected to deteriorate in loan health classification`,
    });
  }

  if (var95 > 0 && totalOutstanding > 0) {
    const varPct = round2((var95 / totalOutstanding) * 100);
    factors.push({
      factor: 'Portfolio Value at Risk',
      impact: varPct > 10 ? 'high' : 'medium',
      message_key: 'drishti.risk.portfolio_var',
      message: `95th percentile income loss: ₹${Math.round(var95).toLocaleString('en-IN')} (${varPct}% of portfolio)`,
    });
  }

  return factors;
};

// ─── Recommendations ────────────────────────────────────────────────

const generatePortfolioRecommendations = (totalFarmers, projNpa, currNpa, smaMigration, var95, totalOutstanding, interventions) => {
  const recs = [];

  const npaIncrease = projNpa - currNpa;
  if (npaIncrease === 0) {
    recs.push({ type: 'info', message_key: 'drishti.rec.portfolio_resilient', message: 'Portfolio shows resilience under this stress scenario — no additional NPAs expected' });
  } else if (npaIncrease <= 5) {
    recs.push({ type: 'warning', message_key: 'drishti.rec.portfolio_mild', message: `${npaIncrease} additional NPAs expected — proactive outreach recommended for flagged farmers` });
  } else {
    recs.push({ type: 'warning', message_key: 'drishti.rec.portfolio_severe', message: `${npaIncrease} additional NPAs expected (₹${Math.round(var95).toLocaleString('en-IN')} at risk) — immediate intervention needed` });
  }

  if (interventions.length > 0) {
    recs.push({
      type: 'action',
      message_key: 'drishti.rec.portfolio_intervention',
      message: `${interventions.length} farmers flagged for proactive intervention — top risk: farmer ${interventions[0].farmer_id} (risk score ${interventions[0].risk_score})`,
    });
  }

  const watchToStressed = smaMigration.watch_to_stressed + smaMigration.watch_to_npa;
  if (watchToStressed > 5) {
    recs.push({
      type: 'action',
      message_key: 'drishti.rec.portfolio_watch_list',
      message: `${watchToStressed} "watch" farmers projected to deteriorate — consider restructuring or insurance nudges before stress materializes`,
    });
  }

  return recs;
};

// ─── Helpers ────────────────────────────────────────────────────────

const findBenchmark = (benchmarks, activityType, cropId) => {
  if (!benchmarks || benchmarks.length === 0) return null;
  if (activityType === 'crop') {
    return benchmarks.find(b => b.crop_id === cropId && b.activity_type === 'crop')
      || benchmarks.find(b => b.activity_type === 'crop')
      || null;
  }
  return benchmarks.find(b => b.activity_type === activityType) || null;
};

const describeShock = (vars) => {
  const parts = [];
  if (vars.rainfall_deviation_pct) parts.push(`${vars.rainfall_deviation_pct}% rainfall`);
  if (vars.price_change_pct) parts.push(`${vars.price_change_pct}% price change`);
  if (vars.temperature_deviation_celsius) parts.push(`+${vars.temperature_deviation_celsius}°C temp`);
  return `Portfolio stress: ${parts.join(', ')}`;
};

const percentile = (sorted, p) => {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return round2(sorted[lo]);
  return round2(sorted[lo] * (1 - (idx - lo)) + sorted[hi] * (idx - lo));
};

const round2 = (n) => Math.round((n || 0) * 100) / 100;

module.exports = {
  computePortfolio,
  SYNC_FARMER_LIMIT,
  CHUNK_SIZE,
};
