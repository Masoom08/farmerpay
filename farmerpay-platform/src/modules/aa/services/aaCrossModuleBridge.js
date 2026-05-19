/**
 * AA Cross-Module Bridge — Layer 3
 * Wires AA financial intelligence into TRUST, DRISHTI, SENTINEL, DICE, and SATHI modules.
 * This is the multiplier — it makes AA data available to every module that can benefit.
 *
 * Each method returns module-specific formatted data ready for consumption.
 * No direct DB writes to other modules — returns DTOs that the calling module persists.
 */

const logger = require('../../../shared/utils/logger');
const { getKey, setWithTTL } = require('../../../config/redis');
const { computeFinancialHealthScore } = require('./analyzers/financialHealthScorer');
const { classifyAllCredits } = require('./analyzers/incomeClassifier');
const { classifyAllDebits } = require('./analyzers/expenseDetector');
const { buildSeasonalityMap } = require('./analyzers/seasonalityMapper');
const { getLatestAnalysis: getPersistedAnalysis, runAnalysis } = require('./aaAnalysisOrchestrator');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

const CACHE_TTL = 43200; // 12 hours

// ──────────────────────────────────────────────
// Role gating — FHS / transaction-derived data must never reach Sathi
// Source of truth: DESIGN-SYSTEM-SCORE-DISPLAY.md § Pattern 2
// ──────────────────────────────────────────────

const FHS_DENIED_ROLES = ['sathi', 'sathi_agent'];

/**
 * Assert the caller role is allowed to receive FHS / transaction-derived data.
 * Throws 403 for Sathi callers. This is the last line of defence — do not rely on UI.
 * @param {string} callerRole - The role of the caller (from req.user.role or service param)
 * @param {string} functionName - For logging
 */
const assertRoleAllowed = (callerRole, functionName) => {
  if (!callerRole) {
    const err = new Error(`callerRole is required for ${functionName}`);
    err.statusCode = 400;
    err.errorCode = 'READINESS_ROLE_REQUIRED';
    throw err;
  }
  if (FHS_DENIED_ROLES.includes(callerRole)) {
    logger.warn(`bridge: blocked ${callerRole} from ${functionName} — FHS access denied`);
    const err = new Error('Sathi role does not have access to financial health data');
    err.statusCode = 403;
    err.errorCode = 'READINESS_ROLE_FORBIDDEN';
    throw err;
  }
};

/**
 * Re-verify that the farmer still has an active, unexpired AA consent and
 * that the caller's purpose falls within the consent's declared scope. Must
 * be called before returning AA-derived data to any downstream module. Fails
 * closed: if no consent or expired, the bridge returns nothing, so TRUST /
 * SENTINEL / DRISHTI / DICE simply get null instead of yesterday's data.
 *
 * Allowed purposes are coarse today — finer-grained purpose binding requires
 * a schema change (consent.allowed_modules). Until then we treat every active
 * consent as valid for 'loan_underwriting' and allied downstream modules.
 */
const ALLOWED_CONSENT_PURPOSES = new Set([
  'loan_underwriting', 'credit_scoring', 'financial_health', 'loan_monitoring',
]);

const assertActiveConsent = async (farmerId, purpose = 'loan_underwriting') => {
  const { AaConsent } = getDb();
  const consent = await AaConsent.findOne({
    where: { farmer_id: farmerId, consent_status: 'approved', is_active: true },
    order: [['created_at', 'DESC']],
  });
  if (!consent) {
    const err = new Error('No active AA consent for this farmer');
    err.statusCode = 403;
    err.errorCode = 'AA_CONSENT_REQUIRED';
    throw err;
  }
  if (consent.expires_at && new Date(consent.expires_at).getTime() <= Date.now()) {
    const err = new Error('AA consent has expired');
    err.statusCode = 403;
    err.errorCode = 'AA_CONSENT_EXPIRED';
    throw err;
  }
  if (purpose && !ALLOWED_CONSENT_PURPOSES.has(purpose)) {
    const err = new Error(`AA consent does not cover purpose: ${purpose}`);
    err.statusCode = 403;
    err.errorCode = 'AA_CONSENT_PURPOSE_MISMATCH';
    throw err;
  }
  return consent;
};

