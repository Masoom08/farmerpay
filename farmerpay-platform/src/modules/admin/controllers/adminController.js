/**
 * Admin Controller — bank-ops admin UI for the May 2026 pilot.
 *
 * All handlers render EJS pages. Backend logic delegates to the existing
 * bank module services (bankPortfolioBulkService, cohortStatsService, etc).
 */

const bcrypt = require('bcryptjs');
// Op no longer needed after cohortReportBuilder extraction (WS7.1)
const bankPortfolioBulkService = require('../../bank/services/bankPortfolioBulkService');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

// ─── Auth ────────────────────────────────────────────────────────

const showLogin = (req, res) => {
  if (req.session && req.session.adminId) return res.redirect('/admin');
  res.render('admin/login', {
    title: 'Sign in — FarmerPay Bank Ops',
    next: req.query.next || '',
    error: req.query.error || null,
  });
};

const doLogin = async (req, res, next) => {
  try {
    const { AdminUser } = getDb();
    const { email, password, next: nextUrl } = req.body;
    if (!email || !password) {
      return res.redirect('/admin/login?error=missing_fields');
    }
    // Use the withPassword scope to load the password hash
    const admin = await AdminUser.scope('withPassword').findOne({
      where: { email: email.toLowerCase().trim(), is_active: true },
    });
    if (!admin) return res.redirect('/admin/login?error=invalid_credentials');
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) return res.redirect('/admin/login?error=invalid_credentials');

    req.session.adminId = admin.id;
    await admin.update({ last_login_at: new Date() });

    const dest = (nextUrl && nextUrl.startsWith('/admin')) ? nextUrl : '/admin';
    return res.redirect(dest);
  } catch (err) {
    return next(err);
  }
};

const doLogout = (req, res) => {
  if (req.session) req.session.destroy(() => res.redirect('/admin/login'));
  else res.redirect('/admin/login');
};

// ─── Dashboard root ──────────────────────────────────────────────

const showDashboard = (req, res) => {
  res.render('admin/dashboard', {
    title: 'Dashboard — FarmerPay Bank Ops',
  });
};

// ─── Imports ─────────────────────────────────────────────────────

const showImportsList = async (req, res, next) => {
  try {
    const { BankPortfolioImport } = getDb();
    const where = {};
    // Bank-scope: bank_admin only sees their own bank's imports
    if (req.admin.role === 'bank_admin' && req.admin.bank_name_scope) {
      where.bank_name = req.admin.bank_name_scope;
    }
    const imports = await BankPortfolioImport.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 100,
    });
    res.render('admin/imports/list', {
      title: 'Import history',
      imports,
    });
  } catch (err) { next(err); }
};

const showNewImport = (req, res) => {
  res.render('admin/imports/new', {
    title: 'New import',
    error: req.query.error || null,
  });
};

const submitNewImport = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.redirect('/admin/imports/new?error=' + encodeURIComponent('Please choose an .xlsx file'));
    }
    // Bank-scope: a bank_admin can only upload for their own bank
    let bankName = req.body.bankName || '';
    if (req.admin.role === 'bank_admin' && req.admin.bank_name_scope) {
      bankName = req.admin.bank_name_scope;
    }
    if (!bankName) {
      return res.redirect('/admin/imports/new?error=' + encodeURIComponent('Bank name is required'));
    }
    const result = await bankPortfolioBulkService.kickoffBulkImport(req.admin.id, req.file, {
      bankName,
      branchCode: req.body.branchCode || null,
      district: req.body.district || null,
      dataAsOfDate: req.body.dataAsOfDate || null,
      defaultCohortTag: req.body.defaultCohortTag || null,
    });
    return res.redirect('/admin/imports/' + result.importUuid);
  } catch (err) { next(err); }
};

const showImportStatus = async (req, res, next) => {
  try {
    const result = await bankPortfolioBulkService.getImportStatus(req.params.uuid);
    // Bank-scope check
    if (req.admin.role === 'bank_admin' &&
        req.admin.bank_name_scope &&
        result.bankName !== req.admin.bank_name_scope) {
      return res.status(403).render('admin/error', {
        title: 'Forbidden',
        error: 'You can only view imports for your own bank.',
      });
    }
    res.render('admin/imports/status', {
      title: 'Import ' + result.importUuid.slice(0, 8),
      result,
    });
  } catch (err) { next(err); }
};

