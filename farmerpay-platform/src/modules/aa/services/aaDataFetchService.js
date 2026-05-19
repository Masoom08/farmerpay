/**
 * AA Data Fetch Service
 * Fetches financial data from AA providers after consent is approved.
 * Normalizes bank statement data into a common format and persists to DB.
 */

const logger = require('../../../shared/utils/logger');
const { generateUUID } = require('../../../shared/utils/uuidHelper');
const { setWithTTL, deleteKeys } = require('../../../config/redis');
const { getProvider } = require('../../../integrations/accountAggregator');
const { aaConfig } = require('../../../integrations/accountAggregator');
const { canFetch, recordFetch } = require('./aaRateLimiter');
const { logEvent } = require('./aaAuditLogger');
const { runAnalysis } = require('./aaAnalysisOrchestrator');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

/**
 * Fetch bank statement data for an approved consent.
 * Creates a data session with the AA provider, fetches data, normalizes, and stores.
 * @param {number} consentId - Internal AaConsent ID
 * @param {number} farmerId - Internal user ID
 * @param {string} provider - AA provider name
 * @returns {Object} { summaryUuid, accountsProcessed, transactionCount }
 */
const fetchAndStore = async (consentId, farmerId, provider) => {
  const { AaConsent, AaBankStatementSummary, sequelize: seq } = getDb();

  // Rate limit check
  const rateCheck = await canFetch(farmerId);
  if (!rateCheck.allowed) {
    const err = new Error(`Fetch rate limited: ${rateCheck.reason}`);
    err.statusCode = 429;
    err.errorCode = 'AA_RATE_LIMITED';
    if (rateCheck.retryAfterSeconds) err.retryAfterSeconds = rateCheck.retryAfterSeconds;
    throw err;
  }

  const consent = await AaConsent.findByPk(consentId);
  if (!consent || consent.consent_status !== 'approved') {
    const err = new Error('Consent not approved or not found');
    err.statusCode = 400;
    err.errorCode = 'AA_CONSENT_NOT_APPROVED';
    throw err;
  }

  // RBI AA framework requires consent expiry to be enforced at the moment of
  // access, not only at the nightly purge job. A consent that expired an hour
  // ago but has not yet been swept must NOT produce new data pulls.
  // (`data_to` is the LAST-transaction-date in the requested window, not an
  // access-time cutoff, so we only gate on `expires_at` here.)
  if (consent.expires_at && new Date(consent.expires_at).getTime() <= Date.now()) {
    const err = new Error('Consent has expired');
    err.statusCode = 403;
    err.errorCode = 'AA_CONSENT_EXPIRED';
    throw err;
  }

  const client = getProvider(provider);

  // Step 1: Create data session
  logger.info(`[AADataFetch] Creating data session for consent ${consent.consent_uuid}`);
  const session = await client.createDataSession(consent.consent_uuid, {
    dataFromDate: consent.data_from,
    dataToDate: consent.data_to,
  });

  if (!session.sessionId) {
    logger.error('[AADataFetch] Failed to create data session');
    const err = new Error('AA data session creation failed');
    err.statusCode = 502;
    err.errorCode = 'AA_SESSION_FAILED';
    throw err;
  }

  // Step 2: Poll for data (with retry)
  let data = null;
  for (let attempt = 0; attempt < aaConfig.retry.maxAttempts; attempt++) {
    await sleep(aaConfig.retry.backoffMs * (attempt + 1));
    data = await client.fetchSessionData(session.sessionId);
    if (data.status === 'COMPLETED') break;
  }

  if (!data || data.status !== 'COMPLETED' || !data.accounts.length) {
    logger.warn(`[AADataFetch] Session ${session.sessionId} did not complete`);
    logEvent({
      consentId, farmerId,
      eventType: 'data_fetch_failed', eventSource: 'system',
      provider, metadata: { sessionId: session.sessionId, status: data?.status || 'no_data' },
    });
    return { status: 'pending', sessionId: session.sessionId, accountsProcessed: 0 };
  }

  // Collect all raw transactions for orchestrator
  const allRawTransactions = [];
  for (const fi of data.accounts) {
    for (const acct of fi.accounts) {
      for (const txn of (acct.transactions || [])) {
        allRawTransactions.push(txn);
      }
    }
  }

  // Step 3: Normalize and store each account's summary
  const transaction = await seq.transaction();
  try {
    let totalAccounts = 0;
    let totalTransactions = 0;

    // Deactivate old summaries for this farmer
    await AaBankStatementSummary.update(
      { is_active: false },
      { where: { farmer_id: farmerId, is_active: true }, transaction }
    );

    for (const fi of data.accounts) {
      for (const acct of fi.accounts) {
        const summary = computeSummary(acct, consent);

        await AaBankStatementSummary.create({
          summary_uuid: generateUUID(),
          farmer_id: farmerId,
          consent_id: consentId,
          bank_name: fi.fipName || fi.fipId || 'Unknown',
          account_type: mapAccountType(acct.accountType),
          period_months: monthsBetween(consent.data_from, consent.data_to),
          avg_monthly_credit: summary.avgMonthlyCredit,
          avg_monthly_debit: summary.avgMonthlyDebit,
          avg_monthly_balance: summary.avgMonthlyBalance,
          min_balance: summary.minBalance,
          max_balance: summary.maxBalance,
          salary_dbt_credits: summary.salaryDbtCredits,
          govt_subsidy_credits: summary.govtSubsidyCredits,
          upi_transaction_count: summary.upiTransactionCount,
          avg_upi_value: summary.avgUpiValue,
          bounce_count: summary.bounceCount,
          emi_debit_count: summary.emiDebitCount,
          cash_withdrawal_ratio: summary.cashWithdrawalRatio,
          is_active: true,
        }, { transaction });

        totalAccounts++;
        totalTransactions += (acct.transactions || []).length;
      }
    }

    await transaction.commit();

    // Invalidate caches
    await deleteKeys([`aa:summary:${farmerId}`, `aa:analysis:${farmerId}`]);

    // Cache the fresh summary for cross-module use
    const freshSummaries = await AaBankStatementSummary.findAll({
      where: { farmer_id: farmerId, is_active: true },
    });
    await setWithTTL(
      `aa:summary:${farmerId}`,
      JSON.stringify(freshSummaries.map(s => s.toJSON())),
      aaConfig.cache.summaryTTL
    );

    // Update consent fetch tracking
    await consent.update({
      last_fetch_at: new Date(),
      fetch_count: (consent.fetch_count || 0) + 1,
    });

    logger.info(`[AADataFetch] Stored ${totalAccounts} account summaries, ${totalTransactions} transactions for farmer ${farmerId}`);

    // Record fetch in rate limiter
    await recordFetch(farmerId);

    // Audit log: data_fetched
    logEvent({
      consentId, farmerId,
      eventType: 'data_fetched', eventSource: 'system',
      provider, metadata: { accountsProcessed: totalAccounts, transactionCount: totalTransactions },
    });

    // Run analysis orchestrator with raw transactions (async, non-blocking)
    if (allRawTransactions.length > 0) {
      runAnalysis(farmerId, allRawTransactions, { consentId, provider }).catch(err => {
        logger.error('[AADataFetch] Analysis orchestrator failed (non-blocking):', err.message);
      });
    }

    return {
      status: 'completed',
      accountsProcessed: totalAccounts,
      transactionCount: totalTransactions,
    };
  } catch (err) {
    await transaction.rollback();
    logger.error('[AADataFetch] Store failed:', err.message);
    logEvent({
      consentId, farmerId,
      eventType: 'data_fetch_failed', eventSource: 'system',
      provider, metadata: { error: err.message },
    });
    throw err;
  }
};

