/**
 * NPA Calculation Service — May 2026 bank pilot
 *
 * Recomputes days_past_due and sma_classification for every active
 * bank_loan_accounts row from the repayment schedules + payments we've
 * ingested (via bankPortfolioBulkService). Writes the result back to
 * the live account row AND appends a time-series snapshot to
 * bank_loan_account_histories so the cohort report can plot weekly
 * NPA % trends across the 3-month pilot window.
 *
 * Algorithm (per loan, per run):
 *   1. Find the earliest unpaid scheduled installment (status != 'paid')
 *   2. DPD = max(0, today - earliest_unpaid.due_date)
 *   3. Classify SMA per RBI Master Direction on Prudential Norms:
 *        DPD = 0              → standard
 *        DPD 1–30             → sma_0
 *        DPD 31–60            → sma_1
 *        DPD 61–90            → sma_2
 *        DPD ≥ 91             → npa
 *   4. Update bank_loan_accounts.days_past_due + sma_classification
 *   5. Insert one bank_loan_account_histories row with denormalized
 *      (bank_name, district, cohort_tag, loan_type) dimensions + the
 *      fresh DPD + SMA + outstanding
 *
 * Loans with NO schedule rows (e.g. a just-uploaded loan with only the
 * Loans tab populated) keep whatever DPD was on the account row. The
 * cron still snapshots them so the history table has complete coverage.
 *
 * Designed to be called daily from a cron job. Safe to run multiple
 * times per day — it always overwrites the live row and inserts a new
 * history snapshot. The history is idempotent-per-day via the caller's
 * control (cron runs once at 02:00 local).
 */

const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

/**
 * Classify a DPD integer into one of the SMA enum values. Per RBI rules.
 * Pure function, no IO.
 *
 * @param {number} dpd
 * @returns {'standard'|'sma_0'|'sma_1'|'sma_2'|'npa'}
 */
const classifySma = (dpd) => {
  if (!Number.isFinite(dpd) || dpd <= 0) return 'standard';
  if (dpd <= 30) return 'sma_0';
  if (dpd <= 60) return 'sma_1';
  if (dpd <= 90) return 'sma_2';
  return 'npa';
};

/**
 * YYYY-MM-DD for a given Date (UTC). Used as the `snapshot_date` for
 * the history rows so each daily run lands with a consistent key.
 */
const isoDate = (d = new Date()) => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Day-diff between two YYYY-MM-DD strings (b - a) as an integer.
 */
