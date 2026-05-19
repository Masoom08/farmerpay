/**
 * Resilience Calculator
 *
 * Computes household financial resilience — how well the household can
 * survive economic shocks. Pure function — no DB access.
 *
 * Metrics:
 *  1. Months survivable without farm income
 *  2. Income diversification index (1 - Herfindahl-Hirschman)
 *  3. Single-point-of-failure identification
 *  4. Emergency fund adequacy
 *  5. Stress scenario impact analysis (crop failure, spouse income loss, remittance stops)
 *
 * Score: 0–100 (higher = more resilient)
 *  0-25:  fragile     — farm-dependent, no safety net
 *  26-45: vulnerable  — some non-farm income but not enough to cover a shock
 *  46-65: moderate    — can survive short disruptions
 *  66-80: resilient   — diversified, can handle most single-source failures
 *  81-100: very_resilient — deeply diversified, multiple safety nets
 */

// ─── Score weights ──────────────────────────────────────────────────
const WEIGHTS = {
  diversification: 0.25,
  survivalMonths: 0.25,
  expenseCoverage: 0.20,
  singlePointOfFailure: 0.15,
  emergencyFund: 0.15,
};

// ─── Main Calculator ────────────────────────────────────────────────

/**
 * @param {object} params
 * @param {object} params.snapshot                - DrishtiFarmerSnapshot
 * @param {object} params.incomeProjection        - From householdIncomeProjector
 * @param {object} params.expenseProjection       - From householdExpenseProjector
 * @param {object} params.cashFlowSummary         - From cashFlowProjector
 * @param {number} params.totalFarmIncomeAnnual   - Projected farm income
 * @param {number} params.totalNonFarmIncomeAnnual - Projected non-farm income
 * @param {number} params.totalExpenseAnnual       - Projected total expenses (household + farm + EMI)
 * @param {number} [params.savingsEstimate=0]      - Estimated savings/reserves
 * @returns {{ resilienceScore, resilienceRating, metrics, stressScenarios, recommendations }}
 */
const calculateResilience = ({
  snapshot,
  incomeProjection,
  expenseProjection,
  cashFlowSummary,
  totalFarmIncomeAnnual,
  totalNonFarmIncomeAnnual,
  totalExpenseAnnual,
  savingsEstimate = 0,
}) => {
  const totalAnnualIncome = totalFarmIncomeAnnual + totalNonFarmIncomeAnnual;

  // ── 1. Income Diversification Index ──
  const diversification = computeDiversificationIndex(incomeProjection, totalFarmIncomeAnnual);

  // ── 2. Months survivable without farm income ──
  const survivalMetrics = computeSurvivalMonths(
    totalNonFarmIncomeAnnual,
    totalExpenseAnnual,
    totalFarmIncomeAnnual,
    savingsEstimate
  );

  // ── 3. Expense coverage ratios ──
  const coverage = computeExpenseCoverage(
    totalNonFarmIncomeAnnual,
    totalExpenseAnnual,
    expenseProjection
  );

  // ── 4. Single-point-of-failure analysis ──
  const spofAnalysis = identifySinglePointOfFailure(
    incomeProjection,
    totalFarmIncomeAnnual,
    totalAnnualIncome,
    totalExpenseAnnual
  );

  // ── 5. Emergency fund adequacy ──
  const emergencyFund = assessEmergencyFund(
    savingsEstimate,
    totalExpenseAnnual / 12,
    cashFlowSummary
  );

  // ── Compute composite score ──
  const rawScore =
    diversification.score * WEIGHTS.diversification +
    survivalMetrics.score * WEIGHTS.survivalMonths +
    coverage.score * WEIGHTS.expenseCoverage +
    spofAnalysis.score * WEIGHTS.singlePointOfFailure +
    emergencyFund.score * WEIGHTS.emergencyFund;

  const resilienceScore = clamp(Math.round(rawScore), 0, 100);
  const resilienceRating = classifyResilience(resilienceScore);

  // ── Stress scenarios ──
  const stressScenarios = buildStressScenarios(
    incomeProjection,
    totalFarmIncomeAnnual,
    totalNonFarmIncomeAnnual,
    totalExpenseAnnual,
    snapshot
  );

  // ── Recommendations ──
  const recommendations = generateRecommendations(
    diversification,
    survivalMetrics,
    coverage,
    spofAnalysis,
    incomeProjection
  );

  return {
    resilienceScore,
    resilienceRating,
    metrics: {
      monthsSurvivableWithoutFarmIncome: survivalMetrics.months,
      nonFarmCoversHouseholdExpensesPct: coverage.nonFarmCoversHouseholdPct,
      nonFarmCoversAllExpensesPct: coverage.nonFarmCoversAllPct,
      incomeDiversificationIndex: diversification.index,
      incomeDiversificationRating: diversification.rating,
      singlePointOfFailure: spofAnalysis.hasSPOF,
      highestRiskIncomeLoss: spofAnalysis.highestRisk,
      emergencyFundMonths: emergencyFund.months,
    },
    stressScenarios,
    recommendations,
    factorScores: {
      diversification: diversification.score,
      survivalMonths: survivalMetrics.score,
      expenseCoverage: coverage.score,
      singlePointOfFailure: spofAnalysis.score,
      emergencyFund: emergencyFund.score,
    },
  };
};

