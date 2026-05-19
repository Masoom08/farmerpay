/**
 * Leverage Service — the L5 calculator.
 *
 * Combines the three legs we've collected over L1-L4 into ONE number that
 * answers the farmer's most important question:
 *
 *     "How much more can I responsibly borrow right now?"
 *
 * Inputs:
 *   1. Monthly income       — sum of TrustFarmerActivityMix.estimatedAnnualIncomeInr / 12
 *   2. Monthly expenses     — avgLast3MonthsInr from TrustHouseholdExpense
 *   3. Monthly debt service — sum of active TrustLoanLiability EMI (normalized to monthly)
 *   4. Repayment discipline — on-time / late / missed counts from TrustLoanRepayment
 *   5. TRUST score band     — adjusts the safe FOIR ceiling
 *
 * Outputs:
 *   - monthlyIncomeInr / monthlyExpensesInr / monthlyDebtServiceInr
 *   - disposableIncomeInr
 *   - foirCeilingPct (Fixed Obligation to Income Ratio cap, e.g. 40%)
 *   - existingObligationRatioPct
 *   - additionalEmiCapacityInr (per-month headroom)
 *   - offers: [{ purpose, label, rate, tenure, maxPrincipalInr, capped }]
 *   - dataQuality: which inputs were missing → confidence rating
 *   - readinessLabel: "READY" / "PARTIAL" / "INSUFFICIENT_DATA"
 *
 * The number is INTENTIONALLY conservative. We'd rather under-promise and
 * have the farmer succeed than over-promise and push them into default.
 */

const { REFERENCE_RATES, principalFromEmi } = require('./referenceRates');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

// Industry-standard FOIR (Fixed Obligation to Income Ratio) ceilings, by TRUST band.
// "good" maps to the standard 40% bank threshold; we adjust up/down based on risk.
const FOIR_BY_BAND = {
  excellent: 0.50, // 50% — top-tier customer
  good: 0.40,      // 40% — bank-standard
  fair: 0.30,      // 30% — be cautious
  poor: 0.20,      // 20% — very cautious
};

// Repayment-discipline multiplier on the headroom — rewards on-time payers,
// penalises chronic latecomers.
function disciplineMultiplier(discipline) {
  const { onTimeRate } = discipline || {};
  if (onTimeRate == null) return 1.0;       // no history → neutral
  if (onTimeRate >= 95) return 1.10;
  if (onTimeRate >= 80) return 1.00;
  if (onTimeRate >= 60) return 0.85;
  if (onTimeRate >= 40) return 0.70;
  return 0.50;                              // chronic delinquent
}

// Normalize an EMI line to its MONTHLY equivalent based on its frequency.
function emiToMonthly(emiInr, frequency) {
  if (!emiInr) return 0;
  const e = parseFloat(emiInr);
  switch (frequency) {
    case 'MONTHLY': return e;
    case 'QUARTERLY': return e / 3;
    case 'HALF_YEARLY': return e / 6;
    case 'YEARLY': return e / 12;
    case 'BULLET': return 0; // bullet doesn't burden monthly cash-flow
    default: return e;
  }
}

/**
 * Pulls every required signal in parallel and computes the leverage payload.
 * @param {number} farmerId — internal users.id
 * @returns {Promise<Object>}
 */
