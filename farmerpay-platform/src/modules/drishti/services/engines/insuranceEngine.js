/**
 * Insurance Decision Engine
 *
 * Answers: "Is PMFBY / livestock / aquaculture insurance worth it for me?"
 *
 * Compares two trajectories — insured vs uninsured — across multiple stress
 * scenarios and Monte Carlo yield distributions.
 *
 * Supports:
 *  - PMFBY (Pradhan Mantri Fasal Bima Yojana) — crop insurance
 *  - RWBCIS (Restructured Weather Based Crop Insurance Scheme) — weather index
 *  - Livestock insurance
 *  - Aquaculture insurance
 *
 * Outputs:
 *  - Side-by-side insured vs uninsured financial trajectory
 *  - Expected payout frequency and average payout amount
 *  - Net benefit over 5-year horizon (payouts − premiums)
 *  - Break-even analysis: how often must claims trigger to be worth it
 *  - Confidence-scored recommendation (ENROLL / OPTIONAL / SKIP)
 *
 * No DB access — pure function on snapshot + benchmarks.
 */

const { projectCropYield } = require('../computation/yieldProjector');
const { calculateCropRevenue, calculateDairyRevenue, calculateFisheryRevenue } = require('../computation/revenueCalculator');
const { estimateCropCost, estimateDairyCost, estimateFisheryCost } = require('../computation/costEstimator');
const { projectCashFlow } = require('../computation/cashFlowProjector');
const { computeRiskScore } = require('../computation/riskScorer');
const { runMonteCarlo, DEFAULT_DISTRIBUTIONS } = require('../computation/monteCarloSimulator');

// ─── Premium Rates (farmer's share after govt subsidy) ──────────────
// PMFBY: Kharif 2%, Rabi 1.5%, Horticulture 5%
// Livestock: ~3-4% of sum insured
// Aquaculture: ~4-5% of sum insured
// Weather index: ~3% of sum insured

const PREMIUM_RATES = {
  pmfby: { kharif: 0.02, rabi: 0.015, summer: 0.05, annual: 0.02 },
  weather_index: { kharif: 0.03, rabi: 0.03, summer: 0.03, annual: 0.03 },
  livestock: { default: 0.035 },
  aquaculture: { default: 0.045 },
};

// ─── Claim trigger thresholds ───────────────────────────────────────
// PMFBY triggers when actual yield < threshold yield (typically 70% of avg)
const CLAIM_TRIGGER_YIELD_PCT = 0.70; // Payout triggers if yield < 70% of benchmark
const CLAIM_PAYOUT_FORMULA_FACTOR = 1.0; // payout = (threshold - actual) / threshold × sum_insured

// ─── 5-Year Projection Constants ────────────────────────────────────
const PROJECTION_YEARS = 5;

// ─── Main Compute ───────────────────────────────────────────────────

/**
 * @param {object} params
 * @param {object} params.snapshot
 * @param {Array}  params.benchmarks
 * @param {object} params.input - Validated request body
 * @returns {object} Full result matching Insurance Decision API contract
 */
