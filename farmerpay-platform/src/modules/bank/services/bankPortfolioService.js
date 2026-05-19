/**
 * Bank Portfolio Service
 * CSV import processing, loan account management, farmer auto-matching.
 */

const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const Joi = require('joi');
const logger = require('../../../shared/utils/logger');
const { parseCSV, validateColumns } = require('../../../shared/utils/csvParser');
const { parseXlsx, isXlsxFile } = require('../../../shared/utils/xlsxParser');
const { parsePagination, buildMeta } = require('../../../shared/utils/paginationHelper');

const csvRowSchema = Joi.object({
  account_number: Joi.string().required().min(5).max(30),
  borrower_name: Joi.string().required().max(255),
  pan: Joi.string().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).allow(null, '').optional(),
  borrower_pan: Joi.string().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).allow(null, '').optional(),
  mobile: Joi.string().pattern(/^(\+91)?[6-9]\d{9}$/).allow(null, '').optional(),
  borrower_mobile: Joi.string().pattern(/^(\+91)?[6-9]\d{9}$/).allow(null, '').optional(),
  sanction_amount: Joi.number().positive().allow(null).optional(),
  outstanding_amount: Joi.number().min(0).allow(null).optional(),
  overdue_amount: Joi.number().min(0).allow(null).optional(),
  interest_rate: Joi.number().min(0).max(100).allow(null).optional(),
}).unknown(true);  // Allow other CSV columns to pass through

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

const REQUIRED_CSV_COLUMNS = [
  'account_number', 'borrower_name', 'sanction_amount', 'outstanding_amount',
];

/**
 * Processes a CSV or Excel file upload of bank loan portfolio data.
 *
 * Originally built for Finacle gold-loan CSVs; now also accepts Excel
 * workbooks for the May 2026 pilot where banks supply KCC / crop /
 * dairy / horti / animal-husbandry loan data with cohort tags.
 *
 * Detects file type via mimetype or extension and routes to the correct
 * parser — both parsers expose the same `{ headers, rows, rowCount }`
 * contract so the downstream mapping logic is unchanged.
 */
const MAX_IMPORT_BYTES = 10 * 1024 * 1024; // 10 MB — must match multer config

