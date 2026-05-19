/**
 * Pre-Loan Engine
 *
 * Answers: "Should I take this loan?"
 *
 * Takes a farmer snapshot + proposed loan parameters, runs 3 climate scenarios
 * (optimistic / base / stress), and produces:
 *  - Projected P&L with monthly cash flow
 *  - EMI burden analysis
 *  - Breakeven yield
 *  - Risk score + health/SMA classification
 *  - Insurance comparison (optional)
 *  - Recommendation (SAFE / CAUTION / RISKY)
 *
 * No DB access — works entirely on the snapshot + benchmarks passed in.
 */

const { projectCropYield, projectDairyYield, projectFisheryYield } = require('../computation/yieldProjector');
const { forecastPrice } = require('../computation/priceForecaster');
const { estimateCropCost, estimateDairyCost, estimateFisheryCost } = require('../computation/costEstimator');
const { calculateCropRevenue, calculateDairyRevenue, calculateFisheryRevenue } = require('../computation/revenueCalculator');
const { projectCashFlow } = require('../computation/cashFlowProjector');
const { computeRiskScore } = require('../computation/riskScorer');

// ─── Three fixed scenario profiles (per design doc) ─────────────────

const SCENARIO_PROFILES = [
  {
    label: 'optimistic',
    labelKey: 'drishti.scenario.optimistic',
    description: 'Good monsoon, normal market conditions',
    rainfallDeviationPct: 10,
    yieldFactor: 1.15,
    priceFactor: 1.05,
    costFactor: 1.0,
  },
  {
    label: 'base',
    labelKey: 'drishti.scenario.base',
    description: 'Average conditions based on 5-year district history',
    rainfallDeviationPct: 0,
    yieldFactor: 1.0,
    priceFactor: 1.0,
    costFactor: 1.0,
  },
  {
    label: 'stress',
    labelKey: 'drishti.scenario.stress',
    description: 'Delayed monsoon, below-average rainfall',
    rainfallDeviationPct: -25,
    yieldFactor: 0.70,
    priceFactor: 0.95,
    costFactor: 1.05,
  },
];

// ─── Main Compute ───────────────────────────────────────────────────

/**
 * @param {object} params
 * @param {object} params.snapshot       - Full DrishtiFarmerSnapshot row
 * @param {object} params.benchmarks     - Array of DrishtiBenchmarkProfile for this district
 * @param {object} params.input          - Validated request body
 * @returns {object} Full result object matching the API contract
 */
const compute = ({ snapshot, benchmarks, input }) => {
  const {
    loan_amount, loan_tenure_months, repayment_type,
    activity, overrides = {}, include_insurance_comparison,
  } = input;

  // ── Resolve benchmark for the target activity ──
  const benchmark = findBenchmark(benchmarks, activity);

  // ── Resolve loan product interest rate ──
  const interestRate = resolveInterestRate(snapshot, input);

  // ── Compute loan terms ──
  const loanTerms = computeLoanTerms(loan_amount, interestRate, loan_tenure_months, repayment_type);

  // ── Build farmer summary ──
  const farmerSummary = buildFarmerSummary(snapshot);

  // ── Run 3 scenarios ──
  const scenarios = SCENARIO_PROFILES.map(profile =>
    runSingleScenario({
      profile,
      snapshot,
      benchmark,
      activity,
      loanTerms,
      overrides,
    })
  );

  // ── Insurance comparison (optional) ──
  let insuranceComparison = null;
  if (include_insurance_comparison && activity.type === 'crop') {
    insuranceComparison = computeInsuranceComparison(snapshot, benchmark, activity, scenarios);
  }

  // ── Risk factors ──
  const riskFactors = identifyRiskFactors(snapshot, activity, loanTerms, scenarios);

  // ── Recommendations ──
  const recommendations = generateRecommendations(scenarios, insuranceComparison, loanTerms, activity);

  return {
    farmerSummary,
    loanTerms,
    scenarios,
    insuranceComparison,
    riskFactors,
    recommendations,
  };
};

// ─── Single Scenario Runner ─────────────────────────────────────────