const compute = ({ snapshot, benchmarks, input }) => {
  const {
    insurance_type,
    sum_insured,
    premium_amount,
    activity,
    stress_scenarios: userStress,
    computation_mode = 'deterministic',
    monte_carlo_runs = 1000,
  } = input;

  // ── Resolve benchmark ──
  const benchmark = findBenchmark(benchmarks, activity);

  // ── Calculate premium ──
  const premium = resolvePremium(insurance_type, sum_insured, premium_amount, activity.season);

  // ── Build stress scenarios ──
  const stressScenarios = userStress && userStress.length > 0
    ? userStress
    : getDefaultStressScenarios(insurance_type);

  // ── Run insured vs uninsured for each stress scenario ──
  const scenarioResults = stressScenarios.map(scenario =>
    runInsuranceComparison(snapshot, benchmark, activity, sum_insured, premium, insurance_type, scenario)
  );

  // ── Run base (no stress) comparison ──
  const baseComparison = runInsuranceComparison(
    snapshot, benchmark, activity, sum_insured, premium, insurance_type,
    { label: 'normal', rainfall_deviation_pct: 0, yield_factor: 1.0 }
  );

  // ── Monte Carlo analysis ──
  let monteCarloResult = null;
  if (computation_mode === 'monte_carlo') {
    monteCarloResult = runInsuranceMC(
      snapshot, benchmark, activity, sum_insured, premium, insurance_type, monte_carlo_runs
    );
  }

  // ── 5-year projection ──
  const fiveYearAnalysis = project5YearBenefit(
    premium, sum_insured, benchmark, insurance_type, monteCarloResult
  );

  // ── Break-even analysis ──
  const breakEven = computeBreakEven(premium, sum_insured, benchmark);

  // ── Build recommendation ──
  const recommendation = generateRecommendation(
    fiveYearAnalysis, breakEven, monteCarloResult, scenarioResults, premium, sum_insured
  );

  // ── Format scenarios for drishtiService storage ──
  const scenarios = [
    formatStorageScenario('without_insurance', baseComparison.uninsured, { insurance: false }),
    formatStorageScenario('with_insurance', baseComparison.insured, { insurance: true, premium, sum_insured }),
  ];

  return {
    farmerSummary: buildFarmerSummary(snapshot),
    insuranceTerms: {
      insurance_type,
      sum_insured,
      premium_per_season: premium,
      premium_annual: round2(premium * seasonsPerYear(activity.season)),
      premium_as_pct_of_sum: round2((premium / sum_insured) * 100),
      activity_type: activity.type,
      crop_id: activity.crop_id || null,
      season: activity.season || null,
      claim_trigger_yield_pct: round2(CLAIM_TRIGGER_YIELD_PCT * 100),
    },
    baseComparison: {
      normal_conditions: {
        without_insurance: formatComparisonSide(baseComparison.uninsured),
        with_insurance: formatComparisonSide(baseComparison.insured),
        premium_cost_impact: round2(premium),
      },
    },
    stressComparisons: scenarioResults.map(sr => ({
      scenario: sr.scenario,
      without_insurance: formatComparisonSide(sr.uninsured),
      with_insurance: formatComparisonSide(sr.insured),
      insurance_payout: sr.payout,
      net_benefit: sr.netBenefit,
    })),
    fiveYearAnalysis,
    breakEven,
    monteCarlo: monteCarloResult ? {
      num_runs: monteCarloResult.numRuns,
      expected_payout_frequency: monteCarloResult.payoutFrequency,
      average_payout_amount: monteCarloResult.avgPayout,
      payout_probability: monteCarloResult.payoutProbability,
      expected_annual_benefit: monteCarloResult.expectedAnnualBenefit,
      income_p10_uninsured: monteCarloResult.uninsuredP10,
      income_p10_insured: monteCarloResult.insuredP10,
      income_p50_uninsured: monteCarloResult.uninsuredP50,
      income_p50_insured: monteCarloResult.insuredP50,
      worst_case_loss_uninsured: monteCarloResult.worstCaseUninsured,
      worst_case_loss_insured: monteCarloResult.worstCaseInsured,
    } : null,
    scenarios,
    recommendation,
    riskFactors: identifyRiskFactors(snapshot, scenarioResults, insurance_type, premium, sum_insured),
    recommendations: buildRecommendationsList(recommendation, fiveYearAnalysis, breakEven, monteCarloResult, insurance_type),
  };
};

// ─── Insurance Comparison Runner ────────────────────────────────────

const runInsuranceComparison = (snapshot, benchmark, activity, sumInsured, premium, insuranceType, stressScenario) => {
  const rainfallDev = stressScenario.rainfall_deviation_pct || 0;
  const yieldFactor = stressScenario.yield_factor || 1.0;

  // ── Compute uninsured outcome ──
  const uninsured = computeActivityOutcome(snapshot, benchmark, activity, rainfallDev, yieldFactor);

  // ── Compute insured outcome (same yields, but with payout + premium) ──
  const insured = { ...uninsured };

  // Calculate claim payout
  const payout = calculatePayout(benchmark, activity, insuranceType, sumInsured, rainfallDev, yieldFactor, uninsured);

  insured.netIncome = round2(uninsured.netIncome - premium + payout);
  insured.totalRevenue = round2(uninsured.totalRevenue + payout);
  insured.premiumPaid = premium;
  insured.payoutReceived = payout;

  const netBenefit = round2(payout - premium);

  return {
    scenario: stressScenario,
    uninsured,
    insured,
    payout,
    netBenefit,
  };
};

