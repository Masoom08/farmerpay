/**
 * Household & Activity Portfolio Engine
 *
 * Answers: "What should my household do to maximize income?"
 *
 * Takes a farmer snapshot + proposed portfolio changes and produces:
 *  - Complete income summary (farm + non-farm, per-stream breakdown)
 *  - Complete expense summary (farm ops + household, per-category)
 *  - Month-by-month household cash flow
 *  - Financial resilience score + stress scenario analysis
 *  - Current vs proposed comparison with improvement metrics
 *  - Ranked recommendations
 *
 * No DB access — pure function on snapshot + benchmarks.
 */

const { calculateCropRevenue, calculateDairyRevenue, calculateFisheryRevenue } = require('../computation/revenueCalculator');
const { estimateCropCost, estimateDairyCost, estimateFisheryCost } = require('../computation/costEstimator');
const { projectCashFlow } = require('../computation/cashFlowProjector');
const { projectHouseholdIncome } = require('../computation/householdIncomeProjector');
const { projectHouseholdExpenses, estimateExpenseFloor } = require('../computation/householdExpenseProjector');
const { calculateResilience, computeDiversificationIndex } = require('../computation/resilienceCalculator');
const { computeRiskScore } = require('../computation/riskScorer');

// ─── Main Compute ───────────────────────────────────────────────────

/**
 * @param {object} params
 * @param {object} params.snapshot      - Full DrishtiFarmerSnapshot row (plain object)
 * @param {Array}  params.benchmarks    - Array of DrishtiBenchmarkProfile for this district
 * @param {object} params.input         - Validated request body
 * @returns {object} Full result matching the Household Portfolio API contract
 */