const runSingleScenario = ({ profile, snapshot, benchmark, activity, loanTerms, overrides }) => {
  const yieldFactor = (overrides.yield_factor || 1.0) * profile.yieldFactor;
  const priceFactor = profile.priceFactor;
  const costFactor = (overrides.input_cost_factor || 1.0) * profile.costFactor;

  // ── Revenue projection by activity type ──
  let revenue, costs, yieldProjection;
  const farmRevenue = { crop: new Array(12).fill(0), dairy: new Array(12).fill(0), fishery: new Array(12).fill(0) };
  const farmCosts = { crop: new Array(12).fill(0), dairy: new Array(12).fill(0), fishery: new Array(12).fill(0) };

  const sowingMonth = resolveSowingMonth(activity.season);

  if (activity.type === 'crop') {
    const cropRev = calculateCropRevenue({
      snapshot, benchmark, cropId: activity.crop_id,
      acreageHectares: activity.acreage_hectares,
      season: activity.season, irrigationType: activity.irrigation_type || 'rainfed',
      rainfallDeviationPct: profile.rainfallDeviationPct,
      yieldFactor, priceFactor,
      sellingPriceOverride: overrides.selling_price_override,
      harvestMonthOffset: resolveHarvestOffset(activity.season),
    });
    revenue = cropRev;
    yieldProjection = cropRev.yieldProjection;
    farmRevenue.crop = cropRev.monthlyRevenue;

    const cropCost = estimateCropCost({
      benchmark, acreageHectares: activity.acreage_hectares,
      costFactor, sowingMonthOffset: sowingMonth,
      cycleMonths: resolveHarvestOffset(activity.season) + 1,
    });
    costs = cropCost;
    farmCosts.crop = cropCost.monthlyCosts;

  } else if (activity.type === 'dairy') {
    const dairyRev = calculateDairyRevenue({
      snapshot, benchmark, animalCount: activity.animal_count,
      feedQuality: activity.feed_quality || 'standard',
    });
    revenue = { totalRevenue: dairyRev.annualRevenue, monthlyRevenue: dairyRev.monthlyRevenueArray };
    farmRevenue.dairy = dairyRev.monthlyRevenueArray;

    const dairyCost = estimateDairyCost({
      benchmark, animalCount: activity.animal_count,
      feedQuality: activity.feed_quality || 'standard', costFactor,
    });
    costs = { totalCost: dairyCost.annualCost, monthlyCosts: dairyCost.monthlyCosts };
    farmCosts.dairy = dairyCost.monthlyCosts;

  } else if (activity.type === 'fishery') {
    const fishRev = calculateFisheryRevenue({
      snapshot, benchmark, pondAreaHectares: activity.pond_area_hectares,
      stockingDensity: activity.stocking_density || 'standard',
      cycleMonths: activity.cycle_months || 8,
    });
    revenue = { totalRevenue: fishRev.annualRevenue, monthlyRevenue: fishRev.monthlyRevenueArray };
    farmRevenue.fishery = fishRev.monthlyRevenueArray;

    const fishCost = estimateFisheryCost({
      benchmark, pondAreaHectares: activity.pond_area_hectares,
      stockingDensity: activity.stocking_density || 'standard',
      cycleMonths: activity.cycle_months || 8, costFactor,
    });
    costs = { totalCost: fishCost.totalCycleCost, monthlyCosts: fishCost.monthlyCosts };
    farmCosts.fishery = fishCost.monthlyCosts;
  }

  // Also add existing dairy/fishery from snapshot if primary activity is crop
  if (activity.type === 'crop') {
    addExistingActivities(snapshot, benchmark, farmRevenue, farmCosts);
  }

  const totalRevenue = revenue ? revenue.totalRevenue : 0;
  const totalCost = costs ? costs.totalCost : 0;
  const netFarmIncome = round2(totalRevenue - totalCost);

  // ── Cash flow projection (includes household + EMIs) ──
  const cashFlow = projectCashFlow({
    snapshot, horizonMonths: 12,
    farmRevenue, farmCosts,
  });

  // Total income including non-farm
  const totalIncomeWithOther = round2(netFarmIncome + (cashFlow.summary.totalNonFarmIncome || 0));
  const monthlyIncome = totalIncomeWithOther / 12;
  const emiToIncomeRatio = monthlyIncome > 0
    ? round2(loanTerms.monthlyEmi / monthlyIncome)
    : 99;

  // ── Breakeven yield (crop only) ──
  let breakevenYieldKgPerHectare = null;
  let yieldSafetyMarginPct = null;

  if (activity.type === 'crop' && yieldProjection && activity.acreage_hectares > 0) {
    const totalObligations = totalCost + (loanTerms.totalRepayable || 0);
    const pricePerKg = revenue.pricePerKg || 1;
    breakevenYieldKgPerHectare = round2(totalObligations / (pricePerKg * activity.acreage_hectares));

    if (yieldProjection.yieldKgPerHectare > 0) {
      yieldSafetyMarginPct = round2(
        ((yieldProjection.yieldKgPerHectare - breakevenYieldKgPerHectare) / yieldProjection.yieldKgPerHectare) * 100
      );
    }
  }

  // ── Risk scoring ──
  const risk = computeRiskScore({
    snapshot,
    cashFlowSummary: cashFlow.summary,
    irrigationType: activity.irrigation_type || 'rainfed',
    rainfallDeviationPct: profile.rainfallDeviationPct,
    projectedNetIncome: netFarmIncome,
  });

  return {
    label: profile.label,
    label_key: profile.labelKey,
    description: profile.description,
    assumptions: {
      rainfall_deviation_pct: profile.rainfallDeviationPct,
      yield_factor: round2(yieldFactor),
      price_factor: priceFactor,
      cost_factor: round2(costFactor),
    },
    projections: {
      total_revenue: round2(totalRevenue),
      total_cost: round2(totalCost),
      net_farm_income: netFarmIncome,
      total_income_with_other: totalIncomeWithOther,
      emi_burden_monthly: loanTerms.monthlyEmi,
      emi_to_income_ratio: emiToIncomeRatio,
      breakeven_yield_kg_per_hectare: breakevenYieldKgPerHectare,
      projected_yield_kg_per_hectare: yieldProjection ? yieldProjection.yieldKgPerHectare : null,
      yield_safety_margin_pct: yieldSafetyMarginPct,
      health_status: risk.healthStatus,
      sma_classification: risk.smaClass,
      income_adequacy: risk.incomeAdequacy,
      risk_score: risk.riskScore,
    },
    monthly_cashflow: cashFlow.monthly,
    cash_flow_summary: cashFlow.summary,
  };
};