const computeActivityOutcome = (snapshot, benchmark, activity, rainfallDev, yieldFactor) => {
  if (activity.type === 'crop') {
    const acreage = activity.acreage_hectares || parseFloat(snapshot.total_farm_size_hectares) || 1;

    const yield_ = projectCropYield({
      benchmark, snapshot, cropId: activity.crop_id,
      irrigationType: 'rainfed', rainfallDeviationPct: rainfallDev, yieldFactor,
    });

    const costPerHa = benchmark ? parseFloat(benchmark.avg_cost_per_hectare) || 55000 : 55000;
    const totalCost = round2(costPerHa * acreage);
    const pricePerKg = getSpotPrice(snapshot, activity.crop_id);
    const totalRevenue = round2(yield_.yieldKgPerHectare * acreage * pricePerKg);
    const netIncome = round2(totalRevenue - totalCost);

    return {
      totalRevenue,
      totalCost,
      netIncome,
      yieldKgPerHectare: yield_.yieldKgPerHectare,
      pricePerKg,
      acreageHectares: acreage,
    };
  }

  if (activity.type === 'dairy') {
    const animalCount = activity.animal_count || (snapshot.active_dairy_profile ? snapshot.active_dairy_profile.animalCount : 0);
    const rev = calculateDairyRevenue({ snapshot, benchmark, animalCount });
    const cost = estimateDairyCost({ benchmark, animalCount });
    // Apply yield factor as survival/productivity factor
    const adjustedRevenue = round2(rev.annualRevenue * yieldFactor);
    return { totalRevenue: adjustedRevenue, totalCost: cost.annualCost, netIncome: round2(adjustedRevenue - cost.annualCost) };
  }

  if (activity.type === 'fishery') {
    const pondArea = activity.pond_area_hectares || (snapshot.active_fishery_profile ? snapshot.active_fishery_profile.totalPondAreaHectares : 0);
    const rev = calculateFisheryRevenue({ snapshot, benchmark, pondAreaHectares: pondArea });
    const cost = estimateFisheryCost({ benchmark, pondAreaHectares: pondArea });
    const adjustedRevenue = round2(rev.annualRevenue * yieldFactor);
    return { totalRevenue: adjustedRevenue, totalCost: cost.totalCycleCost, netIncome: round2(adjustedRevenue - cost.totalCycleCost) };
  }

  return { totalRevenue: 0, totalCost: 0, netIncome: 0 };
};

// ─── Payout Calculation ─────────────────────────────────────────────

const calculatePayout = (benchmark, activity, insuranceType, sumInsured, rainfallDev, yieldFactor, outcome) => {
  if (insuranceType === 'pmfby' || insuranceType === 'weather_index') {
    // PMFBY: payout triggers when yield < threshold (70% of benchmark avg)
    const benchmarkYield = benchmark ? parseFloat(benchmark.avg_yield_kg_per_hectare) || 3600 : 3600;
    const thresholdYield = benchmarkYield * CLAIM_TRIGGER_YIELD_PCT;
    const actualYield = outcome.yieldKgPerHectare || benchmarkYield * yieldFactor;

    if (actualYield >= thresholdYield) return 0; // No claim triggered

    // Payout proportional to shortfall
    const shortfallRatio = (thresholdYield - actualYield) / thresholdYield;
    return round2(Math.min(shortfallRatio * sumInsured * CLAIM_PAYOUT_FORMULA_FACTOR, sumInsured));
  }

  if (insuranceType === 'livestock') {
    // Livestock: payout on mortality/disease. Triggered by yield_factor < 0.6 (proxy for mortality)
    if (yieldFactor >= 0.6) return 0;
    const severityRatio = (0.6 - yieldFactor) / 0.6;
    return round2(Math.min(severityRatio * sumInsured, sumInsured));
  }

  if (insuranceType === 'aquaculture') {
    // Aquaculture: payout on mass mortality. Triggered by yield_factor < 0.5
    if (yieldFactor >= 0.5) return 0;
    const severityRatio = (0.5 - yieldFactor) / 0.5;
    return round2(Math.min(severityRatio * sumInsured, sumInsured));
  }

  return 0;
};