// ──────────────────────────────────────────────
// Summary Computation from raw transactions
// ──────────────────────────────────────────────

/**
 * Compute aggregated summary metrics from raw account data.
 * @param {Object} acct - { summary, transactions, profile }
 * @param {Object} consent - AaConsent record
 * @returns {Object} Normalized summary metrics
 */
const computeSummary = (acct, consent) => {
  const txns = acct.transactions || [];
  const months = Math.max(1, monthsBetween(consent.data_from, consent.data_to));

  // If AA returns pre-computed summary, use it
  if (acct.summary && acct.summary.currentBalance !== undefined) {
    return {
      avgMonthlyCredit: parseFloat(acct.summary.totalCredits || 0) / months,
      avgMonthlyDebit: parseFloat(acct.summary.totalDebits || 0) / months,
      avgMonthlyBalance: parseFloat(acct.summary.averageBalance || acct.summary.currentBalance || 0),
      minBalance: parseFloat(acct.summary.minBalance || 0),
      maxBalance: parseFloat(acct.summary.maxBalance || 0),
      salaryDbtCredits: 0,
      govtSubsidyCredits: 0,
      upiTransactionCount: 0,
      avgUpiValue: 0,
      bounceCount: 0,
      emiDebitCount: 0,
      cashWithdrawalRatio: 0,
    };
  }

  // Compute from individual transactions
  let totalCredits = 0, totalDebits = 0;
  let balances = [];
  let salaryDbtCount = 0, govtSubsidyCount = 0;
  let upiCount = 0, upiTotal = 0;
  let bounceCount = 0, emiCount = 0;
  let cashWithdrawals = 0;

  for (const txn of txns) {
    const amt = parseFloat(txn.amount || txn.transactionAmount || 0);
    const type = (txn.type || txn.txnType || '').toUpperCase();
    const narration = (txn.narration || txn.transactionNarration || '').toUpperCase();
    const mode = (txn.mode || txn.transactionMode || '').toUpperCase();
    const balance = parseFloat(txn.currentBalance || txn.balance || 0);

    if (balance) balances.push(balance);

    if (type === 'CREDIT') {
      totalCredits += amt;
      if (isGovtTransfer(narration)) govtSubsidyCount++;
      if (isSalaryOrDBT(narration)) salaryDbtCount++;
    } else if (type === 'DEBIT') {
      totalDebits += amt;
      if (isEmiPayment(narration)) emiCount++;
      if (isBounce(narration)) bounceCount++;
      if (mode === 'ATM' || narration.includes('ATM') || narration.includes('CASH')) {
        cashWithdrawals += amt;
      }
    }

    if (mode === 'UPI' || narration.includes('UPI')) {
      upiCount++;
      upiTotal += amt;
    }
  }

  return {
    avgMonthlyCredit: totalCredits / months,
    avgMonthlyDebit: totalDebits / months,
    avgMonthlyBalance: balances.length ? balances.reduce((a, b) => a + b, 0) / balances.length : 0,
    minBalance: balances.length ? Math.min(...balances) : 0,
    maxBalance: balances.length ? Math.max(...balances) : 0,
    salaryDbtCredits: salaryDbtCount,
    govtSubsidyCredits: govtSubsidyCount,
    upiTransactionCount: upiCount,
    avgUpiValue: upiCount ? upiTotal / upiCount : 0,
    bounceCount,
    emiDebitCount: emiCount,
    cashWithdrawalRatio: totalDebits > 0 ? (cashWithdrawals / totalDebits) * 100 : 0,
  };
};