const importPortfolio = async (userId, file, metadata) => {
  const { BankPortfolioImport, BankLoanAccount, sequelize } = getDb();

  // Defense-in-depth file size check. Multer is expected to reject >10MB
  // at upload time, but if the middleware is bypassed or misconfigured,
  // the parser below would happily load an arbitrarily large buffer into
  // memory and DoS the node process. Validate before parsing.
  const size = file?.buffer?.length || file?.size || 0;
  if (size > MAX_IMPORT_BYTES) {
    const err = new Error(`Import file too large: ${size} bytes (max ${MAX_IMPORT_BYTES})`);
    err.statusCode = 413;
    err.errorCode = 'VAL_FILE_TOO_LARGE';
    throw err;
  }

  // Parse CSV or xlsx based on upload type
  const useXlsx = isXlsxFile(file);
  const { headers, rows, rowCount } = useXlsx
    ? parseXlsx(file.buffer)
    : parseCSV(file.buffer);

  // Validate required columns
  const columnCheck = validateColumns(headers, REQUIRED_CSV_COLUMNS);
  if (!columnCheck.valid) {
    const err = new Error(`Missing required columns: ${columnCheck.missing.join(', ')}`);
    err.statusCode = 400;
    err.errorCode = 'VAL_001';
    throw err;
  }

  // Create import record
  const importRecord = await BankPortfolioImport.create({
    import_uuid: uuidv4(),
    uploaded_by: userId,
    file_name: file.originalname,
    file_type: useXlsx ? 'xlsx' : 'csv',
    bank_name: metadata.bankName || null,
    branch_code: metadata.branchCode || null,
    total_rows: rowCount,
    import_status: 'processing',
  });

  let importedCount = 0;
  let failedCount = 0;
  const errors = [];

  const transaction = await sequelize.transaction();
  try {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Validate row data before inserting
      const { error: rowError } = csvRowSchema.validate(row, { abortEarly: false });
      if (rowError) {
        failedCount++;
        errors.push({ row: i + 2, error: rowError.details.map(d => d.message).join('; '), data: row.account_number });
        continue;
      }

      try {
        // Pilot: cohort tag comes from the Excel / CSV directly. Normalize
        // to one of {test, control, unassigned}. Fall back to the upload's
        // default cohort tag from metadata if the row doesn't specify.
        const rawCohort = (row.cohort_tag || metadata.defaultCohortTag || '').toLowerCase();
        const cohortTag =
          rawCohort === 'test' || rawCohort === 'control' ? rawCohort : 'unassigned';

        await BankLoanAccount.create({
          account_uuid: uuidv4(),
          import_id: importRecord.id,
          finacle_account_number: row.account_number,
          finacle_cif_id: row.cif_id || null,
          sol_id: row.sol_id || row.branch_code || null,
          borrower_name: row.borrower_name,
          borrower_pan: row.pan || row.borrower_pan || null,
          borrower_mobile: row.mobile || row.borrower_mobile || null,
          borrower_aadhaar_last4: row.aadhaar_last4 || row.borrower_aadhaar_last4 || null,
          loan_type: mapLoanType(row.loan_type || row.product_type),
          scheme_name: row.scheme_name || row.scheme || null,
          scheme_code: row.scheme_code || null,
          sanction_amount: parseFloat(row.sanction_amount) || null,
          sanction_date: row.sanction_date || null,
          interest_rate: parseFloat(row.interest_rate) || null,
          maturity_date: row.maturity_date || null,
          repayment_type: row.repayment_type === 'BULLET' ? 'bullet' : 'emi',
          outstanding_amount: parseFloat(row.outstanding_amount) || null,
          overdue_amount: parseFloat(row.overdue_amount) || 0,
          days_past_due: parseInt(row.dpd || row.days_past_due) || 0,
          gold_weight_grams: parseFloat(row.gold_weight || row.gold_weight_grams) || null,
          gold_purity_carat: parseFloat(row.gold_purity || row.purity_carat) || null,
          gold_valuation_amount: parseFloat(row.gold_value || row.valuation_amount) || null,
          gold_valuation_date: row.valuation_date || null,
          ltv_at_sanction: parseFloat(row.ltv) || null,
          sma_classification: mapSmaClass(row.sma || row.sma_classification || row.asset_classification),
          psl_category: row.psl_category || null,
          disbursement_mode: row.disbursement_mode || null,
          cash_disbursement_amount: parseFloat(row.cash_amount) || null,
          // Pilot geography + cohort columns
          district: row.district || metadata.district || null,
          lgd_district_code: row.lgd_district_code || null,
          cohort_tag: cohortTag,
          cohort_assigned_at: cohortTag !== 'unassigned' ? new Date() : null,
          data_as_of_date: row.data_date || row.as_of_date || null,
        }, { transaction });
        importedCount++;
      } catch (rowErr) {
        failedCount++;
        errors.push({ row: i + 2, error: rowErr.message, data: row.account_number });
      }
    }

    if (failedCount > 0 && importedCount === 0) {
      await transaction.rollback();
    } else {
      await transaction.commit();
    }
  } catch (err) {
    await transaction.rollback();
    throw err;
  }

  // Update import record
  const status = failedCount === 0 ? 'completed' : importedCount === 0 ? 'failed' : 'partial';
  await importRecord.update({
    imported_rows: importedCount,
    failed_rows: failedCount,
    import_status: status,
    error_log: errors.length > 0 ? errors : null,
    import_completed_at: new Date(),
  });

  // Auto-match farmers by mobile/PAN
  const matchCount = await autoMatchFarmers(importRecord.id);

  logger.info(`Portfolio import ${importRecord.import_uuid}: ${importedCount} imported, ${failedCount} failed, ${matchCount} auto-matched`);

  return {
    importId: importRecord.id,
    importUuid: importRecord.import_uuid,
    totalRows: rowCount,
    imported: importedCount,
    failed: failedCount,
    autoMatched: matchCount,
    status,
    errors: errors.slice(0, 10),
  };
};