const computeLeverage = async (farmerId) => {
  const {
    TrustFarmerActivityMix,
    TrustLoanLiability,
    TrustLoanRepayment,
    TrustHouseholdExpense,
  } = getDb();

  const [mixRows, liabilityRows, repaymentRows, expenseRows] = await Promise.all([
    TrustFarmerActivityMix.findAll({
      where: { farmer_id: farmerId, is_active: true },
      order: [['reference_year', 'DESC']],
    }),
    TrustLoanLiability.findAll({
      where: { farmer_id: farmerId, is_active: true, status: 'ACTIVE' },
    }),
    TrustLoanRepayment.findAll({
      where: { farmer_id: farmerId, is_active: true },
    }),
    TrustHouseholdExpense.findAll({
      where: { farmer_id: farmerId, is_active: true },
      order: [['reference_year', 'DESC'], ['reference_month', 'DESC']],
      limit: 3,
    }),
  ]);

  // ── Leg 1: monthly income (from latest year's mix) ─────────────
  const latestYear = mixRows.reduce((m, r) => Math.max(m, r.reference_year), 0);
  const latestMix = mixRows.filter((r) => r.reference_year === latestYear);
  const annualIncome = latestMix.reduce(
    (s, r) => s + (parseFloat(r.estimated_annual_income_inr) || 0),
    0,
  );
  const monthlyIncome = Math.round(annualIncome / 12);

  // Flag stale income: the leverage engine extrapolates from the latest
  // declared mix, so a 2+ year gap makes the borrowing-capacity estimate
  // unreliable. Callers can surface this flag in the UI or widen the
  // haircut they apply.
  const currentYear = new Date().getFullYear();
  const incomeStale = latestYear > 0 && (currentYear - latestYear) >= 2;

  // ── Leg 2: monthly expenses (3-month rolling avg, fallback to latest) ──
  const monthlyExpenses = expenseRows.length === 0
    ? 0
    : Math.round(
      expenseRows.reduce((s, r) => s + parseFloat(r.total_inr || 0), 0) / expenseRows.length,
    );

  // ── Leg 3: monthly debt service ──────────────────────────────
  const monthlyDebtService = Math.round(
    liabilityRows.reduce((s, l) => s + emiToMonthly(l.emi_inr, l.emi_frequency), 0),
  );

  // ── Repayment discipline ─────────────────────────────────────
  let onTime = 0, late = 0, missed = 0;
  for (const r of repaymentRows) {
    if (r.status === 'PAID_ONTIME') onTime++;
    else if (r.status === 'PAID_LATE') late++;
    else if (r.status === 'MISSED') missed++;
  }
  const decided = onTime + late + missed;
  const onTimeRate = decided > 0 ? Math.round((onTime / decided) * 100) : null;
  const discipline = { onTime, late, missed, onTimeRate };

  // ── TRUST band → FOIR ceiling ────────────────────────────────
  // We avoid a circular dep on getScore by re-reading the latest score history row directly.
  const { TrustScoreHistory } = getDb();
  let band = 'good';
  try {
    const last = await TrustScoreHistory.findOne({
      where: { farmer_id: farmerId },
      order: [['created_at', 'DESC']],
    });
    if (last && last.score_band) band = String(last.score_band).toLowerCase();
  } catch (e) {
    // non-fatal — fall back to "good"
  }
  const foirCeilingPct = (FOIR_BY_BAND[band] || 0.40) * 100;
  const maxAllowedObligationsInr = Math.round((monthlyIncome * foirCeilingPct) / 100);

  // ── Headroom ─────────────────────────────────────────────────
  const rawCapacity = Math.max(0, maxAllowedObligationsInr - monthlyDebtService);
  const adjustedCapacity = Math.round(rawCapacity * disciplineMultiplier(discipline));

  // Disposable: post-expense, post-debt; useful for the UI even when 0
  const disposableIncomeInr = Math.max(0, monthlyIncome - monthlyExpenses - monthlyDebtService);

  // Existing obligation ratio (current debt / income)
  const existingObligationRatioPct = monthlyIncome > 0
    ? Math.round((monthlyDebtService / monthlyIncome) * 1000) / 10  // 1 decimal
    : 0;

  // ── Reference offers ──────────────────────────────────────────
  // For each loan purpose, compute the principal you could borrow at that
  // rate/tenure given your EMI headroom. Cap at the row's maxPrincipalInr.
  const offers = REFERENCE_RATES.map((row) => {
    const calculated = principalFromEmi(adjustedCapacity, row.interestRatePct, row.tenureMonths);
    const capped = calculated > row.maxPrincipalInr;
    return {
      purpose: row.purpose,
      label: row.label,
      interestRatePct: row.interestRatePct,
      tenureMonths: row.tenureMonths,
      monthlyEmiInr: adjustedCapacity,
      maxPrincipalInr: Math.min(calculated, row.maxPrincipalInr),
      ceilingHit: capped,
      notes: row.notes,
      priority: row.priority,
    };
  }).sort((a, b) => a.priority - b.priority);

  // ── Data-quality flags + readiness ───────────────────────────
  const dataQuality = {
    hasIncome: monthlyIncome > 0,
    hasExpenses: expenseRows.length > 0,
    hasDebtSnapshot: liabilityRows.length >= 0, // even zero is a "snapshot"
    hasRepaymentHistory: decided > 0,
    monthsOfExpenseHistory: expenseRows.length,
    incomeStale,
    incomeReferenceYear: latestYear || null,
  };
  const missing = [];
  if (!dataQuality.hasIncome) missing.push('income mix');
  if (!dataQuality.hasExpenses) missing.push('monthly expenses');

  let readinessLabel;
  if (missing.length === 0) readinessLabel = 'READY';
  else if (missing.length === 1) readinessLabel = 'PARTIAL';
  else readinessLabel = 'INSUFFICIENT_DATA';

  return {
    monthlyIncomeInr: monthlyIncome,
    monthlyExpensesInr: monthlyExpenses,
    monthlyDebtServiceInr: monthlyDebtService,
    disposableIncomeInr,
    foirCeilingPct,
    existingObligationRatioPct,
    additionalEmiCapacityInr: adjustedCapacity,
    rawEmiCapacityInr: rawCapacity,
    disciplineMultiplier: disciplineMultiplier(discipline),
    discipline,
    band,
    offers,
    dataQuality,
    missingInputs: missing,
    readinessLabel,
    computedAt: new Date().toISOString(),
  };
};

module.exports = { computeLeverage };