// ─── Loan Terms Calculator ──────────────────────────────────────────

const computeLoanTerms = (amount, interestRate, tenureMonths, repaymentType) => {
  const monthlyRate = interestRate / 100 / 12;
  let monthlyEmi = 0;
  let totalRepayable = 0;

  if (repaymentType === 'emi') {
    // Standard EMI formula: P × r × (1+r)^n / ((1+r)^n - 1)
    if (monthlyRate > 0) {
      const pow = Math.pow(1 + monthlyRate, tenureMonths);
      monthlyEmi = amount * monthlyRate * pow / (pow - 1);
    } else {
      monthlyEmi = amount / tenureMonths;
    }
    totalRepayable = monthlyEmi * tenureMonths;
  } else if (repaymentType === 'bullet') {
    // Interest-only monthly, principal at maturity
    monthlyEmi = amount * monthlyRate;
    totalRepayable = amount + (monthlyEmi * tenureMonths);
  } else {
    // Flexible — approximate as EMI
    if (monthlyRate > 0) {
      const pow = Math.pow(1 + monthlyRate, tenureMonths);
      monthlyEmi = amount * monthlyRate * pow / (pow - 1);
    } else {
      monthlyEmi = amount / tenureMonths;
    }
    totalRepayable = monthlyEmi * tenureMonths;
  }

  monthlyEmi = round2(monthlyEmi);
  totalRepayable = round2(totalRepayable);

  // Processing fee: typically 1% of loan amount, capped at ₹10,000
  const processingFee = round2(Math.min(amount * 0.01, 10000));

  return {
    amount,
    interest_rate: interestRate,
    tenure_months: tenureMonths,
    repayment_type: repaymentType,
    monthly_emi: monthlyEmi,
    total_repayable: totalRepayable,
    total_interest: round2(totalRepayable - amount),
    processing_fee: processingFee,
  };
};