/**
 * Auto-matches imported bank accounts to FarmerPay farmers by mobile or PAN.
 */
const autoMatchFarmers = async (importId) => {
  const { BankLoanAccount, User } = getDb();

  const unlinked = await BankLoanAccount.findAll({
    where: { import_id: importId, linkage_status: 'unlinked', is_active: true },
  });

  let matched = 0;

  for (const account of unlinked) {
    let farmer = null;

    if (account.borrower_mobile) {
      farmer = await User.findOne({ where: { mobile: account.borrower_mobile, is_active: true } });
    }

    if (farmer) {
      await account.update({
        linked_farmer_id: farmer.id,
        linkage_status: 'auto_matched',
      });
      matched++;
    }
  }

  return matched;
};

/**
 * Returns a response-safe version of a BankLoanAccount record. PAN,
 * Aadhaar last-4, mobile, and the Finacle account number are sensitive
 * under BANK_SECURITY_DOCUMENTATION §7.3 and must never leave the server
 * in raw form — even to a banker role.
 */
const maskBankAccount = (record) => {
  if (!record) return record;
  const plain = typeof record.toJSON === 'function' ? record.toJSON() : { ...record };

  const maskTail = (val, keep = 4) => {
    if (!val) return val;
    const s = String(val);
    if (s.length <= keep) return '*'.repeat(s.length);
    return '*'.repeat(s.length - keep) + s.slice(-keep);
  };

  if (plain.finacle_account_number) plain.finacle_account_number = maskTail(plain.finacle_account_number, 4);
  if (plain.borrower_mobile) plain.borrower_mobile = maskTail(plain.borrower_mobile, 4);
  if (plain.borrower_pan) plain.borrower_pan = maskTail(plain.borrower_pan, 4);
  // aadhaar_last4 is already only the last 4 digits but redundant to ship.
  if (plain.borrower_aadhaar_last4) plain.borrower_aadhaar_last4 = maskTail(plain.borrower_aadhaar_last4, 2);
  return plain;
};

/**
 * Gets imported loan accounts with pagination and filtering.
 */
const getLoanAccounts = async (filters = {}, query = {}) => {
  const { BankLoanAccount } = getDb();
  const { page, limit, offset } = parsePagination(query);

  const where = { is_active: true };
  if (filters.smaClassification) where.sma_classification = filters.smaClassification;
  if (filters.loanType) where.loan_type = filters.loanType;
  if (filters.linkageStatus) where.linkage_status = filters.linkageStatus;
  if (filters.branchCode) where.sol_id = filters.branchCode;

  const { count, rows } = await BankLoanAccount.findAndCountAll({
    where, limit, offset,
    order: [['days_past_due', 'DESC']],
  });

  return { accounts: rows.map(maskBankAccount), meta: buildMeta(page, limit, count) };
};

/**
 * Gets a single loan account detail.
 */
const getLoanAccountDetail = async (accountId) => {
  const { BankLoanAccount, BankDataEntry } = getDb();

  const account = await BankLoanAccount.findOne({
    where: { id: accountId, is_active: true },
    include: [
      { model: BankDataEntry, as: 'dataEntries', where: { is_active: true }, required: false,
        order: [['created_at', 'DESC']], limit: 20 },
    ],
  });

  if (!account) {
    const err = new Error('Loan account not found');
    err.statusCode = 404;
    throw err;
  }

  return maskBankAccount(account);
};

/**
 * Manually links a bank loan account to a FarmerPay farmer.
 */
