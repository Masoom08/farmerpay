/**
 * Banker Cohort Controller — May 2026 pilot (WS7)
 *
 * Exposes the same 3 cohort report endpoints as the bank module but
 * scoped under `/api/v1/banker/cohort-report/*` so they're reachable
 * from the FarmerPay-internal DICE analyst dashboard at
 * `public/banker-dashboard.html`.
 *
 * Why mirror the endpoints instead of just calling /bank/cohort-report
 * from the SPA?
 *   - The banker dashboard's auth layer uses the `dice_analyst` role
 *     on the farmer `users` table. The /bank/cohort-report endpoints
 *     require generic authentication — but keeping banker endpoints
 *     under /banker lets the existing SPA auth flow reach them
 *     without any route reshuffling.
 *   - Future banker-specific enhancements (like cross-referencing the
 *     cohort report with PoP compliance scores already read by the
 *     banker module) can live here without polluting /bank.
 *
 * The math is identical — all three endpoints delegate to the shared
 * `cohortReportBuilder` service extracted in WS7.1.
 */

const { success } = require('../../../shared/utils/responseHelper');
const { buildCohortReport, parseDateRange } = require('../../bank/services/cohortReportBuilder');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

// ─── Endpoint: aggregate (pilot-wide) ───────────────────────────

const getAggregate = async (req, res, next) => {
  try {
    const { fromDate, toDate } = parseDateRange(req.query);
    const report = await buildCohortReport({}, fromDate, toDate);

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
      message: 'Aggregate pilot cohort report (banker dashboard)',
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
      message: `Cohort report for ${bankName} (banker dashboard)`,
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
      message: `Cohort report for district ${districtName} (banker dashboard)`,
      data: { ...report, perBank },
    });
  } catch (err) { next(err); }
};

module.exports = {
  getAggregate,
  getByBank,
  getByDistrict,
};