// ─── Insurance Comparison ───────────────────────────────────────────

const computeInsuranceComparison = (snapshot, benchmark, activity, scenarios) => {
  const stressScenario = scenarios.find(s => s.label === 'stress');
  const baseScenario = scenarios.find(s => s.label === 'base');
  if (!stressScenario || !baseScenario) return null;

  const stressRevenue = stressScenario.projections.total_revenue;
  const baseRevenue = baseScenario.projections.total_revenue;
  const worstCaseLoss = round2(Math.max(baseRevenue - stressRevenue, 0));

  // Historical claim rate from benchmark
  const claimRate = benchmark ? (parseFloat(benchmark.historical_claim_rate_pct) || 25) / 100 : 0.25;

  // PMFBY premium: typically 2% kharif, 1.5% rabi, 5% horticulture (of sum insured)
  const sumInsured = baseRevenue;
  const premiumRates = { kharif: 0.02, rabi: 0.015, summer: 0.05, annual: 0.02 };
  const premiumRate = premiumRates[activity.season] || 0.02;
  const premium = round2(sumInsured * premiumRate);

  const expectedPayout = round2(worstCaseLoss * claimRate);
  const worstCaseWithInsurance = round2(Math.max(worstCaseLoss - expectedPayout + premium, 0));

  return {
    without_insurance: {
      worst_case_loss: worstCaseLoss,
      probability_of_loss: round2(claimRate),
    },
    with_pmfby: {
      premium,
      sum_insured: round2(sumInsured),
      worst_case_loss: worstCaseWithInsurance,
      probability_of_loss: round2(claimRate),
      expected_payout: expectedPayout,
      net_benefit: round2(expectedPayout - premium),
    },
  };
};

// ─── Risk Factors Identification ────────────────────────────────────

const identifyRiskFactors = (snapshot, activity, loanTerms, scenarios) => {
  const factors = [];

  // Rainfed risk
  if (activity.irrigation_type === 'rainfed') {
    factors.push({
      factor: 'Rainfed cultivation',
      impact: 'high',
      message_key: 'drishti.risk.rainfed',
      message: 'Rainfed crops are highly sensitive to monsoon patterns — yield can drop 30-40% in deficit rainfall',
    });
  }

  // Single activity dependency
  const hasMultipleActivities = snapshot.active_dairy_profile || snapshot.active_fishery_profile;
  if (!hasMultipleActivities) {
    factors.push({
      factor: 'Single activity dependency',
      impact: 'medium',
      message_key: 'drishti.risk.single_activity',
      message: 'Income depends on a single farming activity — consider diversifying',
    });
  }

  // High EMI burden
  const baseScenario = scenarios.find(s => s.label === 'base');
  if (baseScenario && baseScenario.projections.emi_to_income_ratio > 0.40) {
    factors.push({
      factor: 'High EMI burden',
      impact: 'high',
      message_key: 'drishti.risk.high_emi',
      message: `EMI consumes ${Math.round(baseScenario.projections.emi_to_income_ratio * 100)}% of projected income`,
    });
  }

  // Low trust score
  if (snapshot.trust_score && snapshot.trust_score < 50) {
    factors.push({
      factor: 'Low credit score',
      impact: 'medium',
      message_key: 'drishti.risk.low_trust',
      message: `Trust score ${snapshot.trust_score} is below average — may indicate past repayment issues`,
    });
  }

  // Stress scenario shows NPA
  const stressScenario = scenarios.find(s => s.label === 'stress');
  if (stressScenario && stressScenario.projections.health_status === 'npa') {
    factors.push({
      factor: 'NPA risk under stress',
      impact: 'high',
      message_key: 'drishti.risk.stress_npa',
      message: 'Under adverse conditions, this loan may become a non-performing asset',
    });
  }

  // No insurance
  if (!snapshot.active_insurance || snapshot.active_insurance.length === 0) {
    factors.push({
      factor: 'No crop insurance',
      impact: 'medium',
      message_key: 'drishti.risk.no_insurance',
      message: 'No active insurance — crop failure would directly impact loan repayment',
    });
  }

  return factors;
};

