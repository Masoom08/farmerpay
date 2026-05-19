/**
 * AA Analysis Orchestrator
 * Central analysis engine: persists raw transactions, runs classifiers,
 * computes health scores, and stores analysis results in aa_financial_analyses.
 */

const logger = require('../../../shared/utils/logger');
const { generateUUID } = require('../../../shared/utils/uuidHelper');
const { setWithTTL, getKey, deleteKeys } = require('../../../config/redis');
const { computeFinancialHealthScore } = require('./analyzers/financialHealthScorer');
const { classifyAllCredits } = require('./analyzers/incomeClassifier');
const { classifyAllDebits } = require('./analyzers/expenseDetector');
const { buildSeasonalityMap } = require('./analyzers/seasonalityMapper');
const { logEvent } = require('./aaAuditLogger');
const { parsePagination, buildMeta } = require('../../../shared/utils/paginationHelper');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

const ANALYSIS_CACHE_TTL = 43200; // 12 hours

// ──────────────────────────────────────────────
// Main Analysis Pipeline
// ──────────────────────────────────────────────

/**
 * Run full analysis pipeline for a farmer.
 * If rawTransactions provided: persist them, classify, score from transactions.
 * If not: fall back to summary-based scoring.
 * Persists result to aa_financial_analyses and caches in Redis.
 *
 * @param {number} farmerId
 * @param {Array} [rawTransactions] - Raw bank transactions from AA provider
 * @param {Object} [options] - { consentId, provider }
 * @returns {Object} Analysis result
 */
const runAnalysis = async (farmerId, rawTransactions = null, options = {}) => {
  const {
    AaTransaction, AaFinancialAnalysis, AaBankStatementSummary, AaConsent, sequelize: seq,
  } = getDb();

  const consentId = options.consentId || null;
  const provider = options.provider || null;

  let analysisMode, healthResult, incomeResult, expenseResult, seasonalityResult;
  let transactionCount = 0;
  let periodFrom = null;
  let periodTo = null;

  if (rawTransactions && rawTransactions.length > 0) {
    // ── Full transaction mode ──────────────────

    analysisMode = 'raw_transactions';
    transactionCount = rawTransactions.length;

    // Step 1: Classify
    incomeResult = classifyAllCredits(rawTransactions);
    expenseResult = classifyAllDebits(rawTransactions);

    // Step 2: Persist transactions with classification (bulk)
    if (consentId) {
      await persistTransactions(farmerId, consentId, rawTransactions, incomeResult, expenseResult);
    }

    // Step 3: Seasonality
    seasonalityResult = buildSeasonalityMap(rawTransactions);

    // Step 4: Health score (full transaction mode)
    const primarySummary = await getLatestSummary(farmerId);
    healthResult = computeFinancialHealthScore(rawTransactions, primarySummary || {});

    // Compute period
    const dates = rawTransactions
      .map(t => new Date(t.txnDate || t.transactionTimestamp || t.valueDate))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => a - b);
    if (dates.length) {
      periodFrom = dates[0];
      periodTo = dates[dates.length - 1];
    }
  } else {
    // ── Summary fallback mode ──────────────────

    analysisMode = 'summary_fallback';

    const summaries = await AaBankStatementSummary.findAll({
      where: { farmer_id: farmerId, is_active: true },
    });

    if (!summaries.length) return null;

    healthResult = computeFromSummary(summaries.map(s => s.toJSON()));
    incomeResult = null;
    expenseResult = null;
    seasonalityResult = null;

    // Get period from consent
    if (consentId) {
      const consent = await AaConsent.findByPk(consentId);
      if (consent) {
        periodFrom = consent.data_from;
        periodTo = consent.data_to;
      }
    }
  }

  // ── Build bridge_data for all 5 modules ──────
  // Tag with a schema version. Downstream consumers (TRUST, SENTINEL,
  // DRISHTI, DICE) can check this on read and recompute if the version
  // they were built against has been bumped — without this, a scoring
  // weight change leaves every cached analysis permanently stale.
  const BRIDGE_DATA_VERSION = 1;
  const bridgeData = {
    ...buildBridgeData(healthResult, incomeResult, expenseResult, seasonalityResult),
    _version: BRIDGE_DATA_VERSION,
    _builtAt: new Date().toISOString(),
  };

  // ── Persist analysis to DB ───────────────────
  const transaction = await seq.transaction();
  try {
    // Mark previous analyses as not latest
    await AaFinancialAnalysis.update(
      { is_latest: false },
      { where: { farmer_id: farmerId, is_latest: true }, transaction }
    );

    const analysisRecord = await AaFinancialAnalysis.create({
      analysis_uuid: generateUUID(),
      farmer_id: farmerId,
      consent_id: consentId,
      analysis_type: rawTransactions ? 'full' : 'summary_only',
      health_score: healthResult.score,
      health_grade: healthResult.grade,
      score_components: healthResult.components,
      income_summary: incomeResult ? incomeResult.summary : null,
      expense_summary: expenseResult ? expenseResult.summary : null,
      seasonality_data: seasonalityResult ? seasonalityResult.insights : null,
      risk_flags: extractRiskFlags(healthResult),
      bridge_data: bridgeData,
      analysis_mode: analysisMode,
      transaction_count: transactionCount,
      period_from: periodFrom,
      period_to: periodTo,
      is_latest: true,
      is_active: true,
    }, { transaction });

    await transaction.commit();

    // Cache in Redis
    const cachePayload = {
      analysisUuid: analysisRecord.analysis_uuid,
      score: healthResult.score,
      grade: healthResult.grade,
      components: healthResult.components,
      seasonality: seasonalityResult ? seasonalityResult.insights : healthResult.seasonality || null,
      drishtiInputs: healthResult.drishtiInputs || bridgeData.drishti,
      trustInputs: healthResult.trustInputs || bridgeData.trust,
      sentinelInputs: healthResult.sentinelInputs || bridgeData.sentinel,
      analysisMode,
      transactionCount,
      createdAt: analysisRecord.created_at,
    };
    await setWithTTL(`aa:analysis:${farmerId}`, JSON.stringify(cachePayload), ANALYSIS_CACHE_TTL);
    await deleteKeys(`aa:bridge:${farmerId}`);

    // Audit log
    logEvent({
      consentId, farmerId,
      eventType: 'analysis_run', eventSource: 'system',
      provider,
      metadata: { analysisMode, score: healthResult.score, grade: healthResult.grade, transactionCount },
    });

    logger.info(`[AAOrchestrator] Analysis complete for farmer ${farmerId}: score=${healthResult.score}, grade=${healthResult.grade}, mode=${analysisMode}`);

    return cachePayload;
  } catch (err) {
    await transaction.rollback();
    logger.error('[AAOrchestrator] Analysis persistence failed:', err.message);
    throw err;
  }
};