// ─── Monte Carlo Insurance Analysis ─────────────────────────────────

const runInsuranceMC = (snapshot, benchmark, activity, sumInsured, premium, insuranceType, numRuns) => {
  const uninsuredIncomes = [];
  const insuredIncomes = [];
  let payoutCount = 0;
  let totalPayouts = 0;

  const computeFn = (vars) => {
    const rainfallDev = vars.rainfall_deviation_pct || 0;
    const yieldFactor = vars.yield_factor || 1.0;

    const uninsured = computeActivityOutcome(snapshot, benchmark, activity, rainfallDev, yieldFactor);
    const payout = calculatePayout(benchmark, activity, insuranceType, sumInsured, rainfallDev, yieldFactor, uninsured);
    const insuredIncome = uninsured.netIncome - premium + payout;

    uninsuredIncomes.push(uninsured.netIncome);
    insuredIncomes.push(insuredIncome);

    if (payout > 0) {
      payoutCount++;
      totalPayouts += payout;
    }

    return {
      netIncome: uninsured.netIncome,
      net_income: uninsured.netIncome,
      healthStatus: uninsured.netIncome > 0 ? 'good' : 'stressed',
      smaClass: uninsured.netIncome > 0 ? 'standard' : 'npa',
    };
  };

  const mcResult = runMonteCarlo({
    computeFn,
    baseVariables: { yield_factor: 1.0, rainfall_deviation_pct: 0, cost_factor: 1.0, price_factor: 1.0 },
    distributions: DEFAULT_DISTRIBUTIONS,
    numRuns,
  });

  uninsuredIncomes.sort((a, b) => a - b);
  insuredIncomes.sort((a, b) => a - b);

  const payoutFrequency = round2(payoutCount / numRuns);
  const avgPayout = payoutCount > 0 ? round2(totalPayouts / payoutCount) : 0;
  const expectedAnnualBenefit = round2(payoutFrequency * avgPayout - premium);

  return {
    numRuns,
    payoutFrequency,
    payoutProbability: payoutFrequency,
    avgPayout,
    expectedAnnualBenefit,
    uninsuredP10: percentile(uninsuredIncomes, 10),
    uninsuredP50: percentile(uninsuredIncomes, 50),
    insuredP10: percentile(insuredIncomes, 10),
    insuredP50: percentile(insuredIncomes, 50),
    worstCaseUninsured: uninsuredIncomes[0] || 0,
    worstCaseInsured: insuredIncomes[0] || 0,
    mcSummary: mcResult.summary,
  };
};

// ─── 5-Year Projection ─────────────────────────────────────────────

const project5YearBenefit = (premium, sumInsured, benchmark, insuranceType, mcResult) => {
  // Historical claim rate from benchmark or MC
  let annualClaimProb;
  let avgClaimPayout;

  if (mcResult) {
    annualClaimProb = mcResult.payoutFrequency;
    avgClaimPayout = mcResult.avgPayout;
  } else {
    annualClaimProb = benchmark
      ? (parseFloat(benchmark.historical_claim_rate_pct) || 25) / 100
      : 0.25;
    avgClaimPayout = round2(sumInsured * 0.4); // Avg payout ~40% of sum insured when triggered
  }

  const annualPremium = premium;
  const annualExpectedPayout = round2(annualClaimProb * avgClaimPayout);
  const annualNetBenefit = round2(annualExpectedPayout - annualPremium);

  const years = [];
  let cumulativePremiums = 0;
  let cumulativePayouts = 0;

  for (let y = 1; y <= PROJECTION_YEARS; y++) {
    cumulativePremiums += annualPremium;
    cumulativePayouts += annualExpectedPayout;
    const cumulativeNet = round2(cumulativePayouts - cumulativePremiums);

    years.push({
      year: y,
      premium_paid: round2(cumulativePremiums),
      expected_payouts: round2(cumulativePayouts),
      cumulative_net: cumulativeNet,
      net_positive: cumulativeNet > 0,
    });
  }

  const totalPremiums = round2(annualPremium * PROJECTION_YEARS);
  const totalExpectedPayouts = round2(annualExpectedPayout * PROJECTION_YEARS);

  return {
    projection_years: PROJECTION_YEARS,
    annual_premium: annualPremium,
    annual_claim_probability: annualClaimProb,
    annual_expected_payout: annualExpectedPayout,
    annual_net_benefit: annualNetBenefit,
    five_year_total_premiums: totalPremiums,
    five_year_expected_payouts: totalExpectedPayouts,
    five_year_net_benefit: round2(totalExpectedPayouts - totalPremiums),
    five_year_roi_pct: totalPremiums > 0
      ? round2(((totalExpectedPayouts - totalPremiums) / totalPremiums) * 100)
      : 0,
    yearly_breakdown: years,
    is_net_positive_5yr: totalExpectedPayouts > totalPremiums,
  };
};