// ─── Recommendation Generator ───────────────────────────────────────

const generateRecommendations = (scenarios, insuranceComparison, loanTerms, activity) => {
  const recommendations = [];
  const baseScenario = scenarios.find(s => s.label === 'base');
  const stressScenario = scenarios.find(s => s.label === 'stress');

  if (!baseScenario) return recommendations;

  // Overall verdict
  const baseEmi = baseScenario.projections.emi_to_income_ratio;
  const stressHealth = stressScenario ? stressScenario.projections.health_status : 'good';

  let verdict, verdictKey;
  if (baseEmi <= 0.30 && stressHealth !== 'npa') {
    verdict = 'SAFE';
    verdictKey = 'drishti.verdict.safe';
    recommendations.push({
      type: 'verdict',
      message_key: verdictKey,
      message: 'This loan appears affordable — EMI is within safe limits even under stress conditions',
    });
  } else if (baseEmi <= 0.45 || stressHealth !== 'npa') {
    verdict = 'CAUTION';
    verdictKey = 'drishti.verdict.caution';
    recommendations.push({
      type: 'verdict',
      message_key: verdictKey,
      message: 'This loan is feasible but with limited safety margin — consider a smaller amount or longer tenure',
    });
  } else {
    verdict = 'RISKY';
    verdictKey = 'drishti.verdict.risky';
    recommendations.push({
      type: 'verdict',
      message_key: verdictKey,
      message: 'This loan carries high repayment risk — under stress conditions, it may become unserviceable',
    });
  }

  // Insurance recommendation
  if (insuranceComparison && insuranceComparison.with_pmfby.net_benefit > 0) {
    recommendations.push({
      type: 'action',
      message_key: 'drishti.rec.add_insurance',
      message: `Consider PMFBY enrollment — it reduces your worst-case loss by ₹${Math.round(insuranceComparison.with_pmfby.expected_payout).toLocaleString('en-IN')}`,
    });
  }

  // Breakeven info
  if (baseScenario.projections.breakeven_yield_kg_per_hectare && baseScenario.projections.projected_yield_kg_per_hectare) {
    const be = Math.round(baseScenario.projections.breakeven_yield_kg_per_hectare);
    const projected = Math.round(baseScenario.projections.projected_yield_kg_per_hectare);
    recommendations.push({
      type: 'info',
      message_key: 'drishti.rec.breakeven',
      message: `You need at least ${be.toLocaleString('en-IN')} kg/hectare to cover loan costs — projected yield is ${projected.toLocaleString('en-IN')} kg/hectare`,
    });
  }

  // Cash flow gap warning
  if (baseScenario.cash_flow_summary && baseScenario.cash_flow_summary.workingCapitalGap > 0) {
    const gap = Math.round(baseScenario.cash_flow_summary.workingCapitalGap);
    const deficitMonths = baseScenario.cash_flow_summary.deficitPeriod || [];
    recommendations.push({
      type: 'warning',
      message_key: 'drishti.rec.working_capital',
      message: `You may need ₹${gap.toLocaleString('en-IN')} working capital for ${deficitMonths.join(', ')} when expenses exceed income`,
    });
  }

  // Suggest lower amount if EMI too high
  if (verdict === 'RISKY' || verdict === 'CAUTION') {
    const safeEmiRatio = 0.30;
    const monthlyIncome = baseScenario.projections.total_income_with_other / 12;
    const safeEmi = monthlyIncome * safeEmiRatio;
    if (safeEmi > 0 && safeEmi < loanTerms.monthly_emi) {
      const safeAmount = estimateSafeLoanAmount(safeEmi, loanTerms.interest_rate, loanTerms.tenure_months);
      recommendations.push({
        type: 'action',
        message_key: 'drishti.rec.reduce_amount',
        message: `A loan of ₹${Math.round(safeAmount).toLocaleString('en-IN')} would keep EMI at 30% of income`,
      });
    }
  }

  return recommendations;
};