// ──────────────────────────────────────────────
// Query Methods
// ──────────────────────────────────────────────

/**
 * Get the latest persisted analysis for a farmer.
 * Checks Redis first, then DB.
 * @param {number} farmerId
 * @returns {Object|null}
 */
const getLatestAnalysis = async (farmerId) => {
  // Consent gate: even though the analysis was persisted under a prior
  // approved consent, we refuse to serve it once consent is revoked or
  // expired. This is per RBI AA framework — data that outlives consent is
  // a breach regardless of when it was fetched.
  const { AaConsent, AaFinancialAnalysis } = getDb();
  const activeConsent = await AaConsent.findOne({
    where: { farmer_id: farmerId, consent_status: 'approved', is_active: true },
    order: [['created_at', 'DESC']],
  });
  if (!activeConsent) return null;
  if (activeConsent.expires_at && new Date(activeConsent.expires_at).getTime() <= Date.now()) {
    return null;
  }

  // Check Redis cache
  const cacheKey = `aa:analysis:${farmerId}`;
  const cached = await getKey(cacheKey);
  if (cached) {
    const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
    return parsed;
  }

  // Check DB
  const record = await AaFinancialAnalysis.findOne({
    where: { farmer_id: farmerId, is_latest: true, is_active: true },
    order: [['created_at', 'DESC']],
  });

  if (!record) return null;

  // Check freshness (12 hours)
  const ageMs = Date.now() - new Date(record.created_at).getTime();
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;

  const result = {
    analysisUuid: record.analysis_uuid,
    score: parseFloat(record.health_score),
    grade: record.health_grade,
    components: record.score_components,
    seasonality: record.seasonality_data,
    drishtiInputs: record.bridge_data?.drishti || null,
    trustInputs: record.bridge_data?.trust || null,
    sentinelInputs: record.bridge_data?.sentinel || null,
    analysisMode: record.analysis_mode,
    transactionCount: record.transaction_count,
    createdAt: record.created_at,
    stale: ageMs > TWELVE_HOURS,
  };

  // Re-cache if still fresh
  if (ageMs <= TWELVE_HOURS) {
    await setWithTTL(cacheKey, JSON.stringify(result), ANALYSIS_CACHE_TTL);
  }

  return result;
};