// ─── 1. Diversification Index ───────────────────────────────────────

/**
 * Uses inverted Herfindahl-Hirschman Index (HHI).
 * HHI = sum of squared income shares. 1/N (perfectly equal) to 1.0 (single source).
 * Diversification index = 1 - HHI (0 = concentrated, 1 = diversified).
 */
const computeDiversificationIndex = (incomeProjection, totalFarmIncomeAnnual) => {
  const shares = [];

  // Farm income as one block
  if (totalFarmIncomeAnnual > 0) {
    shares.push(totalFarmIncomeAnnual);
  }

  // Non-farm income by source
  if (incomeProjection && incomeProjection.bySource) {
    for (const [source, data] of Object.entries(incomeProjection.bySource)) {
      if (data.annual > 0) {
        shares.push(data.annual);
      }
    }
  }

  if (shares.length === 0) {
    return { index: 0, rating: 'none', score: 0 };
  }

  const total = shares.reduce((s, v) => s + v, 0);
  if (total <= 0) {
    return { index: 0, rating: 'none', score: 0 };
  }

  // HHI calculation
  const hhi = shares.reduce((sum, share) => {
    const fraction = share / total;
    return sum + fraction * fraction;
  }, 0);

  const index = round2(1 - hhi);

  let rating, score;
  if (index >= 0.75) { rating = 'well_diversified'; score = 90; }
  else if (index >= 0.55) { rating = 'moderately_diversified'; score = 65; }
  else if (index >= 0.35) { rating = 'somewhat_concentrated'; score = 40; }
  else { rating = 'highly_concentrated'; score = 15; }

  return { index, rating, score, streamCount: shares.length, hhi: round2(hhi) };
};

// ─── 2. Survival Months ─────────────────────────────────────────────

const computeSurvivalMonths = (nonFarmAnnual, totalExpenseAnnual, farmIncomeAnnual, savings) => {
  const monthlyExpenseWithoutFarmCosts = totalExpenseAnnual / 12;
  const monthlyNonFarm = nonFarmAnnual / 12;

  // How many months can non-farm income + savings cover if farm income stops?
  // Assume farm operating costs also stop (no inputs needed)
  const monthlyDeficit = monthlyExpenseWithoutFarmCosts - monthlyNonFarm;

  let months;
  if (monthlyDeficit <= 0) {
    // Non-farm income alone covers all expenses
    months = 12; // cap at 12 (can survive indefinitely)
  } else if (savings > 0) {
    months = savings / monthlyDeficit;
  } else {
    months = 0;
  }

  // Also consider: if non-farm covers some but not all, partial survival
  if (months === 0 && monthlyNonFarm > 0) {
    // Can partially survive — count months where non-farm > essential expenses
    const essentialExpenseMonthly = totalExpenseAnnual / 12 * 0.6; // 60% = essentials
    if (monthlyNonFarm >= essentialExpenseMonthly) {
      months = round2(monthlyNonFarm / monthlyExpenseWithoutFarmCosts * 12);
    }
  }

  months = round2(Math.min(months, 12));

  let score;
  if (months >= 6) score = 90;
  else if (months >= 4) score = 70;
  else if (months >= 2) score = 45;
  else if (months >= 1) score = 25;
  else score = 5;

  return { months, score };
};

// ─── 3. Expense Coverage ────────────────────────────────────────────

const computeExpenseCoverage = (nonFarmAnnual, totalExpenseAnnual, expenseProjection) => {
  // Household-only expenses (excluding farm operation costs)
  const householdExpenseAnnual = expenseProjection
    ? expenseProjection.summary.totalProjectedAnnual
    : totalExpenseAnnual * 0.45; // estimate household = ~45% of total

  const nonFarmCoversHouseholdPct = householdExpenseAnnual > 0
    ? round2((nonFarmAnnual / householdExpenseAnnual) * 100)
    : 0;

  const nonFarmCoversAllPct = totalExpenseAnnual > 0
    ? round2((nonFarmAnnual / totalExpenseAnnual) * 100)
    : 0;

  let score;
  if (nonFarmCoversHouseholdPct >= 120) score = 90;
  else if (nonFarmCoversHouseholdPct >= 80) score = 70;
  else if (nonFarmCoversHouseholdPct >= 50) score = 45;
  else if (nonFarmCoversHouseholdPct >= 25) score = 20;
  else score = 5;

  return { nonFarmCoversHouseholdPct, nonFarmCoversAllPct, score };
};