const linkToFarmer = async (accountId, farmerId) => {
  const { BankLoanAccount, User } = getDb();

  const account = await BankLoanAccount.findOne({ where: { id: accountId, is_active: true } });
  if (!account) { const err = new Error('Loan account not found'); err.statusCode = 404; throw err; }

  const farmer = await User.findOne({ where: { id: farmerId, is_active: true } });
  if (!farmer) { const err = new Error('Farmer not found'); err.statusCode = 404; throw err; }

  await account.update({ linked_farmer_id: farmerId, linkage_status: 'manually_linked' });

  logger.info(`Bank account ${accountId} linked to farmer ${farmerId}`);
  return { accountId, farmerId, linkageStatus: 'manually_linked' };
};

/**
 * Records a manual data entry for a loan account.
 */
const addDataEntry = async (accountId, userId, data) => {
  const { BankDataEntry } = getDb();

  const entry = await BankDataEntry.create({
    entry_uuid: uuidv4(),
    loan_account_id: accountId,
    entered_by: userId,
    entry_type: data.entryType,
    entry_data: data.entryData,
    entry_notes: data.notes || null,
  });

  return { entryId: entry.id };
};

/**
 * Gets import history.
 */
const getImportHistory = async (userId) => {
  const { BankPortfolioImport } = getDb();

  return BankPortfolioImport.findAll({
    where: { uploaded_by: userId, is_active: true },
    order: [['created_at', 'DESC']],
    limit: 20,
  });
};

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Maps a free-text loan type from a bank upload into our enum. Handles
 * the original gold-loan buckets (Finacle extract) AND the expanded
 * pilot loan types (KCC / crop / dairy / horti / animal husbandry /
 * fisheries / input / JLG / SHG). Matching is forgiving — a single
 * keyword anywhere in the raw text is enough.
 *
 * Order matters: more-specific matches first (kcc_gold before gold,
 * dairy before livestock, fisheries before animal husbandry).
 */
const mapLoanType = (raw) => {
  if (!raw) return null;
  const lower = String(raw).toLowerCase();

  // Gold-loan family first (backward-compat with Finacle imports)
  if (lower.includes('gold')) {
    if (lower.includes('kcc')) return 'kcc_gold';
    if (lower.includes('agri')) return 'agri_gold';
    if (lower.includes('allied')) return 'allied_gold';
    return 'consumption_gold';
  }

  // Non-gold pilot loan types
  if (lower.includes('kcc')) return 'kcc';
  if (lower.includes('dairy')) return 'dairy_loan';
  if (lower.includes('fisher') || lower.includes('aqua')) return 'fisheries_loan';
  if (lower.includes('poultry') || lower.includes('livestock') || lower.includes('animal')) {
    return lower.includes('poultry') ? 'animal_husbandry_loan' : 'livestock_loan';
  }
  if (lower.includes('horti') || lower.includes('fruit') || lower.includes('veg')) {
    return 'horticulture_loan';
  }
  if (lower.includes('input') || lower.includes('seed') || lower.includes('fertil')) {
    return 'input_loan';
  }
  if (lower.includes('crop')) return 'crop_loan';
  if (lower.includes('jlg')) return 'jlg';
  if (lower.includes('shg')) return 'shg';

  // Fallback — unknown, leave null so we don't silently misclassify
  return null;
};

const mapSmaClass = (raw) => {
  if (!raw) return 'standard';
  const lower = raw.toLowerCase();
  if (lower.includes('npa')) return 'npa';
  if (lower.includes('sma-2') || lower.includes('sma_2')) return 'sma_2';
  if (lower.includes('sma-1') || lower.includes('sma_1')) return 'sma_1';
  if (lower.includes('sma-0') || lower.includes('sma_0')) return 'sma_0';
  return 'standard';
};

module.exports = {
  importPortfolio, getLoanAccounts, getLoanAccountDetail,
  linkToFarmer, addDataEntry, getImportHistory,
};