/**
 * Get analysis history for a farmer (paginated).
 * @param {number} farmerId
 * @param {Object} query - { page, limit }
 * @returns {{ items: Array, meta: Object }}
 */
const getAnalysisHistory = async (farmerId, query = {}) => {
  const { AaFinancialAnalysis } = getDb();
  const { page, limit, offset } = parsePagination(query);

  const { count, rows } = await AaFinancialAnalysis.findAndCountAll({
    where: { farmer_id: farmerId, is_active: true },
    // created_at alone is not unique — two analyses created in the same
    // second would pick an arbitrary order and pagination could skip or
    // duplicate rows. `id DESC` is the monotonic tiebreaker.
    order: [['created_at', 'DESC'], ['id', 'DESC']],
    limit,
    offset,
  });

  const items = rows.map(r => ({
    analysisUuid: r.analysis_uuid,
    score: parseFloat(r.health_score),
    grade: r.health_grade,
    analysisType: r.analysis_type,
    analysisMode: r.analysis_mode,
    transactionCount: r.transaction_count,
    periodFrom: r.period_from,
    periodTo: r.period_to,
    isLatest: r.is_latest,
    createdAt: r.created_at,
  }));

  return { items, meta: buildMeta(page, limit, count) };
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/**
 * Persist raw transactions with classification to aa_transactions table.
 */
const persistTransactions = async (farmerId, consentId, rawTransactions, incomeResult, expenseResult) => {
  const { AaTransaction, sequelize: seq } = getDb();

  // Build classification lookup from classified results
  const classificationMap = new Map();

  if (incomeResult && incomeResult.classified) {
    for (const c of incomeResult.classified) {
      const key = `${(c.narration || '').slice(0, 50)}|${c.amount}`;
      classificationMap.set(key, {
        income_category: c.category,
        classification_confidence: c.confidence,
      });
    }
  }
  if (expenseResult && expenseResult.categories) {
    for (const [category, data] of Object.entries(expenseResult.categories)) {
      for (const t of (data.transactions || [])) {
        const key = `${(t.narration || '').slice(0, 50)}|${t.amount}`;
        classificationMap.set(key, {
          expense_category: t.category || category,
          classification_confidence: t.confidence,
        });
      }
    }
  }

  // Get summary ID for linking (optional)
  const { AaBankStatementSummary } = getDb();
  const summary = await AaBankStatementSummary.findOne({
    where: { farmer_id: farmerId, consent_id: consentId, is_active: true },
  });
  const summaryId = summary ? summary.id : null;

  // Bulk insert in batches of 500
  const BATCH_SIZE = 500;
  const records = rawTransactions.map(txn => {
    const narration = (txn.narration || txn.transactionNarration || '').slice(0, 500);
    const amount = parseFloat(txn.amount || txn.transactionAmount || 0);
    const type = (txn.type || txn.txnType || '').toUpperCase();
    const lookupKey = `${narration.slice(0, 50)}|${amount}`;
    const classification = classificationMap.get(lookupKey) || {};

    return {
      transaction_uuid: generateUUID(),
      farmer_id: farmerId,
      consent_id: consentId,
      summary_id: summaryId,
      txn_date: txn.txnDate || txn.transactionTimestamp || txn.valueDate || new Date(),
      txn_type: type === 'CREDIT' ? 'credit' : 'debit',
      amount,
      balance_after: parseFloat(txn.currentBalance || txn.balance || 0) || null,
      narration,
      reference: (txn.reference || txn.txnId || '').slice(0, 100) || null,
      mode: (txn.mode || txn.transactionMode || '').slice(0, 30) || null,
      income_category: classification.income_category || null,
      expense_category: classification.expense_category || null,
      classification_confidence: classification.classification_confidence || null,
      is_active: true,
    };
  });

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    await AaTransaction.bulkCreate(batch);
  }

  logger.info(`[AAOrchestrator] Persisted ${records.length} transactions for farmer ${farmerId}`);
};

/**
 * Get latest bank statement summary for a farmer.
 */
const getLatestSummary = async (farmerId) => {
  const { AaBankStatementSummary } = getDb();
  const summary = await AaBankStatementSummary.findOne({
    where: { farmer_id: farmerId, is_active: true },
    order: [['created_at', 'DESC']],
  });
  return summary ? summary.toJSON() : null;
};