const compute = ({ snapshot, benchmarks, input }) => {
  const {
    proposed_farm_activities = {},
    household_income = {},
    household_expenses = {},
    active_loan_ids,
    time_horizon_months = 12,
    include_stress_scenarios = true,
  } = input;

  const horizonMonths = Math.min(Math.max(time_horizon_months, 3), 36);

  // ── 1. Build proposed farm revenue + cost arrays ──
  const { farmRevenue, farmCosts, farmIncomeStreams, farmExpenseBreakdown, totalFarmRevenue, totalFarmCost } =
    buildFarmProjections(snapshot, benchmarks, proposed_farm_activities, horizonMonths);

  // ── 2. Project non-farm household income ──
  const incomeProjection = projectHouseholdIncome({
    snapshot,
    horizonMonths,
    overrides: household_income.overrides || null,
    additionalSources: household_income.additional_sources || null,
  });

  // ── 3. Project household expenses ──
  const expenseProjection = projectHouseholdExpenses({
    snapshot,
    horizonMonths,
    overrides: household_expenses.overrides || null,
  });

  // ── 4. Build integrated cash flow ──
  const cashFlow = projectCashFlow({
    snapshot,
    horizonMonths,
    farmRevenue,
    farmCosts,
    incomeOverrides: household_income.overrides || null,
    expenseOverrides: household_expenses.overrides || null,
  });

  // ── 5. Compute income summary ──
  const totalNonFarmAnnual = incomeProjection.summary.totalProjectedAnnual;
  const totalFarmAnnual = round2(totalFarmRevenue - totalFarmCost);
  const totalProjectedAnnual = round2(totalFarmAnnual + totalNonFarmAnnual);

  const incomeStreams = buildIncomeStreamsSummary(
    farmIncomeStreams,
    incomeProjection,
    totalProjectedAnnual
  );

  // Diversification index on the proposed portfolio
  const proposedDiversification = computeDiversificationIndex(
    incomeProjection,
    Math.max(totalFarmAnnual, 0)
  );

  const incomeSummary = {
    total_projected_annual: totalProjectedAnnual,
    farm_income_annual: Math.max(totalFarmAnnual, 0),
    non_farm_income_annual: totalNonFarmAnnual,
    farm_income_pct: totalProjectedAnnual > 0 ? round2((Math.max(totalFarmAnnual, 0) / totalProjectedAnnual) * 100) : 0,
    non_farm_income_pct: totalProjectedAnnual > 0 ? round2((totalNonFarmAnnual / totalProjectedAnnual) * 100) : 0,
    income_streams: incomeStreams,
    income_diversification_index: proposedDiversification.index,
    income_diversification_rating: proposedDiversification.rating,
  };

  // ── 6. Compute expense summary ──
  const totalHouseholdExpenseAnnual = expenseProjection.summary.totalProjectedAnnual;
  const totalFarmOperationExpense = round2(totalFarmCost * (12 / horizonMonths));
  const totalLoanEmi = round2((parseFloat(snapshot.total_monthly_emi) || 0) * 12);
  const grandTotalExpenseAnnual = round2(totalHouseholdExpenseAnnual + totalFarmOperationExpense + totalLoanEmi);

  const expenseSummary = {
    total_annual_household: totalHouseholdExpenseAnnual,
    total_annual_farm_operations: totalFarmOperationExpense,
    total_annual_loan_emi: totalLoanEmi,
    grand_total_annual: grandTotalExpenseAnnual,
    expense_breakdown: buildExpenseBreakdown(farmExpenseBreakdown, expenseProjection, snapshot),
  };

  // ── 7. Net household position ──
  const netPosition = {
    annual_surplus: round2(totalProjectedAnnual - grandTotalExpenseAnnual),
    monthly_average_surplus: cashFlow.summary.netSurplus > 0
      ? round2(cashFlow.summary.netSurplus / horizonMonths)
      : round2(cashFlow.summary.netSurplus / horizonMonths),
    surplus_months: cashFlow.summary.surplusMonths,
    deficit_months: cashFlow.summary.deficitMonths,
    max_monthly_deficit: cashFlow.summary.maxMonthlyDeficit,
    deficit_period: cashFlow.summary.deficitPeriod,
    working_capital_gap: cashFlow.summary.workingCapitalGap,
  };

  // ── 8. Household profile ──
  const householdProfile = buildHouseholdProfile(snapshot, incomeProjection);

  // ── 9. Financial resilience ──
  const resilience = calculateResilience({
    snapshot,
    incomeProjection,
    expenseProjection,
    cashFlowSummary: cashFlow.summary,
    totalFarmIncomeAnnual: Math.max(totalFarmAnnual, 0),
    totalNonFarmIncomeAnnual: totalNonFarmAnnual,
    totalExpenseAnnual: grandTotalExpenseAnnual,
  });

  // ── 10. Comparison to current (pre-change) ──
  const comparison = buildComparison(snapshot, totalProjectedAnnual, proposedDiversification, grandTotalExpenseAnnual);

  // ── 11. Stress scenarios (from resilience) ──
  const stressScenarios = include_stress_scenarios ? resilience.stressScenarios : [];

  // ── 12. Recommendations ──
  const recommendations = generateRecommendations(
    incomeSummary, netPosition, resilience, comparison, incomeProjection, cashFlow
  );

  // Build the scenarios array that drishtiService expects for result storage.
  // Household Portfolio returns a single "proposed" scenario (not 3 climate variants).
  const scenarios = [{
    label: 'proposed',
    label_key: 'drishti.scenario.proposed_portfolio',
    description: 'Proposed household + farm activity portfolio',
    assumptions: {
      time_horizon_months: horizonMonths,
      farm_activities: summarizeFarmActivities(proposed_farm_activities),
      income_overrides_count: (household_income.overrides || []).length,
      expense_overrides_count: (household_expenses.overrides || []).length,
    },
    projections: {
      total_revenue: round2(totalFarmRevenue * (12 / horizonMonths)),
      total_cost: grandTotalExpenseAnnual,
      net_farm_income: totalFarmAnnual,
      total_income_with_other: totalProjectedAnnual,
      emi_burden_monthly: parseFloat(snapshot.total_monthly_emi) || 0,
      emi_to_income_ratio: totalProjectedAnnual > 0
        ? round2(totalLoanEmi / totalProjectedAnnual)
        : 0,
      breakeven_yield_kg_per_hectare: null,
      projected_yield_kg_per_hectare: null,
      yield_safety_margin_pct: null,
      health_status: resilience.resilienceRating === 'fragile' ? 'stressed' : resilience.resilienceRating === 'vulnerable' ? 'watch' : 'good',
      sma_classification: 'standard',
      income_adequacy: resilience.metrics.nonFarmCoversAllExpensesPct >= 80 ? 'strong'
        : resilience.metrics.nonFarmCoversAllExpensesPct >= 50 ? 'adequate'
        : resilience.metrics.nonFarmCoversAllExpensesPct >= 25 ? 'marginal' : 'inadequate',
      risk_score: resilience.resilienceScore ? 100 - resilience.resilienceScore : 50,
    },
    monthly_cashflow: cashFlow.monthly,
    cash_flow_summary: cashFlow.summary,
  }];

  return {
    householdProfile,
    incomeSummary,
    expenseSummary,
    netPosition,
    scenarios,
    financialResilience: {
      resilience_score: resilience.resilienceScore,
      resilience_rating: resilience.resilienceRating,
      months_survivable_without_farm_income: resilience.metrics.monthsSurvivableWithoutFarmIncome,
      non_farm_covers_household_expenses_pct: resilience.metrics.nonFarmCoversHouseholdExpensesPct,
      non_farm_covers_all_expenses_pct: resilience.metrics.nonFarmCoversAllExpensesPct,
      single_point_of_failure: resilience.metrics.singlePointOfFailure,
      highest_risk_income_loss: resilience.metrics.highestRiskIncomeLoss,
    },
    stressScenarios,
    comparisonToCurrent: comparison,
    riskFactors: buildRiskFactors(resilience, incomeSummary, netPosition, snapshot),
    recommendations,
  };
};