// ─── 4. Single Point of Failure ─────────────────────────────────────

/**
 * A SPOF exists if losing any single income source would make the household
 * unable to cover expenses.
 */
const identifySinglePointOfFailure = (incomeProjection, totalFarmIncome, totalIncome, totalExpense) => {
  const sources = [];

  // Farm income as a source
  if (totalFarmIncome > 0) {
    sources.push({ source: 'farm_income', annual: totalFarmIncome });
  }

  // Non-farm sources
  if (incomeProjection && incomeProjection.bySource) {
    for (const [source, data] of Object.entries(incomeProjection.bySource)) {
      if (data.annual > 0) {
        sources.push({ source, annual: data.annual });
      }
    }
  }

  // Sort by annual amount descending
  sources.sort((a, b) => b.annual - a.annual);

  let hasSPOF = false;
  let highestRisk = null;
  let highestRiskImpact = null;
  const failures = [];

  for (const s of sources) {
    const remainingIncome = totalIncome - s.annual;
    const canCoverExpenses = remainingIncome >= totalExpense;
    const shortfall = canCoverExpenses ? 0 : round2(totalExpense - remainingIncome);
    const pctOfIncome = totalIncome > 0 ? round2((s.annual / totalIncome) * 100) : 0;

    if (!canCoverExpenses && pctOfIncome >= 20) {
      hasSPOF = true;
      if (!highestRisk || s.annual > (highestRiskImpact || 0)) {
        highestRisk = s.source;
        highestRiskImpact = s.annual;
      }
    }

    failures.push({
      source: s.source,
      annualIncome: s.annual,
      pctOfTotal: pctOfIncome,
      remainingIfLost: round2(remainingIncome),
      canSurvive: canCoverExpenses,
      shortfall,
    });
  }

  let score;
  if (!hasSPOF) score = 85;
  else if (failures.filter(f => !f.canSurvive).length === 1) score = 45;
  else score = 15;

  return { hasSPOF, highestRisk, highestRiskImpact, failures, score };
};

// ─── 5. Emergency Fund ──────────────────────────────────────────────

const assessEmergencyFund = (savings, monthlyExpense, cashFlowSummary) => {
  // Emergency fund = savings + cumulative surplus from cash flow
  let effectiveFund = savings;

  if (cashFlowSummary && cashFlowSummary.netSurplus > 0) {
    // Assume ~30% of annual surplus is saveable
    effectiveFund += cashFlowSummary.netSurplus * 0.30;
  }

  const months = monthlyExpense > 0 ? round2(effectiveFund / monthlyExpense) : 0;

  let score;
  if (months >= 6) score = 90;
  else if (months >= 3) score = 65;
  else if (months >= 1) score = 35;
  else score = 10;

  return { savings: round2(savings), effectiveFund: round2(effectiveFund), months, score };
};

// ─── Stress Scenarios ───────────────────────────────────────────────

const buildStressScenarios = (incomeProjection, farmIncome, nonFarmIncome, totalExpense, snapshot) => {
  const totalIncome = farmIncome + nonFarmIncome;
  const scenarios = [];

  // 1. Crop failure — complete kharif loss
  if (farmIncome > 0) {
    const loss = round2(farmIncome * 0.7); // 70% of farm income from crops typically
    const remaining = round2(totalIncome - loss);
    const loanEmi = parseFloat(snapshot.total_monthly_emi) || 0;

    scenarios.push({
      label: 'crop_failure',
      description: 'Complete kharif crop loss due to drought',
      income_change: round2(-loss),
      remaining_income: remaining,
      household_can_survive: remaining >= totalExpense * 0.6, // Can cover essentials
      survival_depends_on: identifySurvivalDependencies(incomeProjection, 'farm_income'),
      loan_repayment_at_risk: remaining < totalExpense,
      projected_health_status: remaining >= totalExpense ? 'good' : remaining >= totalExpense * 0.7 ? 'watch' : 'stressed',
    });
  }

  // 2. Spouse income stops
  const spouseIncome = getSourceAnnual(incomeProjection, ['spouse_shg', 'petty_business'], 'spouse');
  if (spouseIncome > 0) {
    const remaining = round2(totalIncome - spouseIncome);
    scenarios.push({
      label: 'spouse_income_stops',
      description: 'Spouse SHG + business income stops',
      income_change: round2(-spouseIncome),
      remaining_income: remaining,
      household_can_survive: remaining >= totalExpense * 0.6,
      loan_repayment_at_risk: remaining < totalExpense,
      projected_health_status: remaining >= totalExpense ? 'good' : remaining >= totalExpense * 0.7 ? 'watch' : 'stressed',
    });
  }

  // 3. Remittance stops
  const remittanceIncome = getSourceAnnual(incomeProjection, ['remittance']);
  if (remittanceIncome > 0) {
    const remaining = round2(totalIncome - remittanceIncome);
    scenarios.push({
      label: 'remittance_stops',
      description: 'Family member loses city job, remittances stop',
      income_change: round2(-remittanceIncome),
      remaining_income: remaining,
      household_can_survive: remaining >= totalExpense * 0.6,
      loan_repayment_at_risk: remaining < totalExpense,
      projected_health_status: remaining >= totalExpense ? 'good' : remaining >= totalExpense * 0.7 ? 'watch' : 'stressed',
    });
  }

  // 4. Health emergency
  const healthExpense = 50000; // Estimated ₹50k emergency medical expense
  scenarios.push({
    label: 'health_emergency',
    description: 'Major medical emergency requiring ₹50,000',
    income_change: 0,
    additional_expense: healthExpense,
    remaining_income: totalIncome,
    household_can_survive: totalIncome - totalExpense >= healthExpense,
    projected_health_status: totalIncome - totalExpense >= healthExpense ? 'good' : 'watch',
  });

  return scenarios;
};