// ─── Break-Even Analysis ────────────────────────────────────────────

const computeBreakEven = (premium, sumInsured, benchmark) => {
  // Break-even claim frequency: how often must a claim trigger for premiums to be worthwhile?
  const avgPayoutIfTriggered = round2(sumInsured * 0.4); // avg ~40% of sum insured

  const breakEvenFrequency = avgPayoutIfTriggered > 0
    ? round2(premium / avgPayoutIfTriggered)
    : 1;

  // Historical frequency from benchmark
  const historicalFrequency = benchmark
    ? (parseFloat(benchmark.historical_claim_rate_pct) || 25) / 100
    : 0.25;

  // Break-even yield: at what yield does the claim trigger?
  const benchmarkYield = benchmark ? parseFloat(benchmark.avg_yield_kg_per_hectare) || 3600 : 3600;
  const triggerYield = round2(benchmarkYield * CLAIM_TRIGGER_YIELD_PCT);

  // Is historical frequency above break-even?
  const worthIt = historicalFrequency >= breakEvenFrequency;

  return {
    break_even_claim_frequency: breakEvenFrequency,
    historical_claim_frequency: historicalFrequency,
    frequency_above_breakeven: worthIt,
    break_even_verdict: worthIt ? 'INSURANCE_WORTHWHILE' : 'MARGINAL_VALUE',
    trigger_yield_kg_per_hectare: triggerYield,
    benchmark_yield_kg_per_hectare: benchmarkYield,
    trigger_as_pct_of_benchmark: round2(CLAIM_TRIGGER_YIELD_PCT * 100),
    premium_to_payout_ratio: avgPayoutIfTriggered > 0 ? round2(premium / avgPayoutIfTriggered) : null,
  };
};

// ─── Recommendation ─────────────────────────────────────────────────

const generateRecommendation = (fiveYear, breakEven, mcResult, stressResults, premium, sumInsured) => {
  let verdict, confidence, reasoning;

  // Score from multiple signals
  let enrollScore = 0;

  // 5-year net positive
  if (fiveYear.is_net_positive_5yr) enrollScore += 30;

  // Break-even analysis
  if (breakEven.frequency_above_breakeven) enrollScore += 25;

  // MC payout frequency > 20%
  if (mcResult && mcResult.payoutFrequency > 0.20) enrollScore += 20;
  if (mcResult && mcResult.payoutFrequency > 0.35) enrollScore += 10;

  // Stress scenarios show large losses without insurance
  const maxUninsuredLoss = Math.min(...stressResults.map(sr => sr.uninsured.netIncome));
  const maxInsuredLoss = Math.min(...stressResults.map(sr => sr.insured.netIncome));
  if (maxUninsuredLoss < 0 && maxInsuredLoss > maxUninsuredLoss) enrollScore += 15;

  // Premium affordability (< 3% of sum insured is cheap)
  if (premium / sumInsured <= 0.03) enrollScore += 10;

  // Classify
  if (enrollScore >= 60) {
    verdict = 'ENROLL';
    confidence = enrollScore >= 80 ? 'high' : 'medium';
    reasoning = 'Insurance provides meaningful protection against likely weather/yield risks at an affordable premium';
  } else if (enrollScore >= 35) {
    verdict = 'OPTIONAL';
    confidence = 'medium';
    reasoning = 'Insurance offers some protection but the net benefit is marginal — consider if you can absorb losses from savings or non-farm income';
  } else {
    verdict = 'SKIP';
    confidence = enrollScore <= 15 ? 'high' : 'medium';
    reasoning = 'Expected payouts are unlikely to recover the premium cost — self-insure through savings and income diversification';
  }

  return {
    verdict,
    confidence,
    reasoning,
    enroll_score: enrollScore,
    premium_per_season: premium,
    sum_insured: sumInsured,
    expected_5yr_roi_pct: fiveYear.five_year_roi_pct,
  };
};