// ─── Farm Projections Builder ───────────────────────────────────────

const buildFarmProjections = (snapshot, benchmarks, proposedActivities, horizonMonths) => {
  const farmRevenue = { crop: new Array(12).fill(0), dairy: new Array(12).fill(0), fishery: new Array(12).fill(0) };
  const farmCosts = { crop: new Array(12).fill(0), dairy: new Array(12).fill(0), fishery: new Array(12).fill(0) };
  const farmIncomeStreams = [];
  const farmExpenseBreakdown = [];
  let totalFarmRevenue = 0;
  let totalFarmCost = 0;

  // ── Crops ──
  const crops = proposedActivities.crops || [];
  for (const crop of crops) {
    const benchmark = findBenchmark(benchmarks, 'crop', crop.crop_id, crop.season);
    const harvestOffset = HARVEST_OFFSETS[crop.season] || 5;
    const sowingMonth = SOWING_MONTHS[crop.season] || 5;

    const rev = calculateCropRevenue({
      snapshot, benchmark, cropId: crop.crop_id,
      acreageHectares: crop.acreage_hectares,
      season: crop.season,
      irrigationType: crop.irrigation || 'rainfed',
      harvestMonthOffset: harvestOffset,
    });

    const cost = estimateCropCost({
      benchmark, acreageHectares: crop.acreage_hectares,
      sowingMonthOffset: sowingMonth,
      cycleMonths: harvestOffset + 1,
    });

    // Accumulate into monthly arrays
    for (let i = 0; i < 12; i++) {
      farmRevenue.crop[i] += rev.monthlyRevenue[i] || 0;
      farmCosts.crop[i] += cost.monthlyCosts[i] || 0;
    }

    const annual = round2(rev.totalRevenue * (12 / horizonMonths));
    totalFarmRevenue += rev.totalRevenue;
    totalFarmCost += cost.totalCost;

    farmIncomeStreams.push({
      source: `crop_${crop.crop_id}`,
      type: 'farm',
      annual,
      timing: 'seasonal',
      harvestMonths: [((sowingMonth + harvestOffset) % 12) + 1],
    });

    farmExpenseBreakdown.push({
      category: 'farm_crop_inputs',
      label: `Crop inputs (${crop.crop_id})`,
      annual: round2(cost.totalCost * (12 / horizonMonths)),
      timing: 'seasonal',
    });
  }

  // ── Dairy ──
  const dairy = proposedActivities.dairy;
  if (dairy && dairy.animal_count > 0) {
    const benchmark = findBenchmark(benchmarks, 'dairy');
    const rev = calculateDairyRevenue({
      snapshot, benchmark,
      animalCount: dairy.animal_count,
      avgDailyMilkLiters: dairy.avg_daily_milk_liters || null,
      feedQuality: dairy.feed_quality || 'standard',
    });

    const cost = estimateDairyCost({
      benchmark, animalCount: dairy.animal_count,
      feedQuality: dairy.feed_quality || 'standard',
    });

    for (let i = 0; i < 12; i++) {
      farmRevenue.dairy[i] = rev.monthlyRevenueArray[i] || 0;
      farmCosts.dairy[i] = cost.monthlyCosts[i] || 0;
    }

    totalFarmRevenue += rev.annualRevenue;
    totalFarmCost += cost.annualCost;

    farmIncomeStreams.push({
      source: 'dairy',
      type: 'farm',
      annual: rev.annualRevenue,
      timing: 'monthly',
      months: 'all',
    });

    farmExpenseBreakdown.push({
      category: 'farm_dairy_feed',
      label: 'Dairy feed & maintenance',
      annual: cost.annualCost,
      timing: 'monthly',
    });
  }

  // ── Fishery ──
  const fishery = proposedActivities.fishery;
  if (fishery && fishery.pond_area_hectares > 0) {
    const benchmark = findBenchmark(benchmarks, 'fishery');
    const cycleMonths = fishery.cycle_months || 8;

    const rev = calculateFisheryRevenue({
      snapshot, benchmark,
      pondAreaHectares: fishery.pond_area_hectares,
      stockingDensity: fishery.stocking_density || 'standard',
      cycleMonths,
    });

    const cost = estimateFisheryCost({
      benchmark, pondAreaHectares: fishery.pond_area_hectares,
      stockingDensity: fishery.stocking_density || 'standard',
      cycleMonths,
    });

    for (let i = 0; i < 12; i++) {
      farmRevenue.fishery[i] = rev.monthlyRevenueArray[i] || 0;
      farmCosts.fishery[i] = cost.monthlyCosts[i] || 0;
    }

    totalFarmRevenue += rev.annualRevenue;
    totalFarmCost += cost.totalCycleCost;

    const harvestMonth = Math.min(cycleMonths - 1, 11) + 1;
    farmIncomeStreams.push({
      source: 'fishery',
      type: 'farm',
      annual: rev.annualRevenue,
      timing: 'cyclical',
      months: [harvestMonth],
    });

    farmExpenseBreakdown.push({
      category: 'farm_fishery_inputs',
      label: 'Fishery inputs & stocking',
      annual: round2(cost.totalCycleCost * (12 / cycleMonths)),
      timing: 'cyclical',
    });
  }

  return { farmRevenue, farmCosts, farmIncomeStreams, farmExpenseBreakdown, totalFarmRevenue, totalFarmCost };
};