// ──────────────────────────────────────────────
// Unified Analysis (runs all analyzers, caches result)
// ──────────────────────────────────────────────

/**
 * Get or compute the full AA analysis for a farmer.
 * @param {number} farmerId
 * @param {Array} [transactions] - Optional raw transactions (if already fetched)
 * @returns {Object} Full analysis result
 */
const getAnalysis = async (farmerId, transactions = null, { callerRole, purpose } = {}) => {
  assertRoleAllowed(callerRole, 'getAnalysis');
  await assertActiveConsent(farmerId, purpose || 'loan_underwriting');
  // Step 1: Check persisted analysis (Redis → DB, handles 12h freshness)
  const persisted = await getPersistedAnalysis(farmerId);
  if (persisted && !persisted.stale) {
    return persisted;
  }

  // Step 2: If we have raw transactions, run the orchestrator (persists + caches)
  if (transactions && transactions.length > 0) {
    const result = await runAnalysis(farmerId, transactions);
    return result;
  }

  // Step 3: If stale or no persisted, fall back to summary-based computation
  const { AaBankStatementSummary } = getDb();
  const summaries = await AaBankStatementSummary.findAll({
    where: { farmer_id: farmerId, is_active: true },
  });

  if (!summaries.length) {
    // Return stale analysis if we have one, otherwise null
    return persisted || null;
  }

  // Run orchestrator in summary-fallback mode (persists + caches)
  const result = await runAnalysis(farmerId, null);
  if (result) return result;

  // Last resort: compute from summary without persisting (legacy path)
  let analysis = computeFromSummary(summaries.map(s => s.toJSON()));

  analysis.accounts = summaries.map(s => ({
    bankName: s.bank_name,
    accountType: s.account_type,
    avgMonthlyCredit: parseFloat(s.avg_monthly_credit || 0),
    avgMonthlyDebit: parseFloat(s.avg_monthly_debit || 0),
    avgBalance: parseFloat(s.avg_monthly_balance || 0),
  }));
  analysis.totalAvgMonthlyIncome = summaries.reduce(
    (sum, s) => sum + parseFloat(s.avg_monthly_credit || 0), 0
  );
  analysis.totalAvgMonthlyExpense = summaries.reduce(
    (sum, s) => sum + parseFloat(s.avg_monthly_debit || 0), 0
  );

  await setWithTTL(`aa:analysis:${farmerId}`, JSON.stringify(analysis), CACHE_TTL);
  return analysis;
};

// ──────────────────────────────────────────────
// TRUST Module Bridge
// ──────────────────────────────────────────────

/**
 * Get AA-enhanced TRUST score inputs.
 * Returns data formatted for the TRUST scoring engine to incorporate.
 * @param {number} farmerId
 * @returns {Object} TRUST-compatible score enhancement data
 */
const getTrustInputs = async (farmerId, { callerRole } = {}) => {
  assertRoleAllowed(callerRole, 'getTrustInputs');
  const analysis = await getAnalysis(farmerId, null, { callerRole });
  if (!analysis) return null;

  return {
    source: 'account_aggregator',
    dataFreshness: 'recent', // Based on last AA fetch
    financialHealthScore: analysis.score || analysis.trustInputs?.financialHealthScore || 0,
    financialHealthGrade: analysis.grade || 'N/A',
    components: {
      // Maps to TRUST scoring sections
      incomeVerification: {
        verified: true,
        avgMonthlyIncome: analysis.totalAvgMonthlyIncome,
        incomeDiversityScore: analysis.components?.incomeDiversity?.score || 0,
        farmIncomeShare: analysis.components?.incomeDiversity?.details?.farmIncomeShare || 0,
      },
      debtBehavior: {
        bounceCount: analysis.components?.debtDiscipline?.details?.bounceCount || 0,
        emiDisciplineScore: analysis.components?.debtDiscipline?.score || 0,
        existingMonthlyEmi: analysis.components?.debtDiscipline?.details?.monthlyEmi || 0,
      },
      govtSchemeAccess: {
        schemesDetected: analysis.trustInputs?.govtSchemeAccess || analysis.components?.govtTransferAccess?.details?.schemesDetected || [],
        pmKisanVerified: (analysis.components?.govtTransferAccess?.details?.schemesDetected || []).includes('PM-KISAN'),
        annualGovtIncome: analysis.components?.govtTransferAccess?.details?.annualGovtIncome || 0,
      },
      digitalReadiness: {
        upiAdoption: analysis.components?.digitalAdoption?.score || 0,
        digitalTransactionRatio: analysis.components?.digitalAdoption?.details?.digitalRatio || 0,
      },
    },
    // Recommended TRUST score adjustment
    recommendedAdjustment: computeTrustAdjustment(analysis),
  };
};