// ─── Risk Factors ───────────────────────────────────────────────────

const identifyRiskFactors = (snapshot, stressResults, insuranceType, premium, sumInsured) => {
  const factors = [];

  // Existing exposure
  if (!snapshot.active_insurance || snapshot.active_insurance.length === 0) {
    factors.push({
      factor: 'Currently uninsured',
      impact: 'high',
      message_key: 'drishti.risk.uninsured',
      message: 'No active insurance — all weather/yield risk is borne by the household',
    });
  }

  // Rainfed crop dependency
  if (snapshot.active_crop_cycles && snapshot.active_crop_cycles.length > 0) {
    factors.push({
      factor: 'Crop weather exposure',
      impact: 'medium',
      message_key: 'drishti.risk.crop_weather',
      message: 'Active crop cycles are exposed to monsoon variability',
    });
  }

  // Stress scenario shows negative income without insurance
  const worstUninsured = Math.min(...stressResults.map(sr => sr.uninsured.netIncome));
  if (worstUninsured < 0) {
    factors.push({
      factor: 'Negative income under stress',
      impact: 'high',
      message_key: 'drishti.risk.stress_loss',
      message: `Worst-case scenario shows ₹${Math.abs(Math.round(worstUninsured)).toLocaleString('en-IN')} net loss without insurance`,
    });
  }

  return factors;
};

// ─── Recommendations List ───────────────────────────────────────────

const buildRecommendationsList = (recommendation, fiveYear, breakEven, mcResult, insuranceType) => {
  const recs = [];

  // Main verdict
  recs.push({
    type: recommendation.verdict === 'ENROLL' ? 'action' : recommendation.verdict === 'SKIP' ? 'info' : 'info',
    message_key: `drishti.rec.insurance_${recommendation.verdict.toLowerCase()}`,
    message: recommendation.reasoning,
  });

  // 5-year ROI
  if (fiveYear.five_year_roi_pct > 0) {
    recs.push({
      type: 'info',
      message_key: 'drishti.rec.insurance_roi',
      message: `Over 5 years, expected ROI is ${fiveYear.five_year_roi_pct}% — payouts exceed premiums by ₹${Math.round(fiveYear.five_year_net_benefit).toLocaleString('en-IN')}`,
    });
  }

  // MC tail risk protection
  if (mcResult) {
    const tailProtection = round2(mcResult.insuredP10 - mcResult.uninsuredP10);
    if (tailProtection > 0) {
      recs.push({
        type: 'strength',
        message_key: 'drishti.rec.insurance_tail_risk',
        message: `Insurance improves your worst 10% outcomes by ₹${Math.round(tailProtection).toLocaleString('en-IN')}`,
      });
    }
  }

  // Break-even info
  recs.push({
    type: 'info',
    message_key: 'drishti.rec.insurance_breakeven',
    message: `Insurance breaks even if claims trigger ${Math.round(breakEven.break_even_claim_frequency * 100)}% of seasons — historical rate is ${Math.round(breakEven.historical_claim_frequency * 100)}%`,
  });

  // PMFBY-specific: government subsidy reminder
  if (insuranceType === 'pmfby') {
    recs.push({
      type: 'info',
      message_key: 'drishti.rec.pmfby_subsidy',
      message: 'PMFBY premium is heavily subsidized — farmer pays only 2% (kharif) or 1.5% (rabi); government covers the rest',
    });
  }

  return recs;
};