// ─── Income Streams Summary ─────────────────────────────────────────

const buildIncomeStreamsSummary = (farmStreams, incomeProjection, totalAnnual) => {
  const streams = [];

  // Farm streams
  for (const fs of farmStreams) {
    streams.push({
      source: fs.source,
      type: 'farm',
      annual: fs.annual,
      pct: totalAnnual > 0 ? round2((fs.annual / totalAnnual) * 100) : 0,
      timing: fs.timing,
      months: fs.months || fs.harvestMonths || 'all',
    });
  }

  // Non-farm streams from projector
  if (incomeProjection && incomeProjection.bySource) {
    for (const [source, data] of Object.entries(incomeProjection.bySource)) {
      if (data.annual > 0) {
        // Determine timing from monthly pattern
        const activeCount = data.monthly.filter(m => m > 0).length;
        const timing = activeCount >= 11 ? 'monthly' : activeCount >= 6 ? 'seasonal' : 'irregular';
        const months = activeCount >= 11 ? 'all' : data.monthly
          .map((v, i) => v > 0 ? i + 1 : null)
          .filter(Boolean);

        streams.push({
          source,
          type: 'non_farm',
          annual: data.annual,
          pct: totalAnnual > 0 ? round2((data.annual / totalAnnual) * 100) : 0,
          timing,
          months,
        });
      }
    }
  }

  // Sort by annual descending
  streams.sort((a, b) => b.annual - a.annual);
  return streams;
};