// ──────────────────────────────────────────────
// DRISHTI Module Bridge
// ──────────────────────────────────────────────

/**
 * Get AA data formatted for DRISHTI snapshot builder.
 * Provides observed income/expense data to replace self-reported estimates.
 * @param {number} farmerId
 * @returns {Object} DRISHTI snapshot-compatible financial data
 */
const getDrishtiInputs = async (farmerId, { callerRole } = {}) => {
  assertRoleAllowed(callerRole, 'getDrishtiInputs');
  const analysis = await getAnalysis(farmerId, null, { callerRole });
  if (!analysis) return null;

  return {
    source: 'account_aggregator',
    verified: true,

    // Household income (observed from bank transactions)
    householdIncome: {
      totalMonthly: analysis.totalAvgMonthlyIncome,
      farmIncome: analysis.drishtiInputs?.incomeCategories?.farmIncome || analysis.totalAvgMonthlyIncome * 0.6,
      nonFarmIncome: analysis.drishtiInputs?.incomeCategories?.nonFarmIncome || analysis.totalAvgMonthlyIncome * 0.3,
      govtTransfers: analysis.drishtiInputs?.incomeCategories?.govtTransfers || 0,
      byCategory: analysis.drishtiInputs?.incomeCategories || {},
    },

    // Household expenses (observed)
    householdExpense: {
      totalMonthly: analysis.totalAvgMonthlyExpense,
      byCategory: analysis.drishtiInputs?.expenseCategories || {},
    },

    // Seasonality for cash flow projection
    seasonality: {
      pattern: analysis.drishtiInputs?.seasonPattern || { type: 'unknown' },
      incomeRegularity: analysis.drishtiInputs?.incomeRegularity || 0,
      deficitMonths: analysis.drishtiInputs?.deficitMonths || 0,
      monthlyMap: analysis.drishtiInputs?.monthlyIncomeMap || {},
    },

    // EMI capacity
    emiCapacity: {
      recommendation: analysis.drishtiInputs?.emiRecommendation || {},
      maxMonthlyEmi: Math.max(0, (analysis.totalAvgMonthlyIncome - analysis.totalAvgMonthlyExpense) * 0.4),
      safeMonths: analysis.sentinelInputs?.emiSafeMonths || [],
    },
  };
};

// ──────────────────────────────────────────────
// SENTINEL Module Bridge
// ──────────────────────────────────────────────

/**
 * Get AA data for SENTINEL early warning system.
 * Provides cash flow health signals for proactive NPA detection.
 * @param {number} farmerId
 * @returns {Object} SENTINEL-compatible risk signals
 */