// ─── Helpers ────────────────────────────────────────────────────────

const findBenchmark = (benchmarks, activity) => {
  if (!benchmarks || benchmarks.length === 0) return null;

  if (activity.type === 'crop') {
    // Try exact crop match first, then activity_type match
    return benchmarks.find(b => b.crop_id === activity.crop_id && b.activity_type === 'crop')
      || benchmarks.find(b => b.activity_type === 'crop' && b.season === activity.season)
      || benchmarks.find(b => b.activity_type === 'crop')
      || null;
  }

  return benchmarks.find(b => b.activity_type === activity.type) || null;
};

const resolveInterestRate = (snapshot, input) => {
  // If loan product is in snapshot's active loans, use its rate
  // Otherwise use a default rate for the product category
  // In production, this would query the LoanProduct — for now, use 7% default
  return 7.0;
};

const resolveSowingMonth = (season) => {
  // Return month offset from start of fiscal year
  // Kharif sowing: June (month index 5), Rabi: November (10), Summer: February (1)
  const monthMap = { kharif: 5, rabi: 10, summer: 1, annual: 0 };
  return monthMap[season] || 0;
};

const resolveHarvestOffset = (season) => {
  // Months from sowing to harvest
  const offsets = { kharif: 5, rabi: 4, summer: 3, annual: 6 };
  return offsets[season] || 5;
};

const addExistingActivities = (snapshot, benchmark, farmRevenue, farmCosts) => {
  // Add dairy income/costs from snapshot if farmer has active dairy
  if (snapshot.active_dairy_profile) {
    const dairyProfit = snapshot.historical_dairy_profitability;
    if (dairyProfit && dairyProfit.length > 0) {
      const avgMonthlyIncome = dairyProfit.reduce((s, d) => s + d.totalIncome, 0) / dairyProfit.length;
      const avgMonthlyCost = dairyProfit.reduce((s, d) => s + d.totalExpense, 0) / dairyProfit.length;
      farmRevenue.dairy = new Array(12).fill(round2(avgMonthlyIncome));
      farmCosts.dairy = new Array(12).fill(round2(avgMonthlyCost));
    }
  }

  // Add fishery from snapshot
  if (snapshot.active_fishery_profile) {
    const fishProfit = snapshot.historical_fishery_profitability;
    if (fishProfit && fishProfit.length > 0) {
      const avgMonthlyIncome = fishProfit.reduce((s, f) => s + f.totalIncome, 0) / fishProfit.length;
      const avgMonthlyCost = fishProfit.reduce((s, f) => s + f.totalExpense, 0) / fishProfit.length;
      farmRevenue.fishery = new Array(12).fill(round2(avgMonthlyIncome));
      farmCosts.fishery = new Array(12).fill(round2(avgMonthlyCost));
    }
  }
};

const estimateSafeLoanAmount = (safeEmi, interestRate, tenureMonths) => {
  // Reverse EMI formula: P = EMI × ((1+r)^n - 1) / (r × (1+r)^n)
  const r = interestRate / 100 / 12;
  if (r <= 0) return safeEmi * tenureMonths;
  const pow = Math.pow(1 + r, tenureMonths);
  return round2(safeEmi * (pow - 1) / (r * pow));
};

const buildFarmerSummary = (snapshot) => ({
  district_id: snapshot.district_id,
  block_id: snapshot.block_id,
  total_land_hectares: parseFloat(snapshot.total_farm_size_hectares) || 0,
  trust_score: snapshot.trust_score,
  trust_band: snapshot.trust_band,
  existing_loan_emi: parseFloat(snapshot.total_monthly_emi) || 0,
  existing_outstanding: parseFloat(snapshot.total_outstanding) || 0,
  education_level: snapshot.education_level,
  years_experience: snapshot.years_farming_experience,
});

const round2 = (n) => Math.round((n || 0) * 100) / 100;

module.exports = { compute };