// ─── Expense Breakdown ──────────────────────────────────────────────

const buildExpenseBreakdown = (farmExpenses, expenseProjection, snapshot) => {
  const breakdown = [];

  // Farm operation expenses
  for (const fe of farmExpenses) {
    breakdown.push({ category: fe.category, annual: fe.annual, timing: fe.timing });
  }

  // Household expenses from projector
  if (expenseProjection && expenseProjection.byCategory) {
    for (const [cat, data] of Object.entries(expenseProjection.byCategory)) {
      if (data.annual > 0) {
        breakdown.push({ category: cat, annual: data.annual, timing: 'monthly' });
      }
    }
  }

  // Loan EMIs
  const farmEmi = (parseFloat(snapshot.total_monthly_emi) || 0) * 12;
  const nonFarmEmi = (parseFloat(snapshot.non_farm_loan_emi_monthly) || 0) * 12;
  if (farmEmi > nonFarmEmi) {
    breakdown.push({ category: 'farm_loan_emi', annual: round2(farmEmi - nonFarmEmi), timing: 'monthly' });
  }
  if (nonFarmEmi > 0) {
    breakdown.push({ category: 'non_farm_loan_emi', annual: round2(nonFarmEmi), timing: 'monthly' });
  }

  return breakdown;
};

// ─── Household Profile ──────────────────────────────────────────────

const buildHouseholdProfile = (snapshot, incomeProjection) => {
  const earningMembers = incomeProjection.summary.earningMembers || [];

  return {
    family_members: parseInt(snapshot.family_members_count) || earningMembers.length || 1,
    earning_members: earningMembers.length || parseInt(snapshot.earning_members_count) || 1,
    dependents: parseInt(snapshot.dependents_count) || 0,
    spouse_occupation: snapshot.spouse_occupation || null,
    primary_non_farm_occupation: snapshot.primary_non_farm_occupation || null,
  };
};

// ─── Current vs Proposed Comparison ─────────────────────────────────

