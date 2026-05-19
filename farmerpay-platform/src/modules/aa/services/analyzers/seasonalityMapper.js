/**
 * Seasonality Mapper — Layer 2 Analyzer
 * Builds 12-month cash flow signatures from bank transactions.
 * Identifies income/expense seasonality patterns critical for agricultural lending.
 *
 * Key outputs:
 *   - Monthly cash flow heatmap (income vs expense by month)
 *   - Peak income months (harvest season detection)
 *   - Cash-thin months (stress period identification)
 *   - Optimal EMI months (when farmer can pay)
 *   - Income regularity score per source
 */

const { classifyAllCredits } = require('./incomeClassifier');
const { classifyAllDebits } = require('./expenseDetector');

/**
 * Build a 12-month cash flow signature for a farmer.
 * @param {Array} transactions - All bank transactions (credits + debits)
 * @param {Object} options - { periodMonths }
 * @returns {Object} Monthly cash flow map + seasonality insights
 */
const buildSeasonalityMap = (transactions, options = {}) => {
  const months = {};

  // Initialize 12 months
  for (let m = 1; m <= 12; m++) {
    months[m] = {
      month: m,
      monthName: MONTH_NAMES[m],
      totalCredits: 0,
      totalDebits: 0,
      netCashFlow: 0,
      creditCount: 0,
      debitCount: 0,
      incomeByCategory: {},
      expenseByCategory: {},
    };
  }

  // Populate from transactions
  for (const txn of transactions) {
    const date = new Date(txn.txnDate || txn.transactionTimestamp || txn.valueDate);
    if (isNaN(date.getTime())) continue;

    const m = date.getMonth() + 1; // 1-indexed
    const amt = parseFloat(txn.amount || txn.transactionAmount || 0);
    const type = (txn.type || txn.txnType || '').toUpperCase();

    if (type === 'CREDIT') {
      months[m].totalCredits += amt;
      months[m].creditCount++;
    } else if (type === 'DEBIT') {
      months[m].totalDebits += amt;
      months[m].debitCount++;
    }
    months[m].netCashFlow = months[m].totalCredits - months[m].totalDebits;
  }

  // Classify and overlay income/expense categories per month
  const incomeResult = classifyAllCredits(transactions);
  const expenseResult = classifyAllDebits(transactions);

  for (const item of incomeResult.classified) {
    const date = new Date(item.txnDate);
    if (isNaN(date.getTime())) continue;
    const m = date.getMonth() + 1;
    if (!months[m].incomeByCategory[item.category]) months[m].incomeByCategory[item.category] = 0;
    months[m].incomeByCategory[item.category] += item.amount;
  }

  for (const cat of Object.keys(expenseResult.categories)) {
    for (const item of expenseResult.categories[cat].transactions) {
      const date = new Date(item.txnDate);
      if (isNaN(date.getTime())) continue;
      const m = date.getMonth() + 1;
      if (!months[m].expenseByCategory[cat]) months[m].expenseByCategory[cat] = 0;
      months[m].expenseByCategory[cat] += item.amount;
    }
  }

  // Compute insights
  const monthArray = Object.values(months);
  const avgMonthlyNet = monthArray.reduce((s, m) => s + m.netCashFlow, 0) / 12;

  return {
    monthlyMap: months,
    insights: computeInsights(monthArray, avgMonthlyNet),
    incomeSummary: incomeResult.summary,
    expenseSummary: expenseResult.summary,
  };
};

/**
 * Compute seasonality insights from monthly data.
 */
const computeInsights = (monthArray, avgMonthlyNet) => {
  // Sort months by net cash flow
  const sorted = [...monthArray].sort((a, b) => b.netCashFlow - a.netCashFlow);

  // Peak income months (top 3)
  const peakIncomeMonths = sorted.slice(0, 3).map(m => ({
    month: m.month,
    monthName: m.monthName,
    netCashFlow: Math.round(m.netCashFlow),
    credits: Math.round(m.totalCredits),
  }));

  // Cash-thin months (bottom 3 or negative net flow)
  const thinMonths = sorted.slice(-3).reverse().map(m => ({
    month: m.month,
    monthName: m.monthName,
    netCashFlow: Math.round(m.netCashFlow),
    deficit: m.netCashFlow < 0 ? Math.round(Math.abs(m.netCashFlow)) : 0,
  }));

  // Negative cash flow months
  const deficitMonths = monthArray.filter(m => m.netCashFlow < 0);

  // Optimal EMI months — months with positive cash flow above average
  const emiSafeMonths = monthArray
    .filter(m => m.netCashFlow > avgMonthlyNet * 0.5)
    .sort((a, b) => b.netCashFlow - a.netCashFlow)
    .map(m => m.month);

  // Income regularity — coefficient of variation of monthly credits
  const creditValues = monthArray.map(m => m.totalCredits);
  const creditMean = creditValues.reduce((s, v) => s + v, 0) / 12;
  const creditStdDev = Math.sqrt(creditValues.reduce((s, v) => s + (v - creditMean) ** 2, 0) / 12);
  const incomeRegularity = creditMean > 0 ? 1 - Math.min(1, creditStdDev / creditMean) : 0;

  // Detect crop seasonality pattern
  const seasonPattern = detectCropSeason(monthArray);

  return {
    peakIncomeMonths,
    cashThinMonths: thinMonths,
    deficitMonthCount: deficitMonths.length,
    totalDeficit: Math.round(deficitMonths.reduce((s, m) => s + Math.abs(m.netCashFlow), 0)),
    emiSafeMonths,
    incomeRegularity: parseFloat(incomeRegularity.toFixed(3)),
    avgMonthlyNet: Math.round(avgMonthlyNet),
    seasonPattern,

    // DRISHTI-ready: recommended EMI schedule
    recommendedEmiSchedule: generateEmiRecommendation(monthArray, emiSafeMonths),
  };
};

