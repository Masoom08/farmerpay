/**
 * Cohort Report Builder — shared core for the May 2026 pilot cohort report.
 *
 * Three callers import this single builder so the math is computed
 * identically across all three surfaces:
 *
 *   1. JSON API under /api/v1/bank/cohort-report/* (bank module)
 *      - used by the farmer-app team for JSON integration if needed
 *
 *   2. Server-rendered admin UI under /admin/reports/* (admin module)
 *      - bank-ops staff at the 5 partner banks use these EJS pages
 *
 *   3. JSON API under /api/v1/banker/cohort-report/* (banker module, WS7)
 *      - FarmerPay-internal DICE analysts read these from the existing
 *        banker-dashboard.html SPA
 *
 * Previously duplicated between `src/modules/bank/controllers/cohortReportController.js`
 * and `src/modules/admin/controllers/adminController.js`. Extracted here
 * as part of WS7.1.
 *
 * Why extract instead of importing from one of the controllers directly?
 * Controllers are HTTP-layer concerns (req/res handlers). Putting this
 * logic in a service module makes it reusable from jobs, tests, or CLI
 * scripts without pulling in Express.
 */

const { Op } = require('sequelize');
const cohortStatsService = require('./cohortStatsService');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

/**
 * Build a cohort report for a given scope and date range.
 *
 * @param {Object} filter - { bankName?, districtName? }
 * @param {string} fromDate - YYYY-MM-DD
 * @param {string} toDate - YYYY-MM-DD
 * @returns {Promise<{
 *   cohorts: {
 *     test: CohortSummary,
 *     control: CohortSummary,
 *     unassigned: CohortSummary,
 *     comparison: { diff, pValueOneSided, computable },
 *   },
 *   linkage: { test, control, pilotTarget },
 *   trend: Array<{ weekStart, testNpaPct, controlNpaPct }>,
 *   filter,
 *   dateRange: { fromDate, toDate },
 * }>}
 */
// Defense-in-depth: even though bankName/districtName reach the SQL only via
// parameterized replacements, reject inputs that look like SQL metacharacters
// before they touch the query builder. Prevents regressions if a future edit
// drops the parameterization.
const SAFE_NAME_RE = /^[A-Za-z0-9 .,'&()_\-/]{1,100}$/;
const assertSafeName = (value, field) => {
  if (value == null) return;
  if (typeof value !== 'string' || !SAFE_NAME_RE.test(value)) {
    const err = new Error(`Invalid ${field}`);
    err.statusCode = 400;
    err.errorCode = 'BANK_COHORT_INVALID_FILTER';
    throw err;
  }
};

const buildCohortReport = async (filter, fromDate, toDate) => {
  const { sequelize, BankLoanAccountHistory, BankLoanAccount } = getDb();

  assertSafeName(filter.bankName, 'bankName');
  assertSafeName(filter.districtName, 'districtName');

  // ─── 1. Latest SMA snapshot per account within the window ────
  // MySQL pattern: self-join on (account_id, max(snapshot_date)) so we
  // only aggregate each loan's most recent state in the date range.
  // Clause fragments are STATIC — user values never land in the SQL text,
  // only in `replacements`.
  const replacements = { from: fromDate, to: toDate };
  let bankClause = '';
  let districtClause = '';
  if (filter.bankName) {
    bankClause = 'AND bank_name = :bankName';
    replacements.bankName = filter.bankName;
  }
  if (filter.districtName) {
    districtClause = 'AND district = :districtName';
    replacements.districtName = filter.districtName;
  }

  const latestRows = await sequelize.query(
    `SELECT h1.* FROM bank_loan_account_histories h1
     INNER JOIN (
       SELECT bank_loan_account_id, MAX(snapshot_date) AS latest_date
       FROM bank_loan_account_histories
       WHERE snapshot_date BETWEEN :from AND :to
       ${bankClause}
       ${districtClause}
       GROUP BY bank_loan_account_id
     ) h2 ON h1.bank_loan_account_id = h2.bank_loan_account_id
        AND h1.snapshot_date = h2.latest_date
     WHERE 1=1 ${bankClause} ${districtClause}`,
    { replacements, type: sequelize.QueryTypes.SELECT }
  );

  const cohorts = cohortStatsService.summarizeCohorts(latestRows);

  // ─── 2. Linkage-rate KPI (WS6.2) ───────────────────────────
  // Reads live `bank_loan_accounts` rather than the history table so
  // it reflects the current onboarding state, not a stale snapshot.
  const linkageWhere = { is_active: true };
  if (filter.bankName) {
    // bank_name lives on the parent import row — join via include
  }
  if (filter.districtName) linkageWhere.district = filter.districtName;

  const { BankPortfolioImport } = getDb();
  const linkageRows = await BankLoanAccount.findAll({
    where: linkageWhere,
    attributes: ['cohort_tag', 'linked_farmer_id', 'linkage_status'],
    include: filter.bankName
      ? [{
          model: BankPortfolioImport,
          as: 'import',
          attributes: [],
          required: true,
          where: { bank_name: filter.bankName },
        }]
      : [],
    raw: true,
    nest: true,
  });
  const linkage = cohortStatsService.computeLinkageRate(linkageRows);

  // ─── 3. Weekly trend ──────────────────────────────────────
  // Bucket every snapshot row by the Monday of its week so the
  // Chart.js trend line has evenly-spaced weekly points.
  const where = { snapshot_date: { [Op.between]: [fromDate, toDate] } };
  if (filter.bankName) where.bank_name = filter.bankName;
  if (filter.districtName) where.district = filter.districtName;

  const trendRows = await BankLoanAccountHistory.findAll({
    where,
    attributes: ['snapshot_date', 'cohort_tag', 'sma_classification'],
    raw: true,
  });

  const trendByWeek = new Map();
  for (const row of trendRows) {
    const d = new Date(row.snapshot_date);
    const dow = d.getUTCDay();              // 0=Sun..6=Sat
    const delta = (dow + 6) % 7;            // days back to Monday
    d.setUTCDate(d.getUTCDate() - delta);
    const weekStart = d.toISOString().slice(0, 10);

    if (!trendByWeek.has(weekStart)) {
      trendByWeek.set(weekStart, {
        test:    { total: 0, npa: 0 },
        control: { total: 0, npa: 0 },
      });
    }
    const bucket = trendByWeek.get(weekStart);
    if (!bucket[row.cohort_tag]) continue;
    bucket[row.cohort_tag].total += 1;
    if (row.sma_classification === 'npa') bucket[row.cohort_tag].npa += 1;
  }

  const trend = Array.from(trendByWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, data]) => ({
      weekStart,
      testNpaPct:    data.test.total    ? data.test.npa    / data.test.total    : 0,
      controlNpaPct: data.control.total ? data.control.npa / data.control.total : 0,
      testN:         data.test.total,
      controlN:      data.control.total,
    }));

  return {
    cohorts,
    linkage,
    trend,
    filter,
    dateRange: { fromDate, toDate },
  };
};

// ─── Date helpers exposed so callers don't rebuild them ───────

const daysAgoIso = (n) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Parse { fromDate, toDate } from an Express req.query with sensible
 * defaults (last 30 days). Centralized so all 3 surfaces behave the same.
 */
const parseDateRange = (query = {}) => ({
  fromDate: query.fromDate || daysAgoIso(30),
  toDate:   query.toDate   || todayIso(),
});

module.exports = {
  buildCohortReport,
  parseDateRange,
  daysAgoIso,
  todayIso,
};
