/**
 * Risk Scorer
 *
 * Computes a composite risk score (0–100, higher = riskier) from multiple
 * factors. Pure function — no DB access. Works on snapshot + cashflow data.
 *
 * Risk factors:
 *  1. Income concentration     — dependency on single income source
 *  2. Weather dependency       — rainfed vs irrigated, climate exposure
 *  3. Market volatility        — price trend and forecast confidence
 *  4. Debt burden              — EMI/income ratio, outstanding/income
 *  5. Cash flow fragility      — deficit months, working capital gap
 *  6. Insurance gap            — lack of crop/livestock insurance
 *
 * Also classifies:
 *  - Health status: good | watch | stressed | npa
 *  - SMA classification: standard | sma_0_30 | sma_30_60 | sma_60_90 | npa
 *  - Income adequacy: strong | adequate | marginal | inadequate
 */

// ─── Score Weights (sum = 1.0) ──────────────────────────────────────

const WEIGHTS = {
  incomeConcentration: 0.20,
  weatherDependency:   0.15,
  marketVolatility:    0.10,
  debtBurden:          0.25,
  cashFlowFragility:   0.20,
  insuranceGap:        0.10,
};

// ─── Main Scorer ────────────────────────────────────────────────────

/**
 * @param {object} params
 * @param {object} params.snapshot          - DrishtiFarmerSnapshot
 * @param {object} params.cashFlowSummary   - From cashFlowProjector.projectCashFlow().summary
 * @param {string} [params.irrigationType='rainfed']
 * @param {number} [params.rainfallDeviationPct=0]
 * @param {number} [params.projectedNetIncome=0]
 * @returns {{ riskScore, riskRating, healthStatus, smaClass, incomeAdequacy, factors }}
 */
const computeRiskScore = ({
  snapshot,
  cashFlowSummary,
  irrigationType = 'rainfed',
  rainfallDeviationPct = 0,
  projectedNetIncome = 0,
}) => {
  const factors = [];

  // ── 1. Income Concentration (0–100) ──
  const concentrationScore = scoreIncomeConcentration(snapshot, cashFlowSummary);
  factors.push({ factor: 'income_concentration', score: concentrationScore.score, impact: concentrationScore.impact, detail: concentrationScore.detail });

  // ── 2. Weather Dependency (0–100) ──
  const weatherScore = scoreWeatherDependency(irrigationType, rainfallDeviationPct, snapshot);
  factors.push({ factor: 'weather_dependency', score: weatherScore.score, impact: weatherScore.impact, detail: weatherScore.detail });

  // ── 3. Market Volatility (0–100) ──
  const marketScore = scoreMarketVolatility(snapshot);
  factors.push({ factor: 'market_volatility', score: marketScore.score, impact: marketScore.impact, detail: marketScore.detail });

  // ── 4. Debt Burden (0–100) ──
  const debtScore = scoreDebtBurden(snapshot, cashFlowSummary, projectedNetIncome);
  factors.push({ factor: 'debt_burden', score: debtScore.score, impact: debtScore.impact, detail: debtScore.detail });

  // ── 5. Cash Flow Fragility (0–100) ──
  const cashFlowScore = scoreCashFlowFragility(cashFlowSummary);
  factors.push({ factor: 'cash_flow_fragility', score: cashFlowScore.score, impact: cashFlowScore.impact, detail: cashFlowScore.detail });

  // ── 6. Insurance Gap (0–100) ──
  const insuranceScore = scoreInsuranceGap(snapshot);
  factors.push({ factor: 'insurance_gap', score: insuranceScore.score, impact: insuranceScore.impact, detail: insuranceScore.detail });

  // Weighted composite
  const riskScore = Math.round(
    concentrationScore.score * WEIGHTS.incomeConcentration +
    weatherScore.score * WEIGHTS.weatherDependency +
    marketScore.score * WEIGHTS.marketVolatility +
    debtScore.score * WEIGHTS.debtBurden +
    cashFlowScore.score * WEIGHTS.cashFlowFragility +
    insuranceScore.score * WEIGHTS.insuranceGap
  );

  const clampedScore = Math.max(0, Math.min(100, riskScore));

  return {
    riskScore: clampedScore,
    riskRating: classifyRiskRating(clampedScore),
    healthStatus: classifyHealthStatus(clampedScore, debtScore.score),
    smaClass: classifySma(debtScore.daysOverdue || 0),
    incomeAdequacy: classifyIncomeAdequacy(debtScore.emiToIncomeRatio),
    factors,
  };
};

// ─── Individual Factor Scorers ──────────────────────────────────────

/**
 * Income concentration: high risk if >60% income from a single source.
 * Uses Herfindahl-style calculation on income streams.
 */
