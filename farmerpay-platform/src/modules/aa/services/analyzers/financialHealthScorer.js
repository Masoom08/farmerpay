/**
 * Financial Health Scorer — Layer 2 Analyzer
 * Computes a composite financial health score from AA bank statement data.
 * Produces a 0-100 score with component breakdown, optimized for agri-lending.
 *
 * Score Components (weights add to 100):
 *   1. Cash Flow Stability   (25) — Regularity and predictability of income
 *   2. Balance Adequacy      (20) — Average balance relative to monthly outflow
 *   3. Income Diversity      (15) — Number and spread of income sources
 *   4. Debt Discipline       (20) — EMI regularity, bounce rate, NACH success
 *   5. Govt Transfer Access  (10) — PM-KISAN, DBT, MGNREGA access (proxy for verified farmer status)
 *   6. Digital Adoption       (10) — UPI usage, digital transaction share
 */

const { classifyAllCredits } = require('./incomeClassifier');
const { classifyAllDebits } = require('./expenseDetector');
const { buildSeasonalityMap } = require('./seasonalityMapper');

/**
 * Compute financial health score from bank transactions.
 * @param {Array} transactions - All bank transactions
 * @param {Object} bankSummary - AaBankStatementSummary record (optional, for pre-computed metrics)
 * @returns {Object} { score, grade, components, insights, drishtiInputs }
 */
const computeFinancialHealthScore = (transactions, bankSummary = {}) => {
  const seasonality = buildSeasonalityMap(transactions);
  const income = classifyAllCredits(transactions);
  const expense = classifyAllDebits(transactions);

  const components = {
    cashFlowStability: scoreCashFlowStability(seasonality, bankSummary),
    balanceAdequacy: scoreBalanceAdequacy(bankSummary, expense.summary),
    incomeDiversity: scoreIncomeDiversity(income),
    debtDiscipline: scoreDebtDiscipline(bankSummary, expense),
    govtTransferAccess: scoreGovtTransferAccess(income, bankSummary),
    digitalAdoption: scoreDigitalAdoption(bankSummary, transactions),
  };

  // Weighted composite score
  const weights = {
    cashFlowStability: 25,
    balanceAdequacy: 20,
    incomeDiversity: 15,
    debtDiscipline: 20,
    govtTransferAccess: 10,
    digitalAdoption: 10,
  };

  const totalScore = Object.entries(components).reduce(
    (sum, [key, comp]) => sum + (comp.score * weights[key] / 100), 0
  );

  const grade = scoreToGrade(totalScore);

  return {
    score: Math.round(totalScore),
    grade,
    components,
    seasonality: seasonality.insights,
    // Ready-to-use inputs for DRISHTI and TRUST modules
    drishtiInputs: {
      monthlyIncomeMap: seasonality.monthlyMap,
      incomeCategories: income.summary,
      expenseCategories: expense.summary,
      emiRecommendation: seasonality.insights.recommendedEmiSchedule,
      seasonPattern: seasonality.insights.seasonPattern,
      incomeRegularity: seasonality.insights.incomeRegularity,
      deficitMonths: seasonality.insights.deficitMonthCount,
    },
    trustInputs: {
      financialHealthScore: Math.round(totalScore),
      bounceRate: bankSummary.bounce_count || 0,
      emiDiscipline: components.debtDiscipline.score,
      incomeDiversity: components.incomeDiversity.score,
      govtSchemeAccess: components.govtTransferAccess.details?.schemesDetected || [],
    },
    sentinelInputs: {
      cashFlowScore: components.cashFlowStability.score,
      deficitMonths: seasonality.insights.deficitMonthCount,
      avgMonthlyNet: seasonality.insights.avgMonthlyNet,
      emiSafeMonths: seasonality.insights.emiSafeMonths,
      bounceCount: bankSummary.bounce_count || 0,
    },
  };
};

// ──────────────────────────────────────────────
// Component Scorers (each returns { score: 0-100, details })
// ──────────────────────────────────────────────

const scoreCashFlowStability = (seasonality, summary) => {
  const regularity = seasonality.insights.incomeRegularity; // 0-1
  const deficitMonths = seasonality.insights.deficitMonthCount;

  let score = regularity * 60; // Base: how regular is income (0-60)
  score += Math.max(0, (12 - deficitMonths) / 12) * 40; // Bonus: fewer deficit months (0-40)

  return {
    score: Math.min(100, Math.round(score)),
    details: {
      incomeRegularity: regularity,
      deficitMonths,
      avgMonthlyNet: seasonality.insights.avgMonthlyNet,
    },
  };
};