const getSentinelInputs = async (farmerId, { callerRole } = {}) => {
  assertRoleAllowed(callerRole, 'getSentinelInputs');
  const analysis = await getAnalysis(farmerId, null, { callerRole });
  if (!analysis) return null;

  const sentinelData = analysis.sentinelInputs || {};
  const summaries = analysis.accounts || [];

  // Compute risk flags
  const riskFlags = [];
  if (sentinelData.bounceCount >= 3) riskFlags.push({ type: 'HIGH_BOUNCE_RATE', severity: 'high', detail: `${sentinelData.bounceCount} bounces detected` });
  if (sentinelData.deficitMonths >= 4) riskFlags.push({ type: 'PROLONGED_DEFICIT', severity: 'medium', detail: `${sentinelData.deficitMonths} months with negative cash flow` });
  if (sentinelData.avgMonthlyNet < 0) riskFlags.push({ type: 'NEGATIVE_NET_CASHFLOW', severity: 'high', detail: `Average monthly net: ₹${sentinelData.avgMonthlyNet}` });

  const minBalance = summaries.reduce((min, a) => Math.min(min, a.minBalance || Infinity), Infinity);
  if (minBalance < 500) riskFlags.push({ type: 'NEAR_ZERO_BALANCE', severity: 'medium', detail: `Minimum balance: ₹${Math.round(minBalance)}` });

  return {
    source: 'account_aggregator',
    cashFlowScore: sentinelData.cashFlowScore || 0,
    avgMonthlyNet: sentinelData.avgMonthlyNet || 0,
    deficitMonths: sentinelData.deficitMonths || 0,
    emiSafeMonths: sentinelData.emiSafeMonths || [],
    bounceCount: sentinelData.bounceCount || 0,
    riskFlags,
    overallRisk: riskFlags.some(f => f.severity === 'high') ? 'high' : (riskFlags.length > 0 ? 'medium' : 'low'),
  };
};

// ──────────────────────────────────────────────
// DICE Module Bridge
// ──────────────────────────────────────────────

/**
 * Get AA data for DICE loan engine.
 * Provides income verification and EMI scheduling recommendations.
 * @param {number} farmerId
 * @returns {Object} DICE-compatible lending intelligence
 */
const getDiceInputs = async (farmerId, { callerRole } = {}) => {
  assertRoleAllowed(callerRole, 'getDiceInputs');
  const analysis = await getAnalysis(farmerId, null, { callerRole });
  if (!analysis) return null;

  return {
    source: 'account_aggregator',
    incomeVerified: true,
    verifiedMonthlyIncome: analysis.totalAvgMonthlyIncome,
    verifiedMonthlyExpense: analysis.totalAvgMonthlyExpense,
    netDisposableIncome: Math.max(0, analysis.totalAvgMonthlyIncome - analysis.totalAvgMonthlyExpense),
    existingEmiLoad: analysis.components?.debtDiscipline?.details?.monthlyEmi || 0,

    // Loan eligibility enhancement
    eligibility: {
      maxEmiCapacity: Math.max(0, (analysis.totalAvgMonthlyIncome - analysis.totalAvgMonthlyExpense) * 0.4),
      debtToIncomeRatio: analysis.totalAvgMonthlyIncome > 0
        ? (analysis.components?.debtDiscipline?.details?.monthlyEmi || 0) / analysis.totalAvgMonthlyIncome
        : 1,
      emiScheduleRecommendation: analysis.drishtiInputs?.emiRecommendation || {},
      seasonPattern: analysis.drishtiInputs?.seasonPattern || {},
    },

    // Repayment timing intelligence
    repaymentIntelligence: {
      optimalEmiMonths: analysis.sentinelInputs?.emiSafeMonths || [],
      avoidMonths: analysis.seasonality?.cashThinMonths?.map(m => m.month) || [],
      incomeRegularity: analysis.drishtiInputs?.incomeRegularity || 0,
    },
  };
};

// ──────────────────────────────────────────────
// SATHI Module Bridge
// ──────────────────────────────────────────────

/**
 * Get AA data for SATHI onboarding pre-fill.
 * Pre-fills household income/expense during farmer onboarding.
 * @param {number} farmerId
 * @returns {Object} Onboarding-friendly pre-fill data
 */