const scoreIncomeConcentration = (snapshot, cashFlowSummary) => {
  const farmPct = (cashFlowSummary.farmIncomePct || 0) / 100;
  const nonFarmPct = (cashFlowSummary.nonFarmIncomePct || 0) / 100;
  const streamCount = parseInt(snapshot.non_farm_income_streams) || 0;

  // Higher concentration = higher risk
  let score;
  if (farmPct >= 0.80) score = 85;       // Almost entirely farm-dependent
  else if (farmPct >= 0.60) score = 60;
  else if (farmPct >= 0.40) score = 35;
  else score = 15;                        // Well diversified

  // Bonus reduction for multiple non-farm streams
  if (streamCount >= 4) score = Math.max(score - 15, 0);
  else if (streamCount >= 2) score = Math.max(score - 8, 0);

  const impact = score >= 60 ? 'high' : score >= 35 ? 'medium' : 'low';

  return {
    score,
    impact,
    detail: `Farm income ${Math.round(farmPct * 100)}%, ${streamCount} non-farm streams`,
  };
};

/**
 * Weather dependency: rainfed + high rainfall deviation = high risk.
 */
const scoreWeatherDependency = (irrigationType, rainfallDeviationPct, snapshot) => {
  let score = 0;

  // Irrigation type base
  if (irrigationType === 'rainfed') score += 45;
  else if (irrigationType === 'mixed') score += 25;
  else score += 10; // irrigated

  // Rainfall deviation impact
  const absDev = Math.abs(rainfallDeviationPct);
  if (absDev >= 30) score += 40;
  else if (absDev >= 15) score += 25;
  else if (absDev >= 5) score += 10;

  // Weather alert from snapshot
  const weather = snapshot.weather_outlook;
  if (weather && weather.rainfallMm24h !== null) {
    if (weather.rainfallMm24h > 100) score += 15; // Heavy rain event
    else if (weather.rainfallMm24h < 1 && irrigationType === 'rainfed') score += 10;
  }

  const clamped = Math.min(score, 100);
  const impact = clamped >= 60 ? 'high' : clamped >= 35 ? 'medium' : 'low';

  return {
    score: clamped,
    impact,
    detail: `${irrigationType}, rainfall deviation ${rainfallDeviationPct}%`,
  };
};

/**
 * Market volatility: based on price trend and forecast confidence from snapshot.
 */
const scoreMarketVolatility = (snapshot) => {
  const prices = snapshot.relevant_commodity_prices || [];
  if (prices.length === 0) return { score: 50, impact: 'medium', detail: 'No price data' };

  let totalScore = 0;

  for (const p of prices) {
    let s = 30; // baseline uncertainty

    // Price trend
    if (p.priceTrend === 'falling') s += 25;
    else if (p.priceTrend === 'stable') s += 0;
    else if (p.priceTrend === 'rising') s -= 10;

    // Forecast confidence
    const conf = p.forecastConfidence || 0;
    if (conf < 30) s += 20;      // Low confidence = high uncertainty
    else if (conf < 60) s += 10;
    else s -= 5;                  // High confidence = lower risk

    totalScore += Math.max(0, Math.min(100, s));
  }

  const avgScore = Math.round(totalScore / prices.length);
  const impact = avgScore >= 60 ? 'high' : avgScore >= 35 ? 'medium' : 'low';

  return { score: avgScore, impact, detail: `${prices.length} commodities tracked` };
};

/**
 * Debt burden: EMI-to-income ratio, total outstanding vs annual income.
 */
const scoreDebtBurden = (snapshot, cashFlowSummary, projectedNetIncome) => {
  const totalEmi = parseFloat(snapshot.total_monthly_emi) || 0;
  const totalOutstanding = parseFloat(snapshot.total_outstanding) || 0;
  const monthlyIncome = (cashFlowSummary.totalInflows || 0) / (cashFlowSummary.horizonMonths || 12);
  const annualIncome = cashFlowSummary.totalInflows || 0;

  const emiToIncome = monthlyIncome > 0 ? totalEmi / monthlyIncome : 0;
  const debtToIncome = annualIncome > 0 ? totalOutstanding / annualIncome : 0;

  let score = 0;

  // EMI to income ratio scoring
  if (emiToIncome >= 0.50) score += 55;
  else if (emiToIncome >= 0.35) score += 40;
  else if (emiToIncome >= 0.20) score += 25;
  else score += 10;

  // Debt to income ratio
  if (debtToIncome >= 1.0) score += 35;
  else if (debtToIncome >= 0.5) score += 20;
  else score += 5;

  // Projected net income — can they repay?
  if (projectedNetIncome < 0) score += 15;

  const clamped = Math.min(score, 100);
  const impact = clamped >= 60 ? 'high' : clamped >= 35 ? 'medium' : 'low';

  return {
    score: clamped,
    impact,
    detail: `EMI/income ${Math.round(emiToIncome * 100)}%, outstanding/income ${Math.round(debtToIncome * 100)}%`,
    emiToIncomeRatio: Math.round(emiToIncome * 100) / 100,
    daysOverdue: 0, // would come from loan health; default for projections
  };
};