const scoreBalanceAdequacy = (summary, expenseSummary) => {
  const avgBalance = parseFloat(summary.avg_monthly_balance || 0);
  const monthlyExpense = expenseSummary.totalExpense / 12 || 1;
  const balanceRatio = avgBalance / monthlyExpense;

  // Score: 2+ months of expenses in balance = 100, 0 = 0
  const score = Math.min(100, Math.round(balanceRatio * 50));

  return {
    score,
    details: {
      avgBalance: Math.round(avgBalance),
      monthlyExpense: Math.round(monthlyExpense),
      monthsCovered: parseFloat(balanceRatio.toFixed(1)),
      minBalance: parseFloat(summary.min_balance || 0),
    },
  };
};

const scoreIncomeDiversity = (incomeResult) => {
  const cats = incomeResult.categories;
  const activeSources = Object.keys(cats).filter(c => c !== 'other_credit' && c !== 'loan_disbursement' && cats[c].count > 0);
  const totalIncome = incomeResult.summary.totalIncome - (cats.loan_disbursement?.total || 0);

  if (totalIncome === 0) return { score: 0, details: { activeSources: 0, hhi: 1 } };

  // Herfindahl-Hirschman Index (lower = more diverse)
  let hhi = 0;
  for (const source of activeSources) {
    const share = cats[source].total / totalIncome;
    hhi += share * share;
  }

  // Score: HHI of 0.2 or less = 100, HHI of 1.0 (single source) = 20
  const diversityScore = Math.min(100, Math.round((1 - hhi) * 100 + activeSources.length * 5));

  return {
    score: Math.min(100, diversityScore),
    details: {
      activeSources: activeSources.length,
      sourceList: activeSources,
      hhi: parseFloat(hhi.toFixed(3)),
      farmIncomeShare: totalIncome > 0 ? parseFloat((incomeResult.summary.farmIncome / totalIncome).toFixed(2)) : 0,
    },
  };
};

const scoreDebtDiscipline = (summary, expenseResult) => {
  const bounceCount = parseInt(summary.bounce_count || 0);
  const emiCount = parseInt(summary.emi_debit_count || 0);
  const emiExpense = expenseResult.categories?.emi_repayment?.total || 0;

  // Bounce penalty: each bounce reduces score by 15 points
  let score = 100 - (bounceCount * 15);

  // EMI regularity bonus: if farmer has EMIs and they're regular
  if (emiCount > 0 && bounceCount === 0) score = Math.min(100, score + 10);

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    details: {
      bounceCount,
      emiCount,
      monthlyEmi: emiCount > 0 ? Math.round(emiExpense / Math.max(1, (summary.period_months || 12))) : 0,
      bounceRate: emiCount > 0 ? parseFloat((bounceCount / emiCount).toFixed(2)) : 0,
    },
  };
};

const scoreGovtTransferAccess = (incomeResult, summary) => {
  const govtCredits = parseInt(summary.govt_subsidy_credits || 0);
  const govtTotal = incomeResult.categories?.govt_transfer?.total || 0;

  // Detect specific schemes from transaction patterns
  const schemesDetected = [];
  const govtTxns = incomeResult.categories?.govt_transfer?.transactions || [];
  for (const txn of govtTxns) {
    const narr = (txn.narration || '').toUpperCase();
    if (narr.includes('PM-KISAN') || narr.includes('PMKISAN') || narr.includes('PM KISAN')) schemesDetected.push('PM-KISAN');
    if (narr.includes('MGNREGA') || narr.includes('NREGA')) schemesDetected.push('MGNREGA');
    if (narr.includes('PENSION')) schemesDetected.push('Pension');
    if (narr.includes('PMFBY') || narr.includes('CROP INSURANCE')) schemesDetected.push('PMFBY');
    if (narr.includes('KALIA')) schemesDetected.push('KALIA');
    if (narr.includes('RYTHU')) schemesDetected.push('Rythu Bandhu');
  }

  const uniqueSchemes = [...new Set(schemesDetected)];

  // Score: each scheme detected = +25 points, capped at 100
  const score = Math.min(100, uniqueSchemes.length * 25 + (govtCredits > 3 ? 10 : 0));

  return {
    score,
    details: {
      schemesDetected: uniqueSchemes,
      govtTransferCount: govtCredits,
      annualGovtIncome: Math.round(govtTotal),
    },
  };
};

const scoreDigitalAdoption = (summary, transactions) => {
  const upiCount = parseInt(summary.upi_transaction_count || 0);
  const totalTxns = transactions.length || 1;
  const digitalRatio = upiCount / totalTxns;

  // Score: 30%+ UPI = 100, 0% = 20 (even non-digital farmers get baseline for having a bank account)
  const score = Math.min(100, Math.round(20 + digitalRatio * 250));

  return {
    score,
    details: {
      upiTransactions: upiCount,
      totalTransactions: totalTxns,
      digitalRatio: parseFloat(digitalRatio.toFixed(3)),
      avgUpiValue: parseFloat(summary.avg_upi_value || 0),
    },
  };
};

const scoreToGrade = (score) => {
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'E';
};

module.exports = { computeFinancialHealthScore };