// ─── Helpers ────────────────────────────────────────────────────────

const resolvePremium = (insuranceType, sumInsured, premiumOverride, season) => {
  if (premiumOverride && premiumOverride > 0) return round2(premiumOverride);

  const rates = PREMIUM_RATES[insuranceType] || PREMIUM_RATES.pmfby;
  const rate = rates[season] || rates.default || 0.02;
  return round2(sumInsured * rate);
};

const seasonsPerYear = (season) => {
  if (season === 'annual') return 1;
  if (!season) return 1;
  return 1; // Most farmers insure one season at a time
};

const getDefaultStressScenarios = (insuranceType) => {
  if (insuranceType === 'livestock') {
    return [
      { label: 'mild_disease', rainfall_deviation_pct: 0, yield_factor: 0.8 },
      { label: 'epidemic', rainfall_deviation_pct: 0, yield_factor: 0.4 },
    ];
  }
  if (insuranceType === 'aquaculture') {
    return [
      { label: 'water_stress', rainfall_deviation_pct: -20, yield_factor: 0.7 },
      { label: 'mass_mortality', rainfall_deviation_pct: -30, yield_factor: 0.3 },
    ];
  }
  // Crop insurance default
  return [
    { label: 'mild_drought', rainfall_deviation_pct: -15, yield_factor: 0.85 },
    { label: 'severe_drought', rainfall_deviation_pct: -35, yield_factor: 0.55 },
    { label: 'flood', rainfall_deviation_pct: 45, yield_factor: 0.6 },
  ];
};

const findBenchmark = (benchmarks, activity) => {
  if (!benchmarks || benchmarks.length === 0) return null;
  if (activity.type === 'crop') {
    return benchmarks.find(b => b.crop_id === activity.crop_id && b.activity_type === 'crop')
      || benchmarks.find(b => b.activity_type === 'crop')
      || null;
  }
  return benchmarks.find(b => b.activity_type === activity.type) || null;
};

const getSpotPrice = (snapshot, commodityId) => {
  const prices = snapshot.relevant_commodity_prices || [];
  const match = prices.find(p => p.commodityId === commodityId);
  return match ? match.currentPrice || 0 : 22; // default ₹22/kg
};

const buildFarmerSummary = (snapshot) => ({
  district_id: snapshot.district_id,
  total_land_hectares: parseFloat(snapshot.total_farm_size_hectares) || 0,
  trust_score: snapshot.trust_score,
  existing_insurance: (snapshot.active_insurance || []).length,
});

const formatComparisonSide = (outcome) => ({
  total_revenue: outcome.totalRevenue,
  total_cost: outcome.totalCost,
  net_income: outcome.netIncome,
  premium_paid: outcome.premiumPaid || 0,
  payout_received: outcome.payoutReceived || 0,
});

const formatStorageScenario = (label, outcome, assumptions) => ({
  label,
  label_key: `drishti.scenario.${label}`,
  description: label === 'with_insurance' ? 'Financial position with insurance coverage' : 'Financial position without insurance',
  assumptions,
  projections: {
    total_revenue: outcome.totalRevenue,
    total_cost: outcome.totalCost,
    net_farm_income: outcome.netIncome,
    total_income_with_other: outcome.netIncome,
    emi_burden_monthly: 0,
    emi_to_income_ratio: 0,
    breakeven_yield_kg_per_hectare: null,
    projected_yield_kg_per_hectare: outcome.yieldKgPerHectare || null,
    yield_safety_margin_pct: null,
    health_status: outcome.netIncome > 0 ? 'good' : 'stressed',
    sma_classification: 'standard',
    income_adequacy: outcome.netIncome > 0 ? 'adequate' : 'marginal',
    risk_score: null,
  },
  monthly_cashflow: [],
  cash_flow_summary: {},
});

const percentile = (sorted, p) => {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return round2(sorted[lo]);
  return round2(sorted[lo] * (1 - (idx - lo)) + sorted[hi] * (idx - lo));
};

const round2 = (n) => Math.round((n || 0) * 100) / 100;

module.exports = { compute, PREMIUM_RATES, CLAIM_TRIGGER_YIELD_PCT };
