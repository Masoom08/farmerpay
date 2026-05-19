/**
 * Cohort Report Controller — May 2026 bank pilot (JSON API)
 *
 * Three endpoints, all reading from `bank_loan_account_histories` via
 * the shared `cohortReportBuilder` service:
 *
 *   GET /bank/cohort-report/aggregate
 *        Pilot-wide view. All 5 banks × all 6 districts × both cohorts.
 *
 *   GET /bank/cohort-report/bank/:bankName
 *        Single-bank view + per-district breakdown.
 *
 *   GET /bank/cohort-report/district/:districtName
 *        Geography view + per-bank breakdown.
 *
 * Query params for all three: fromDate, toDate (YYYY-MM-DD, defaults
 * to last 30 days).
 *
 * Refactored in WS7.1 to delegate the heavy lifting to
 * `src/modules/bank/services/cohortReportBuilder.js` so the same math
 * is shared with the admin UI (WS4) and the new banker dashboard tab
 * (WS7). Zero duplication — all three surfaces get identical results.
 */

const { success } = require('../../../shared/utils/responseHelper');
const { buildCohortReport, parseDateRange } = require('../services/cohortReportBuilder');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

// ─── Endpoint: aggregate (pilot-wide) ───────────────────────────

const getAggregate = async (req, res, next) => {
  try {
    const { fromDate, toDate } = parseDateRange(req.query);
    const report = await buildCohortReport({}, fromDate, toDate);

    // Per-bank breakdown for the aggregate KPI strip
    const { sequelize } = getDb();
    const banksRows = await sequelize.query(
      `SELECT DISTINCT bank_name FROM bank_loan_account_histories
       WHERE snapshot_date BETWEEN :from AND :to AND bank_name IS NOT NULL`,
      { replacements: { from: fromDate, to: toDate }, type: sequelize.QueryTypes.SELECT }
    );
    const perBank = [];
    for (const { bank_name: bankName } of banksRows) {
      const sub = await buildCohortReport({ bankName }, fromDate, toDate);
      perBank.push({ bankName, cohorts: sub.cohorts, linkage: sub.linkage });
    }

    return success(res, {
      message: 'Aggregate pilot cohort report',
      data: { ...report, perBank },
    });
  } catch (err) { next(err); }
};

// ─── Endpoint: single bank ──────────────────────────────────────

const getByBank = async (req, res, next) => {
  try {
    const { fromDate, toDate } = parseDateRange(req.query);
    const bankName = req.params.bankName;
    if (!bankName) {
      const err = new Error('bankName is required'); err.statusCode = 400; throw err;
    }
    const report = await buildCohortReport({ bankName }, fromDate, toDate);

    // Per-district breakdown within the bank
    const { sequelize } = getDb();
    const districtRows = await sequelize.query(
      `SELECT DISTINCT district FROM bank_loan_account_histories
       WHERE bank_name = :bankName AND snapshot_date BETWEEN :from AND :to AND district IS NOT NULL`,
      { replacements: { bankName, from: fromDate, to: toDate }, type: sequelize.QueryTypes.SELECT }
    );
    const perDistrict = [];
    for (const { district } of districtRows) {
      const sub = await buildCohortReport({ bankName, districtName: district }, fromDate, toDate);
      perDistrict.push({ districtName: district, cohorts: sub.cohorts });
    }

    return success(res, {
      message: `Cohort report for ${bankName}`,
      data: { ...report, perDistrict },
    });
  } catch (err) { next(err); }
};

// ─── Endpoint: single district ──────────────────────────────────

const getByDistrict = async (req, res, next) => {
  try {
    const { fromDate, toDate } = parseDateRange(req.query);
    const districtName = req.params.districtName;
    if (!districtName) {
      const err = new Error('districtName is required'); err.statusCode = 400; throw err;
    }
    const report = await buildCohortReport({ districtName }, fromDate, toDate);

    // Per-bank breakdown within the district
    const { sequelize } = getDb();
    const bankRows = await sequelize.query(
      `SELECT DISTINCT bank_name FROM bank_loan_account_histories
       WHERE district = :districtName AND snapshot_date BETWEEN :from AND :to AND bank_name IS NOT NULL`,
      { replacements: { districtName, from: fromDate, to: toDate }, type: sequelize.QueryTypes.SELECT }
    );
    const perBank = [];
    for (const { bank_name: bankName } of bankRows) {
      const sub = await buildCohortReport({ bankName, districtName }, fromDate, toDate);
      perBank.push({ bankName, cohorts: sub.cohorts });
    }

    return success(res, {
      message: `Cohort report for district ${districtName}`,
      data: { ...report, perBank },
    });
  } catch (err) { next(err); }
};

module.exports = {
  getAggregate,
  getByBank,
  getByDistrict,
};