// ─── Cohort reports ──────────────────────────────────────────────
// Delegates to the shared cohortReportBuilder so this server-rendered
// admin UI, the JSON-API bank cohort controller, and the banker-dashboard
// cohort tab (WS7) all use identical math. Extracted during WS7.1 to
// remove the duplication that existed in the original WS4 admin build.

const { buildCohortReport, parseDateRange } = require('../../bank/services/cohortReportBuilder');

const parseRange = (req) => parseDateRange(req.query);

const showAggregateReport = async (req, res, next) => {
  try {
    const { fromDate, toDate } = parseRange(req);
    const filter = {};
    // Bank-scope: a bank_admin viewing the aggregate sees only their bank
    if (req.admin.role === 'bank_admin' && req.admin.bank_name_scope) {
      filter.bankName = req.admin.bank_name_scope;
    }
    const report = await buildCohortReport(filter, fromDate, toDate);

    // Per-bank breakdown for the aggregate KPI strip
    const { sequelize } = getDb();
    const banksRows = await sequelize.query(
      `SELECT DISTINCT bank_name FROM bank_loan_account_histories
       WHERE snapshot_date BETWEEN :from AND :to AND bank_name IS NOT NULL
       ${req.admin.role === 'bank_admin' ? 'AND bank_name = :scope' : ''}`,
      {
        replacements: {
          from: fromDate, to: toDate,
          scope: req.admin.bank_name_scope,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    const perBank = [];
    for (const { bank_name: bankName } of banksRows) {
      const sub = await buildCohortReport({ bankName }, fromDate, toDate);
      perBank.push({ bankName, cohorts: sub.cohorts });
    }

    res.render('admin/reports/aggregate', {
      title: 'Pilot cohort report — aggregate',
      report,
      perBank,
      fromDate, toDate,
    });
  } catch (err) { next(err); }
};

const showBankReport = async (req, res, next) => {
  try {
    const { fromDate, toDate } = parseRange(req);
    const bankName = req.params.bankName;
    if (req.admin.role === 'bank_admin' && req.admin.bank_name_scope !== bankName) {
      return res.status(403).render('admin/error', {
        title: 'Forbidden', error: 'You can only see your own bank.',
      });
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

    res.render('admin/reports/bank', {
      title: bankName + ' — cohort report',
      bankName, report, perDistrict, fromDate, toDate,
    });
  } catch (err) { next(err); }
};

const showDistrictReport = async (req, res, next) => {
  try {
    const { fromDate, toDate } = parseRange(req);
    const districtName = req.params.districtName;
    const filter = { districtName };
    if (req.admin.role === 'bank_admin' && req.admin.bank_name_scope) {
      filter.bankName = req.admin.bank_name_scope;
    }
    const report = await buildCohortReport(filter, fromDate, toDate);

    const { sequelize } = getDb();
    const bankRows = await sequelize.query(
      `SELECT DISTINCT bank_name FROM bank_loan_account_histories
       WHERE district = :districtName AND snapshot_date BETWEEN :from AND :to AND bank_name IS NOT NULL
       ${req.admin.role === 'bank_admin' ? 'AND bank_name = :scope' : ''}`,
      {
        replacements: { districtName, from: fromDate, to: toDate, scope: req.admin.bank_name_scope },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    const perBank = [];
    for (const { bank_name: bankName } of bankRows) {
      const sub = await buildCohortReport({ bankName, districtName }, fromDate, toDate);
      perBank.push({ bankName, cohorts: sub.cohorts });
    }

    res.render('admin/reports/district', {
      title: districtName + ' — cohort report',
      districtName, report, perBank, fromDate, toDate,
    });
  } catch (err) { next(err); }
};

module.exports = {
  showLogin, doLogin, doLogout,
  showDashboard,
  showImportsList, showNewImport, submitNewImport, showImportStatus,
  showAggregateReport, showBankReport, showDistrictReport,
};