// ─── Recommendations ────────────────────────────────────────────────

const generateRecommendations = (diversification, survival, coverage, spof, incomeProjection) => {
  const recs = [];

  // Diversification
  if (diversification.rating === 'highly_concentrated') {
    recs.push({
      type: 'warning',
      message_key: 'drishti.rec.low_diversification',
      message: 'Income is highly concentrated — consider adding non-farm income streams',
    });
  } else if (diversification.rating === 'well_diversified') {
    recs.push({
      type: 'strength',
      message_key: 'drishti.rec.good_diversification',
      message: `Your household has ${diversification.streamCount} income streams — losing any single one won't be catastrophic`,
    });
  }

  // Survival months
  if (survival.months < 2) {
    recs.push({
      type: 'warning',
      message_key: 'drishti.rec.low_survival',
      message: 'If farm income stops, your household can survive less than 2 months — build an emergency buffer',
    });
  } else if (survival.months >= 4) {
    recs.push({
      type: 'info',
      message_key: 'drishti.rec.resilience',
      message: `Even if crops fail completely, your household can survive ${survival.months} months on non-farm income alone`,
    });
  }

  // Single point of failure
  if (spof.hasSPOF && spof.highestRisk) {
    const riskLabel = spof.highestRisk === 'farm_income' ? 'farm income' : spof.highestRisk.replace(/_/g, ' ');
    recs.push({
      type: 'warning',
      message_key: 'drishti.rec.spof_risk',
      message: `Losing ${riskLabel} alone would make expenses unmanageable — reduce dependency`,
    });
  }

  // SHG scaling opportunity
  if (incomeProjection && incomeProjection.bySource) {
    const shg = incomeProjection.bySource.spouse_shg;
    if (shg && shg.annual > 0) {
      recs.push({
        type: 'action',
        message_key: 'drishti.rec.increase_shg',
        message: "Spouse's SHG micro-enterprise is your most reliable non-farm income — consider scaling it",
      });
    }
  }

  return recs;
};

// ─── Helpers ────────────────────────────────────────────────────────

const getSourceAnnual = (incomeProjection, sourceTypes, earningMember = null) => {
  if (!incomeProjection || !incomeProjection.bySource) return 0;
  let total = 0;
  for (const [source, data] of Object.entries(incomeProjection.bySource)) {
    if (sourceTypes.includes(source)) {
      if (!earningMember || data.earningMember === earningMember) {
        total += data.annual;
      }
    }
  }
  return total;
};

const identifySurvivalDependencies = (incomeProjection, excludeSource) => {
  if (!incomeProjection || !incomeProjection.bySource) return [];
  return Object.entries(incomeProjection.bySource)
    .filter(([source, data]) => source !== excludeSource && data.annual > 0)
    .sort((a, b) => b[1].annual - a[1].annual)
    .slice(0, 3)
    .map(([source]) => source);
};

const classifyResilience = (score) => {
  if (score >= 81) return 'very_resilient';
  if (score >= 66) return 'resilient';
  if (score >= 46) return 'moderate';
  if (score >= 26) return 'vulnerable';
  return 'fragile';
};

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
const round2 = (n) => Math.round((n || 0) * 100) / 100;

module.exports = {
  calculateResilience,
  computeDiversificationIndex,
  computeSurvivalMonths,
  computeExpenseCoverage,
  identifySinglePointOfFailure,
  assessEmergencyFund,
  classifyResilience,
  WEIGHTS,
};