/**
 * Cash flow fragility: deficit months and working capital gap.
 */
const scoreCashFlowFragility = (cashFlowSummary) => {
  const deficitMonths = cashFlowSummary.deficitMonths || 0;
  const workingCapitalGap = cashFlowSummary.workingCapitalGap || 0;
  const totalInflows = cashFlowSummary.totalInflows || 1;

  let score = 0;

  // Deficit months
  if (deficitMonths >= 6) score += 50;
  else if (deficitMonths >= 4) score += 35;
  else if (deficitMonths >= 2) score += 20;
  else score += 5;

  // Working capital gap relative to annual income
  const gapRatio = workingCapitalGap / totalInflows;
  if (gapRatio >= 0.20) score += 40;
  else if (gapRatio >= 0.10) score += 25;
  else if (gapRatio >= 0.05) score += 15;
  else score += 5;

  const clamped = Math.min(score, 100);
  const impact = clamped >= 60 ? 'high' : clamped >= 35 ? 'medium' : 'low';

  return {
    score: clamped,
    impact,
    detail: `${deficitMonths} deficit months, WC gap ₹${Math.round(workingCapitalGap)}`,
  };
};

/**
 * Insurance gap: no insurance on major activities = higher risk.
 */
const scoreInsuranceGap = (snapshot) => {
  const insurance = snapshot.active_insurance || [];
  const hasCrop = snapshot.active_crop_cycles && snapshot.active_crop_cycles.length > 0;
  const hasDairy = !!snapshot.active_dairy_profile;
  const hasFishery = !!snapshot.active_fishery_profile;

  const activeActivities = [hasCrop, hasDairy, hasFishery].filter(Boolean).length;
  if (activeActivities === 0) return { score: 20, impact: 'low', detail: 'No active activities' };

  const insuredTypes = new Set(insurance.map(i => i.type));
  let coveredCount = 0;
  if (hasCrop && (insuredTypes.has('pmfby_crop') || insuredTypes.has('weather_index'))) coveredCount++;
  if (hasDairy && insuredTypes.has('livestock')) coveredCount++;
  if (hasFishery && insuredTypes.has('aquaculture')) coveredCount++;

  const coverageRatio = coveredCount / activeActivities;

  let score;
  if (coverageRatio >= 1.0) score = 10;
  else if (coverageRatio >= 0.5) score = 40;
  else if (coverageRatio > 0) score = 60;
  else score = 80; // No insurance at all

  const impact = score >= 60 ? 'high' : score >= 35 ? 'medium' : 'low';

  return {
    score,
    impact,
    detail: `${coveredCount}/${activeActivities} activities insured`,
  };
};

// ─── Classification Helpers ─────────────────────────────────────────

const classifyRiskRating = (score) => {
  if (score <= 25) return 'low';
  if (score <= 45) return 'moderate';
  if (score <= 65) return 'elevated';
  if (score <= 80) return 'high';
  return 'critical';
};

const classifyHealthStatus = (overallScore, debtScore) => {
  if (overallScore <= 30 && debtScore <= 30) return 'good';
  if (overallScore <= 50) return 'watch';
  if (overallScore <= 75) return 'stressed';
  return 'npa';
};

const classifySma = (daysOverdue) => {
  if (daysOverdue <= 0) return 'standard';
  if (daysOverdue <= 30) return 'sma_0_30';
  if (daysOverdue <= 60) return 'sma_30_60';
  if (daysOverdue <= 90) return 'sma_60_90';
  return 'npa';
};

const classifyIncomeAdequacy = (emiToIncomeRatio) => {
  if (emiToIncomeRatio <= 0.20) return 'strong';
  if (emiToIncomeRatio <= 0.35) return 'adequate';
  if (emiToIncomeRatio <= 0.50) return 'marginal';
  return 'inadequate';
};

module.exports = {
  computeRiskScore,
  // Exported for testing individual factors
  scoreIncomeConcentration,
  scoreWeatherDependency,
  scoreMarketVolatility,
  scoreDebtBurden,
  scoreCashFlowFragility,
  scoreInsuranceGap,
  classifyRiskRating,
  classifyHealthStatus,
  classifySma,
  classifyIncomeAdequacy,
  WEIGHTS,
};