const daysBetween = (aIso, bIso) => {
  const a = new Date(aIso);
  const b = new Date(bIso);
  return Math.floor((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
};

/**
 * Recompute DPD + SMA for one bank loan account. Returns the computed
 * values without writing them; the caller decides when to persist.
 * Exposed separately so unit tests can exercise the pure logic.
 *
 * @param {{
 *   days_past_due?: number,
 *   outstanding_amount?: number,
 * }} account
 * @param {Array<{ status: string, due_date: string }>} schedules
 * @param {string} asOfIso - YYYY-MM-DD
 * @returns {{ dpd: number, sma: string, reason: string }}
 */
const computeForAccount = (account, schedules, asOfIso) => {
  // Find earliest unpaid installment with a due date on or before asOf
  const unpaid = schedules
    .filter((s) => s.status !== 'paid' && s.status !== 'forgiven' && s.due_date)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  if (unpaid.length === 0) {
    // No schedule rows OR everything is paid. Fall back to whatever
    // DPD the bank supplied in the Loans tab.
    const dpd = Math.max(0, Number(account.days_past_due || 0));
    return {
      dpd,
      sma: classifySma(dpd),
      reason: schedules.length === 0 ? 'no_schedule' : 'all_paid',
    };
  }

  const earliestDue = unpaid[0].due_date;
  const diff = daysBetween(earliestDue, asOfIso);
  const dpd = Math.max(0, diff);
  return {
    dpd,
    sma: classifySma(dpd),
    reason: 'from_schedule',
  };
};

/**
 * Walk every active bank_loan_account, recompute DPD + SMA, persist the
 * live row, and append a history snapshot. Used by the daily cron.
 *
 * @param {Object} [opts]
 * @param {string} [opts.asOfIso] - snapshot date override (default: today UTC)
 * @param {string} [opts.bankName] - optional filter for single-bank dress rehearsal
 * @returns {Promise<{ processed: number, updated: number, errors: number, snapshotDate: string }>}
 */
const recalcForAllActiveAccounts = async (opts = {}) => {
  const {
    BankLoanAccount,
    BankPortfolioImport,
    LoanRepaymentSchedule,
    BankLoanAccountHistory,
  } = getDb();

  const asOfIso = opts.asOfIso || isoDate();
  const where = { is_active: true };

  // Build include for bank_name lookup via the import association
  const include = [
    {
      model: BankPortfolioImport,
      as: 'import',
      required: false,
      attributes: ['bank_name'],
    },
  ];
  if (opts.bankName) {
    include[0].where = { bank_name: opts.bankName };
    include[0].required = true;
  }

  const accounts = await BankLoanAccount.findAll({ where, include });

  let updated = 0;
  let errors = 0;
  const historyRows = [];

  for (const account of accounts) {
    try {
      const schedules = await LoanRepaymentSchedule.findAll({
        where: { bank_loan_account_id: account.id },
        attributes: ['status', 'due_date'],
        order: [['due_date', 'ASC']],
      });

      const { dpd, sma } = computeForAccount(account, schedules, asOfIso);

      // Persist live row if anything changed. Emit a structured audit
      // event on any SMA transition so the ops team can distinguish
      // automated monitoring reclassifications from manual operator
      // actions — a disputed-account escalation must not sneak through
      // unnoticed.
      if (account.days_past_due !== dpd || account.sma_classification !== sma) {
        const prevSma = account.sma_classification;
        await account.update({ days_past_due: dpd, sma_classification: sma });
        updated += 1;
        if (prevSma !== sma) {
          logger.info('bank.sma_reclassified', {
            event: 'bank.sma_reclassified',
            accountId: account.id,
            fromSma: prevSma,
            toSma: sma,
            daysPastDue: dpd,
            trigger: 'monitoring_trigger',
            asOf: asOfIso,
          });
        }
      }

      // Always snapshot
      historyRows.push({
        bank_loan_account_id: account.id,
        bank_name: account.import ? account.import.bank_name : null,
        district: account.district,
        cohort_tag: account.cohort_tag,
        loan_type: account.loan_type,
        sma_classification: sma,
        days_past_due: dpd,
        outstanding_amount: account.outstanding_amount,
        overdue_amount: account.overdue_amount,
        snapshot_date: asOfIso,
      });
    } catch (err) {
      errors += 1;
      logger.warn(`NPA recalc failed for account ${account.id}: ${err.message}`);
    }
  }

  // One bulk insert for history — much faster than per-row creates
  if (historyRows.length > 0) {
    // Delete any existing snapshot rows for the same (account, date) so
    // re-running the cron within the same day is idempotent.
    const accountIds = historyRows.map((r) => r.bank_loan_account_id);
    await BankLoanAccountHistory.destroy({
      where: { bank_loan_account_id: accountIds, snapshot_date: asOfIso },
    });
    await BankLoanAccountHistory.bulkCreate(historyRows);
  }

  logger.info(
    `NPA recalc: processed=${accounts.length} updated=${updated} errors=${errors} snapshotDate=${asOfIso}`
  );

  return {
    processed: accounts.length,
    updated,
    errors,
    snapshotDate: asOfIso,
  };
};

module.exports = {
  classifySma,
  computeForAccount,
  recalcForAllActiveAccounts,
  isoDate,
};