// ──────────────────────────────────────────────
// Narration classifiers (agriculture-specific)
// ──────────────────────────────────────────────

const GOVT_PATTERNS = [
  'PM-KISAN', 'PMKISAN', 'PM KISAN', 'DBT', 'DIRECT BENEFIT',
  'MGNREGA', 'NREGA', 'MNREGS', 'GOVT', 'GOI', 'STATE GOVT',
  'SUBSIDY', 'PM-SYM', 'PMJDY', 'PMFBY', 'KALIA', 'RYTHU BANDHU',
  'PM SAMMAN NIDHI', 'PENSION', 'SOCIAL WELFARE',
];

const SALARY_DBT_PATTERNS = [
  'SALARY', 'SAL CR', 'WAGE', 'STIPEND', 'DBT', 'NEFT-SALARY',
  'PENSION', 'MGNREGA', 'NREGA',
];

const EMI_PATTERNS = [
  'EMI', 'LOAN', 'NACH', 'E-NACH', 'AUTO DEBIT', 'MANDATE',
  'REPAYMENT', 'INSTALLMENT', 'KCC', 'SBI LOAN', 'BOI LOAN',
];

const BOUNCE_PATTERNS = [
  'BOUNCE', 'RETURN', 'DISHONOUR', 'INSUFFICIENT', 'MANDATE FAIL',
  'NACH RETURN', 'ECS RETURN', 'UNPAID',
];

const isGovtTransfer = (narration) => GOVT_PATTERNS.some(p => narration.includes(p));
const isSalaryOrDBT = (narration) => SALARY_DBT_PATTERNS.some(p => narration.includes(p));
const isEmiPayment = (narration) => EMI_PATTERNS.some(p => narration.includes(p));
const isBounce = (narration) => BOUNCE_PATTERNS.some(p => narration.includes(p));

// ──────────────────────────────────────────────
// Utilities
// ──────────────────────────────────────────────

const mapAccountType = (aaType) => {
  const map = {
    SAVINGS: 'savings', CURRENT: 'current', KCC: 'kcc',
    LOAN: 'loan', DEPOSIT: 'savings', RECURRING_DEPOSIT: 'savings',
  };
  return map[(aaType || '').toUpperCase()] || 'savings';
};

const monthsBetween = (from, to) => {
  const d1 = new Date(from);
  const d2 = new Date(to);
  return Math.max(1, (d2.getFullYear() - d1.getFullYear()) * 12 + d2.getMonth() - d1.getMonth());
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = { fetchAndStore, computeSummary };