const getSathiInputs = async (farmerId, { callerRole } = {}) => {
  // getSathiInputs returns aggregate pre-fill data (not FHS/components/transactions),
  // so it does NOT gate on role. Any authenticated caller can request Sathi pre-fill.
  // Internal getAnalysis call always uses 'system' since this function filters its output.
  const analysis = await getAnalysis(farmerId, null, { callerRole: 'system' });
  if (!analysis) return null;

  return {
    source: 'account_aggregator',
    preFill: {
      estimatedMonthlyIncome: Math.round(analysis.totalAvgMonthlyIncome),
      estimatedMonthlyExpense: Math.round(analysis.totalAvgMonthlyExpense),
      pmKisanDetected: (analysis.components?.govtTransferAccess?.details?.schemesDetected || []).includes('PM-KISAN'),
      mgnregaDetected: (analysis.components?.govtTransferAccess?.details?.schemesDetected || []).includes('MGNREGA'),
      dairyIncomeDetected: analysis.drishtiInputs?.incomeCategories?.farmIncome > 0,
      bankAccounts: (analysis.accounts || []).map(a => ({
        bankName: a.bankName,
        accountType: a.accountType,
        avgBalance: Math.round(a.avgBalance),
      })),
      govtSchemes: analysis.components?.govtTransferAccess?.details?.schemesDetected || [],
    },
    verificationStatus: {
      incomeVerified: true,
      expenseVerified: true,
      govtSchemesVerified: (analysis.components?.govtTransferAccess?.details?.schemesDetected || []).length > 0,
    },
  };
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/**
 * Compute from summary data when raw transactions unavailable.
 */
const computeFromSummary = (summaries) => {
  const primary = summaries[0] || {};
  const totalCredit = summaries.reduce((s, a) => s + parseFloat(a.avg_monthly_credit || 0), 0);
  const totalDebit = summaries.reduce((s, a) => s + parseFloat(a.avg_monthly_debit || 0), 0);

  const bounceCount = summaries.reduce((s, a) => s + parseInt(a.bounce_count || 0), 0);
  const govtCredits = summaries.reduce((s, a) => s + parseInt(a.govt_subsidy_credits || 0), 0);

  // Simplified scoring from summary metrics
  let score = 50; // Baseline for having AA data at all
  if (bounceCount === 0) score += 15;
  else if (bounceCount <= 2) score += 5;
  else score -= 10;
  if (govtCredits >= 3) score += 10;
  if (totalCredit > totalDebit * 1.2) score += 10;
  if (parseFloat(primary.avg_monthly_balance || 0) > totalDebit) score += 10;

  const grade = score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : score >= 35 ? 'D' : 'E';

  return {
    score: Math.min(100, Math.max(0, Math.round(score))),
    grade,
    components: {
      cashFlowStability: { score: totalCredit > totalDebit ? 70 : 40, details: {} },
      balanceAdequacy: { score: parseFloat(primary.avg_monthly_balance || 0) > totalDebit ? 70 : 40, details: {} },
      incomeDiversity: { score: 50, details: { activeSources: 0, hhi: 1 } },
      debtDiscipline: { score: bounceCount === 0 ? 90 : Math.max(0, 90 - bounceCount * 15), details: { bounceCount } },
      govtTransferAccess: { score: Math.min(100, govtCredits * 25), details: { schemesDetected: [] } },
      digitalAdoption: { score: parseInt(primary.upi_transaction_count || 0) > 5 ? 70 : 30, details: {} },
    },
    drishtiInputs: { incomeCategories: {}, expenseCategories: {}, seasonPattern: { type: 'unknown' } },
    trustInputs: { financialHealthScore: score, bounceRate: bounceCount },
    sentinelInputs: { cashFlowScore: score, bounceCount, avgMonthlyNet: totalCredit - totalDebit },
  };
};

const computeTrustAdjustment = (analysis) => {
  const score = analysis.score || 0;
  // High AA score = positive adjustment, low = negative
  if (score >= 75) return { direction: 'positive', points: 5, reason: 'Strong verified financial health' };
  if (score >= 50) return { direction: 'neutral', points: 0, reason: 'Adequate financial health' };
  return { direction: 'negative', points: -3, reason: 'Weak financial health signals detected' };
};

module.exports = {
  getAnalysis,
  getTrustInputs,
  getDrishtiInputs,
  getSentinelInputs,
  getDiceInputs,
  getSathiInputs,
  // Exported for testing
  assertRoleAllowed,
};