const buildComparison = (snapshot, proposedTotalAnnual, proposedDiversification, proposedExpenseAnnual) => {
  // Current income: reconstruct from snapshot
  const currentNonFarm = (parseFloat(snapshot.total_non_farm_monthly) || 0) * 12;

  // Current farm income: from historical profitability
  let currentFarmIncome = 0;
  const cropProfit = snapshot.historical_crop_profitability || [];
  const dairyProfit = snapshot.historical_dairy_profitability || [];
  const fishProfit = snapshot.historical_fishery_profitability || [];

  if (cropProfit.length > 0) {
    currentFarmIncome += cropProfit.reduce((s, c) => s + (c.actualProfit || 0), 0) / cropProfit.length * 2; // annualize from seasonal
  }
  if (dairyProfit.length > 0) {
    const avgMonthly = dairyProfit.reduce((s, d) => s + d.netProfit, 0) / dairyProfit.length;
    currentFarmIncome += avgMonthly * 12;
  }
  if (fishProfit.length > 0) {
    const avgMonthly = fishProfit.reduce((s, f) => s + f.netProfit, 0) / fishProfit.length;
    currentFarmIncome += avgMonthly * 12;
  }

  const currentTotalIncome = round2(currentFarmIncome + currentNonFarm);

  // Current diversification (rough estimate)
  const currentStreams = parseInt(snapshot.non_farm_income_streams) || 0;
  const currentTotalStreams = currentStreams + (cropProfit.length > 0 ? 1 : 0) + (dairyProfit.length > 0 ? 1 : 0) + (fishProfit.length > 0 ? 1 : 0);
  // Rough HHI estimate — if few streams, concentrated
  const roughCurrentHHI = currentTotalStreams > 0 ? 1 / currentTotalStreams : 1;
  const currentDiversificationIndex = round2(1 - roughCurrentHHI);

  const incomeChangePct = currentTotalIncome > 0
    ? round2(((proposedTotalAnnual - currentTotalIncome) / currentTotalIncome) * 100)
    : 0;

  // Risk change assessment
  let riskChange;
  const divImprovement = proposedDiversification.index - currentDiversificationIndex;
  if (divImprovement > 0.15 && incomeChangePct > 10) riskChange = 'significantly_reduced';
  else if (divImprovement > 0.05 || incomeChangePct > 5) riskChange = 'reduced';
  else if (divImprovement < -0.05 || incomeChangePct < -5) riskChange = 'increased';
  else riskChange = 'similar';

  // Key improvement description
  const keyImprovement = describeKeyImprovement(snapshot, incomeChangePct, divImprovement);

  return {
    current_total_household_income: currentTotalIncome,
    proposed_total_household_income: proposedTotalAnnual,
    income_change_pct: incomeChangePct,
    current_diversification_index: currentDiversificationIndex,
    proposed_diversification_index: proposedDiversification.index,
    risk_change: riskChange,
    key_improvement: keyImprovement,
  };
};

const describeKeyImprovement = (snapshot, incomeChangePct, divImprovement) => {
  const parts = [];
  if (incomeChangePct > 10) parts.push(`income increases by ${Math.round(incomeChangePct)}%`);
  if (divImprovement > 0.1) parts.push('better diversified across more income streams');
  if (divImprovement > 0.05) parts.push('reduces seasonal income gaps');

  if (parts.length === 0) {
    if (incomeChangePct >= 0) return 'Portfolio maintains current income level with similar risk';
    return 'Proposed portfolio reduces total income — consider adjustments';
  }

  return parts.join(', ');
};

// ─── Risk Factors ───────────────────────────────────────────────────

const buildRiskFactors = (resilience, incomeSummary, netPosition, snapshot) => {
  const factors = [];

  if (incomeSummary.farm_income_pct > 70) {
    factors.push({
      factor: 'High farm dependency',
      impact: 'high',
      message_key: 'drishti.risk.farm_concentration',
      message: `${Math.round(incomeSummary.farm_income_pct)}% of income depends on farming — vulnerable to weather and market shocks`,
    });
  }

  if (netPosition.deficit_months >= 4) {
    factors.push({
      factor: 'Extended cash flow gaps',
      impact: 'high',
      message_key: 'drishti.risk.cash_gap',
      message: `${netPosition.deficit_months} months with negative cash flow — working capital of ₹${Math.round(netPosition.working_capital_gap).toLocaleString('en-IN')} needed`,
    });
  }

  if (resilience.metrics.singlePointOfFailure) {
    factors.push({
      factor: 'Single point of failure',
      impact: 'high',
      message_key: 'drishti.risk.spof',
      message: `Losing ${(resilience.metrics.highestRiskIncomeLoss || 'main income').replace(/_/g, ' ')} alone would make expenses unmanageable`,
    });
  }

  if (incomeSummary.income_diversification_rating === 'highly_concentrated') {
    factors.push({
      factor: 'Low diversification',
      impact: 'medium',
      message_key: 'drishti.risk.low_diversification',
      message: 'Income concentrated in few sources — add more non-farm streams for safety',
    });
  }

  if (!snapshot.active_insurance || snapshot.active_insurance.length === 0) {
    factors.push({
      factor: 'No insurance coverage',
      impact: 'medium',
      message_key: 'drishti.risk.no_insurance',
      message: 'No active insurance — crop or livestock loss directly impacts household',
    });
  }

  return factors;
};

