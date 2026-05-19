/**
 * Bank Controller
 * Handles CSV portfolio import, manual data entry, loan account management.
 */

const { v4: uuidv4 } = require('uuid');
const bankPortfolioService = require('../services/bankPortfolioService');
const bankPortfolioBulkService = require('../services/bankPortfolioBulkService');
const { success } = require('../../../shared/utils/responseHelper');
const { User } = require('../../../shared/models');

const resolveUserId = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) { const err = new Error('User not found'); err.statusCode = 404; throw err; }
  return user.id;
};

/** POST /bank/portfolio/import — Upload CSV/Excel of gold loan portfolio */
const importPortfolio = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    if (!req.file) {
      const err = new Error('No file uploaded. Please upload a CSV or Excel file.');
      err.statusCode = 400;
      throw err;
    }
    const result = await bankPortfolioService.importPortfolio(userId, req.file, req.body);
    return success(res, { message: 'Portfolio imported', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

/** GET /bank/portfolio/imports — Import history */
const getImportHistory = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const result = await bankPortfolioService.getImportHistory(userId);
    return success(res, { message: 'Import history retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /bank/loan-accounts — List imported loan accounts */
const getLoanAccounts = async (req, res, next) => {
  try {
    const result = await bankPortfolioService.getLoanAccounts(req.query, req.query);
    return success(res, { message: 'Loan accounts retrieved', data: result.accounts, meta: result.meta });
  } catch (err) { next(err); }
};

/** GET /bank/loan-accounts/:accountId — Single loan account detail */
const getLoanAccountDetail = async (req, res, next) => {
  try {
    const result = await bankPortfolioService.getLoanAccountDetail(parseInt(req.params.accountId, 10));
    return success(res, { message: 'Loan account detail retrieved', data: result });
  } catch (err) { next(err); }
};

/** POST /bank/loan-accounts/:accountId/link — Link to FarmerPay farmer */
const linkToFarmer = async (req, res, next) => {
  try {
    const result = await bankPortfolioService.linkToFarmer(
      parseInt(req.params.accountId, 10), req.body.farmerId
    );
    return success(res, { message: 'Loan account linked to farmer', data: result });
  } catch (err) { next(err); }
};

/** POST /bank/loan-accounts/:accountId/data-entry — Manual data entry */
const addDataEntry = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const result = await bankPortfolioService.addDataEntry(
      parseInt(req.params.accountId, 10), userId, req.body
    );
    return success(res, { message: 'Data entry recorded', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

/** POST /bank/loan-accounts/manual — Manual single loan account entry */
const manualLoanEntry = async (req, res, next) => {
  try {
    const { BankLoanAccount } = require('../../../shared/models');
    const account = await BankLoanAccount.create({
      account_uuid: uuidv4(),
      finacle_account_number: req.body.finacleAccountNumber,
      borrower_name: req.body.borrowerName,
      borrower_mobile: req.body.borrowerMobile || null,
      borrower_pan: req.body.borrowerPan || null,
      loan_type: req.body.loanType,
      sanction_amount: req.body.sanctionAmount,
      sanction_date: req.body.sanctionDate || null,
      interest_rate: req.body.interestRate || null,
      maturity_date: req.body.maturityDate || null,
      repayment_type: req.body.repaymentType,
      outstanding_amount: req.body.outstandingAmount,
      days_past_due: req.body.daysPassDue || 0,
      gold_weight_grams: req.body.goldWeightGrams || null,
      gold_purity_carat: req.body.goldPurityCarat || null,
      gold_valuation_amount: req.body.goldValuationAmount || null,
      sma_classification: req.body.smaClassification || 'standard',
      psl_category: req.body.pslCategory || null,
      disbursement_mode: req.body.disbursementMode || null,
    });
    return success(res, { message: 'Loan account created', data: { accountId: account.id }, statusCode: 201 });
  } catch (err) { next(err); }
};

/**
 * POST /bank/portfolio/bulk-import — May 2026 pilot
 *
 * Accepts a 3-tab xlsx workbook (Loans / Schedules / Payments) from a
 * pilot bank partner and starts a transactional import in the background.
 * Returns the import_uuid immediately so the admin UI can poll for status.
 */
const bulkImport = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    if (!req.file) {
      const err = new Error('No file uploaded. Please upload a 3-tab .xlsx workbook.');
      err.statusCode = 400;
      throw err;
    }
    const result = await bankPortfolioBulkService.kickoffBulkImport(userId, req.file, {
      bankName: req.body.bankName || null,
      branchCode: req.body.branchCode || null,
      district: req.body.district || null,
      dataAsOfDate: req.body.dataAsOfDate || null,
      defaultCohortTag: req.body.defaultCohortTag || null,
    });
    return success(res, {
      message: 'Bulk import started. Poll /bank/portfolio/bulk-import/:importUuid for status.',
      data: result,
      statusCode: 202,
    });
  } catch (err) { next(err); }
};

/** GET /bank/portfolio/bulk-import/:importUuid — poll for status */
const getBulkImportStatus = async (req, res, next) => {
  try {
    const requesterId = await resolveUserId(req);
    const result = await bankPortfolioBulkService.getImportStatus(req.params.importUuid, {
      requesterId,
      requesterRole: req.user?.role,
    });
    return success(res, { message: 'Import status retrieved', data: result });
  } catch (err) { next(err); }
};

module.exports = {
  importPortfolio, getImportHistory, getLoanAccounts,
  getLoanAccountDetail, linkToFarmer, addDataEntry, manualLoanEntry,
  bulkImport, getBulkImportStatus,
};