/**
 * Compute simplified scores from summary metrics (no raw transactions).
 * Replicates the logic from aaCrossModuleBridge.computeFromSummary.
 */
const computeFromSummary = (summaries) => {
  const primary = summaries[0] || {};
  const totalCredit = summaries.reduce((s, a) => s + parseFloat(a.avg_monthly_credit || 0), 0);
  const totalDebit = summaries.reduce((s, a) => s + parseFloat(a.avg_monthly_debit || 0), 0);
  const bounceCount = summaries.reduce((s, a) => s + parseInt(a.bounce_count || 0), 0);
  const govtCredits = summaries.reduce((s, a) => s + parseInt(a.govt_subsidy_credits || 0), 0);

  let score = 50;
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

/**
 * Build bridge_data JSON for all 5 downstream modules.
 */
const buildBridgeData = (healthResult, incomeResult, expenseResult, seasonalityResult) => {
  const score = healthResult.score || 0;
  const components = healthResult.components || {};

  return {
    trust: {
      financialHealthScore: score,
      financialHealthGrade: healthResult.grade,
      bounceRate: components.debtDiscipline?.details?.bounceRate || 0,
      emiDiscipline: components.debtDiscipline?.score || 0,
      incomeDiversity: components.incomeDiversity?.score || 0,
      govtSchemeAccess: components.govtTransferAccess?.details?.schemesDetected || [],
    },
    drishti: healthResult.drishtiInputs || {
      incomeCategories: incomeResult?.summary || {},
      expenseCategories: expenseResult?.summary || {},
      seasonPattern: seasonalityResult?.insights?.seasonPattern || { type: 'unknown' },
      incomeRegularity: seasonalityResult?.insights?.incomeRegularity || 0,
      emiRecommendation: seasonalityResult?.insights?.recommendedEmiSchedule || null,
    },
    sentinel: healthResult.sentinelInputs || {
      cashFlowScore: score,
      bounceCount: components.debtDiscipline?.details?.bounceCount || 0,
      avgMonthlyNet: 0,
      deficitMonths: seasonalityResult?.insights?.deficitMonthCount || 0,
      emiSafeMonths: seasonalityResult?.insights?.emiSafeMonths || [],
    },
    dice: {
      incomeVerified: !!incomeResult,
      maxEmiCapacity: seasonalityResult?.insights?.avgMonthlyNet
        ? Math.round(seasonalityResult.insights.avgMonthlyNet * 0.4)
        : 0,
      emiScheduleRecommendation: seasonalityResult?.insights?.recommendedEmiSchedule || null,
      seasonPattern: seasonalityResult?.insights?.seasonPattern || { type: 'unknown' },
      incomeRegularity: seasonalityResult?.insights?.incomeRegularity || 0,
    },
    sathi: {
      estimatedMonthlyIncome: incomeResult?.summary?.totalIncome
        ? Math.round(incomeResult.summary.totalIncome / 12)
        : 0,
      estimatedMonthlyExpense: expenseResult?.summary?.totalExpense
        ? Math.round(expenseResult.summary.totalExpense / 12)
        : 0,
      govtSchemes: components.govtTransferAccess?.details?.schemesDetected || [],
      pmKisanDetected: (components.govtTransferAccess?.details?.schemesDetected || [])
        .some(s => s.includes('PM-KISAN') || s.includes('PMKISAN')),
    },
  };
};

/**
 * Extract risk flags from health result.
 */
const extractRiskFlags = (healthResult) => {
  const flags = [];
  const components = healthResult.components || {};

  if (components.debtDiscipline?.details?.bounceCount > 3) {
    flags.push({ type: 'HIGH_BOUNCE_RATE', severity: 'high', detail: `${components.debtDiscipline.details.bounceCount} bounces detected` });
  }
  if (components.cashFlowStability?.score < 40) {
    flags.push({ type: 'UNSTABLE_CASH_FLOW', severity: 'medium', detail: 'Cash flow stability below threshold' });
  }
  if (components.balanceAdequacy?.score < 30) {
    flags.push({ type: 'LOW_BALANCE_ADEQUACY', severity: 'high', detail: 'Average balance insufficient to cover expenses' });
  }
  if (healthResult.sentinelInputs?.deficitMonths > 4) {
    flags.push({ type: 'PROLONGED_DEFICIT', severity: 'high', detail: `${healthResult.sentinelInputs.deficitMonths} deficit months detected` });
  }

  return flags;
};

module.exports = { runAnalysis, getLatestAnalysis, getAnalysisHistory };