/**
 * Detect crop season from income pattern.
 * Kharif (June-Oct harvest: Nov-Jan income), Rabi (Oct-Mar harvest: Apr-May income),
 * Zaid (Mar-Jun), Perennial (even distribution).
 */
const detectCropSeason = (monthArray) => {
  const kharifMonths = [10, 11, 12, 1]; // Oct-Jan (post-monsoon harvest income)
  const rabiMonths = [3, 4, 5];          // Mar-May (post-winter harvest income)
  const inputMonths = [5, 6, 7];          // May-Jul (pre-sowing input spending)

  const kharifIncome = kharifMonths.reduce((s, m) => s + (monthArray[m - 1]?.totalCredits || 0), 0);
  const rabiIncome = rabiMonths.reduce((s, m) => s + (monthArray[m - 1]?.totalCredits || 0), 0);
  const totalIncome = monthArray.reduce((s, m) => s + m.totalCredits, 0);

  if (totalIncome === 0) return { type: 'insufficient_data', confidence: 0 };

  const kharifRatio = kharifIncome / totalIncome;
  const rabiRatio = rabiIncome / totalIncome;

  if (kharifRatio > 0.4) return { type: 'kharif_dominant', confidence: kharifRatio, peakMonths: kharifMonths };
  if (rabiRatio > 0.4) return { type: 'rabi_dominant', confidence: rabiRatio, peakMonths: rabiMonths };
  if (kharifRatio > 0.25 && rabiRatio > 0.25) return { type: 'dual_season', confidence: kharifRatio + rabiRatio, peakMonths: [...kharifMonths, ...rabiMonths] };

  // Even distribution suggests dairy/perennial crops/non-farm income dominance
  const cv = computeCV(monthArray.map(m => m.totalCredits));
  if (cv < 0.3) return { type: 'perennial_or_non_farm', confidence: 1 - cv, peakMonths: [] };

  return { type: 'mixed', confidence: 0.5, peakMonths: [] };
};

/**
 * Generate DICE-compatible EMI schedule recommendation.
 * Suggests which months to collect EMI and which to skip (moratorium).
 */
const generateEmiRecommendation = (monthArray, emiSafeMonths) => {
  if (emiSafeMonths.length >= 10) {
    return { type: 'monthly', frequency: 12, skipMonths: [], note: 'Farmer has steady income — standard monthly EMI works' };
  }

  if (emiSafeMonths.length >= 6) {
    const skipMonths = [];
    for (let m = 1; m <= 12; m++) {
      if (!emiSafeMonths.includes(m)) skipMonths.push(m);
    }
    return { type: 'seasonal_skip', frequency: emiSafeMonths.length, skipMonths, note: `Skip EMI in ${skipMonths.map(m => MONTH_NAMES[m]).join(', ')} — cash-thin months` };
  }

  // Farmer has highly seasonal income — recommend bullet or quarterly
  const peakQuarter = findPeakQuarter(monthArray);
  return { type: 'bullet_or_quarterly', frequency: peakQuarter.length, skipMonths: [], collectMonths: peakQuarter, note: 'Highly seasonal — collect in harvest quarter only' };
};

const findPeakQuarter = (monthArray) => {
  let bestSum = 0, bestStart = 0;
  for (let start = 0; start < 12; start++) {
    const sum = [0, 1, 2].reduce((s, offset) => s + monthArray[(start + offset) % 12].totalCredits, 0);
    if (sum > bestSum) { bestSum = sum; bestStart = start; }
  }
  return [0, 1, 2].map(offset => ((bestStart + offset) % 12) + 1);
};

const computeCV = (values) => {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (mean === 0) return 1;
  const stdDev = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
  return stdDev / mean;
};

const MONTH_NAMES = {
  1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun',
  7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec',
};

module.exports = { buildSeasonalityMap };