// ─── Recommendations ────────────────────────────────────────────────

const generateRecommendations = (incomeSummary, netPosition, resilience, comparison, incomeProjection, cashFlow) => {
  const recs = [];

  // Diversification strength
  if (incomeSummary.income_diversification_rating === 'well_diversified') {
    const streamCount = incomeSummary.income_streams.length;
    recs.push({
      type: 'strength',
      message_key: 'drishti.rec.good_diversification',
      message: `Your household has ${streamCount} income streams — losing any single one won't be catastrophic`,
    });
  }

  // Working capital warning
  if (netPosition.working_capital_gap > 0) {
    const gap = Math.round(netPosition.working_capital_gap);
    const deficitMonths = netPosition.deficit_period || [];
    recs.push({
      type: 'warning',
      message_key: 'drishti.rec.working_capital',
      message: `You'll need ₹${gap.toLocaleString('en-IN')} working capital for ${deficitMonths.join(', ')} when expenses exceed income`,
    });
  }

  // SHG scaling
  if (incomeProjection && incomeProjection.bySource && incomeProjection.bySource.spouse_shg) {
    recs.push({
      type: 'action',
      message_key: 'drishti.rec.increase_shg',
      message: "Spouse's SHG micro-enterprise is your most reliable non-farm income — consider scaling it",
    });
  }

  // Resilience info
  const survivalMonths = resilience.metrics.monthsSurvivableWithoutFarmIncome;
  if (survivalMonths > 0) {
    recs.push({
      type: 'info',
      message_key: 'drishti.rec.resilience',
      message: `Even if crops fail completely, your household can survive ${survivalMonths} months on non-farm income alone`,
    });
  }

  // Income improvement
  if (comparison.income_change_pct > 10) {
    recs.push({
      type: 'strength',
      message_key: 'drishti.rec.income_increase',
      message: `This portfolio increases household income by ${Math.round(comparison.income_change_pct)}% compared to current activities`,
    });
  } else if (comparison.income_change_pct < -5) {
    recs.push({
      type: 'warning',
      message_key: 'drishti.rec.income_decrease',
      message: `This portfolio reduces household income by ${Math.abs(Math.round(comparison.income_change_pct))}% — consider retaining current high-earning activities`,
    });
  }

  // Dairy as stabilizer suggestion
  const hasDairy = incomeSummary.income_streams.some(s => s.source === 'dairy');
  if (!hasDairy && incomeSummary.farm_income_pct > 50) {
    recs.push({
      type: 'action',
      message_key: 'drishti.rec.add_dairy',
      message: 'Adding dairy provides monthly cash flow during crop lean months — reduces seasonal income gaps',
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

const summarizeFarmActivities = (proposed) => {
  const summary = {};
  if (proposed.crops && proposed.crops.length > 0) summary.crops = proposed.crops.length;
  if (proposed.dairy) summary.dairy_animals = proposed.dairy.animal_count;
  if (proposed.fishery) summary.fishery_hectares = proposed.fishery.pond_area_hectares;
  return summary;
};

const round2 = (n) => Math.round((n || 0) * 100) / 100;

module.exports = { compute };
