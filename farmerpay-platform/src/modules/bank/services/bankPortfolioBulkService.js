/**
 * Bank Portfolio Bulk Service — May 2026 pilot
 *
 * Ingests a 3-tab Excel workbook supplied by a pilot bank partner:
 *   Tab 1: Loans     → creates/updates bank_loan_accounts rows
 *   Tab 2: Schedules → creates loan_repayment_schedules rows
 *                      FK'd to the imported bank_loan_accounts row
 *   Tab 3: Payments  → creates loan_repayments rows
 *                      FK'd to the imported bank_loan_accounts row
 *
 * The entire workbook imports inside a single transaction — any validation
 * failure rolls everything back. Error details are persisted in
 * bank_portfolio_imports.error_log so the bank-ops uploader can see
 * exactly what needs fixing before re-uploading.
 *
 * The Loans tab upserts on finacle_account_number so the same workbook
 * can be re-sent weekly without creating duplicates.
 *
 * Designed for async (fire-and-forget) processing — the controller
 * returns the import_uuid immediately and this service runs via
 * setImmediate. Status polling is via GET /bank/portfolio/bulk-import/:uuid.
 */

const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');
const { parseXlsxWorkbook, isXlsxFile } = require('../../../shared/utils/xlsxParser');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

// ─── Loan-type + SMA mapping (shared with bankPortfolioService) ────
// Re-declaring here so the bulk service doesn't depend on a non-exported
// helper. Keep these two in sync with bankPortfolioService.js until we
// extract them to a shared helper module.

const mapLoanType = (raw) => {
  if (!raw) return null;
  const lower = String(raw).toLowerCase();

  if (lower.includes('gold')) {
    if (lower.includes('kcc')) return 'kcc_gold';
    if (lower.includes('agri')) return 'agri_gold';
    if (lower.includes('allied')) return 'allied_gold';
    return 'consumption_gold';
  }

  if (lower.includes('kcc')) return 'kcc';
  if (lower.includes('dairy')) return 'dairy_loan';
  if (lower.includes('fisher') || lower.includes('aqua')) return 'fisheries_loan';
  if (lower.includes('poultry')) return 'animal_husbandry_loan';
  if (lower.includes('livestock') || lower.includes('animal')) return 'livestock_loan';
  if (lower.includes('horti') || lower.includes('fruit') || lower.includes('veg')) {
    return 'horticulture_loan';
  }
  if (lower.includes('input') || lower.includes('seed') || lower.includes('fertil')) {
    return 'input_loan';
  }
  if (lower.includes('crop')) return 'crop_loan';
  if (lower.includes('jlg')) return 'jlg';
  if (lower.includes('shg')) return 'shg';

  return null;
};

const mapSmaClass = (raw) => {
  if (!raw) return 'standard';
  const lower = String(raw).toLowerCase();
  if (lower.includes('npa')) return 'npa';
  if (lower.includes('sma-2') || lower.includes('sma_2')) return 'sma_2';
  if (lower.includes('sma-1') || lower.includes('sma_1')) return 'sma_1';
  if (lower.includes('sma-0') || lower.includes('sma_0')) return 'sma_0';
  return 'standard';
};

const normalizeCohort = (raw) => {
  const lower = (raw || '').toLowerCase();
  return lower === 'test' || lower === 'control' ? lower : 'unassigned';
};

const parseNum = (v) => {
  if (v == null || v === '') return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
};

const parseInt10 = (v) => {
  if (v == null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
};

const parseDate = (v) => {
  if (!v) return null;
  // xlsxParser normalizes dates to YYYY-MM-DD strings, but accept ISO too
  return String(v).slice(0, 10);
};

// ─── Required column validation ────────────────────────────────────

const REQUIRED_LOAN_COLS = [
  'account_number', 'borrower_name', 'loan_type',
  'sanction_amount', 'outstanding_amount',
  'district', 'cohort_tag', 'data_as_of_date',
];

const REQUIRED_SCHEDULE_COLS = [
  'account_number', 'installment_number', 'due_date', 'due_amount',
];

const REQUIRED_PAYMENT_COLS = [
  'account_number', 'payment_date', 'amount',
];

const validateColumns = (headers, required) => {
  const missing = required.filter((c) => !headers.includes(c));
  return { valid: missing.length === 0, missing };
};

// ─── Main entry point ─────────────────────────────────────────────

/**
 * Synchronously kicks off the import and returns the BankPortfolioImport
 * record immediately with status = 'processing'. The actual row processing
 * runs via setImmediate so the HTTP request returns fast.
 *
 * @param {number} userId - admin user who uploaded the file
 * @param {Object} file - multer file object (buffer + originalname + mimetype)
 * @param {Object} metadata - { bankName, branchCode, district, dataAsOfDate, defaultCohortTag }
 * @returns {Promise<{importUuid, importId, status}>}
 */
const MAX_BULK_BYTES = 10 * 1024 * 1024;

const kickoffBulkImport = async (userId, file, metadata) => {
  const { BankPortfolioImport } = getDb();

  if (!isXlsxFile(file)) {
    const err = new Error('Bulk import requires an .xlsx file');
    err.statusCode = 400;
    err.errorCode = 'VAL_001';
    throw err;
  }

  const size = file?.buffer?.length || file?.size || 0;
  if (size > MAX_BULK_BYTES) {
    const err = new Error(`Bulk import file too large: ${size} bytes (max ${MAX_BULK_BYTES})`);
    err.statusCode = 413;
    err.errorCode = 'VAL_FILE_TOO_LARGE';
    throw err;
  }

  // Idempotency: hash the file bytes + metadata and short-circuit if we've
  // already ingested the same payload in the last 24h. Prevents double
  // imports from accidental reuploads, and gives a stable handle for
  // retries of failed jobs without duplicating rows.
  const crypto = require('crypto');
  const payloadHash = crypto
    .createHash('sha256')
    .update(file.buffer)
    .update(`|${metadata.bankName || ''}|${metadata.branchCode || ''}|${metadata.dataAsOfDate || ''}`)
    .digest('hex');

  const recent = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { Op } = require('sequelize');
  const prior = await BankPortfolioImport.findOne({
    where: { payload_hash: payloadHash, created_at: { [Op.gte]: recent } },
    order: [['created_at', 'DESC']],
  });
  if (prior) {
    logger.info(`Bulk import replay (hash=${payloadHash.slice(0, 12)}); returning prior import ${prior.import_uuid}`);
    return {
      importUuid: prior.import_uuid,
      importId: prior.id,
      status: prior.import_status,
      replayed: true,
    };
  }

  const importRecord = await BankPortfolioImport.create({
    import_uuid: uuidv4(),
    uploaded_by: userId,
    file_name: file.originalname,
    file_type: 'xlsx',
    bank_name: metadata.bankName || null,
    branch_code: metadata.branchCode || null,
    total_rows: 0,
    import_status: 'processing',
    payload_hash: payloadHash,
  });

  // Fire and forget — processWorkbook handles its own errors and updates
  // the import record's status column. Any unhandled crash marks the
  // record 'failed' so it doesn't stick in 'processing' forever; without
  // this the status-poll endpoint would never report a useful terminal
  // state after a crash.
  setImmediate(() => {
    processWorkbook(importRecord.id, file.buffer, metadata).catch(async (err) => {
      logger.error(`Bulk import ${importRecord.import_uuid} crashed: ${err.message}`);
      try {
        await importRecord.update({
          import_status: 'failed',
          error_log: [{ error: 'unhandled_crash', message: err.message }],
        });
      } catch (saveErr) {
        logger.error(`Failed to mark import ${importRecord.import_uuid} as failed: ${saveErr.message}`);
      }
    });
  });

  return {
    importUuid: importRecord.import_uuid,
    importId: importRecord.id,
    status: 'processing',
  };
};

/**
 * Processes the workbook buffer inside a single sequelize transaction.
 * On any validation failure, rolls back everything and writes the error
 * list to BankPortfolioImport.error_log.
 */
const processWorkbook = async (importId, buffer, metadata) => {
  const db = getDb();
  const { sequelize, BankPortfolioImport, BankLoanAccount, LoanRepaymentSchedule, LoanRepayment } = db;

  const parsed = parseXlsxWorkbook(buffer, ['Loans', 'Schedules', 'Payments']);
  const loansTab = parsed.Loans;
  const schedulesTab = parsed.Schedules;
  const paymentsTab = parsed.Payments;

  const errors = [];
  const totalRows =
    (loansTab?.rowCount || 0) + (schedulesTab?.rowCount || 0) + (paymentsTab?.rowCount || 0);

  // Validate required columns on each non-empty tab
  if (loansTab.rowCount > 0) {
    const c = validateColumns(loansTab.headers, REQUIRED_LOAN_COLS);
    if (!c.valid) errors.push({ tab: 'Loans', error: `Missing columns: ${c.missing.join(', ')}` });
  } else {
    errors.push({ tab: 'Loans', error: 'Loans tab is empty — at least one loan row is required' });
  }
  if (schedulesTab.rowCount > 0) {
    const c = validateColumns(schedulesTab.headers, REQUIRED_SCHEDULE_COLS);
    if (!c.valid) errors.push({ tab: 'Schedules', error: `Missing columns: ${c.missing.join(', ')}` });
  }
  if (paymentsTab.rowCount > 0) {
    const c = validateColumns(paymentsTab.headers, REQUIRED_PAYMENT_COLS);
    if (!c.valid) errors.push({ tab: 'Payments', error: `Missing columns: ${c.missing.join(', ')}` });
  }

  if (errors.length > 0) {
    await BankPortfolioImport.update(
      {
        total_rows: totalRows,
        imported_rows: 0,
        failed_rows: totalRows,
        import_status: 'failed',
        error_log: errors,
        import_completed_at: new Date(),
      },
      { where: { id: importId } }
    );
    logger.warn(`Bulk import ${importId} failed validation: ${errors.map((e) => e.error).join('; ')}`);
    return;
  }

  // ─── Transactional ingest ────────────────────────────────────
  const counters = { loans: 0, schedules: 0, payments: 0, loansUpdated: 0, autoMatched: 0 };
  const rowErrors = [];

  try {
    await sequelize.transaction(async (t) => {
      // ── Tab 1: Loans ──
      // Map account_number → BankLoanAccount.id for the subsequent tabs
      const accountIdByNumber = {};

      for (let i = 0; i < loansTab.rows.length; i++) {
        const row = loansTab.rows[i];
        try {
          const cohort = normalizeCohort(row.cohort_tag);
          const loanType = mapLoanType(row.loan_type);
          if (!loanType) {
            throw new Error(`Unknown loan_type: "${row.loan_type}"`);
          }
          if (!row.district) {
            throw new Error('district is required');
          }

          const payload = {
            import_id: importId,
            finacle_account_number: String(row.account_number).trim(),
            finacle_cif_id: row.cif_id || null,
            sol_id: row.sol_id || row.branch_code || metadata.branchCode || null,
            borrower_name: row.borrower_name,
            borrower_pan: row.borrower_pan || row.pan || null,
            borrower_mobile: row.borrower_mobile || row.mobile || null,
            borrower_aadhaar_last4: row.borrower_aadhaar_last4 || row.aadhaar_last4 || null,
            loan_type: loanType,
            scheme_name: row.scheme_name || row.scheme || null,
            scheme_code: row.scheme_code || null,
            sanction_amount: parseNum(row.sanction_amount),
            sanction_date: parseDate(row.sanction_date),
            interest_rate: parseNum(row.interest_rate),
            maturity_date: parseDate(row.maturity_date),
            repayment_type:
              row.repayment_type && String(row.repayment_type).toLowerCase() === 'bullet'
                ? 'bullet'
                : 'emi',
            outstanding_amount: parseNum(row.outstanding_amount),
            overdue_amount: parseNum(row.overdue_amount) || 0,
            days_past_due: parseInt10(row.dpd || row.days_past_due) || 0,
            sma_classification: mapSmaClass(row.sma_classification || row.sma),
            district: row.district,
            lgd_district_code: row.lgd_district_code || null,
            cohort_tag: cohort,
            cohort_assigned_at: cohort !== 'unassigned' ? new Date() : null,
            data_as_of_date: parseDate(row.data_as_of_date) || parseDate(metadata.dataAsOfDate),
          };

          // Upsert on (bank_name, finacle_account_number)
          // — bank_name comes from the parent import record
          const existing = await BankLoanAccount.findOne({
            where: { finacle_account_number: payload.finacle_account_number },
            include: [{
              association: 'import',
              required: true,
              where: { bank_name: metadata.bankName || null },
            }],
            transaction: t,
          });

          let row_id;
          if (existing) {
            // Refresh the mutable fields — don't touch account_uuid or
            // the original import_id so we preserve first-seen audit trail
            await existing.update(
              {
                borrower_mobile: payload.borrower_mobile || existing.borrower_mobile,
                borrower_aadhaar_last4: payload.borrower_aadhaar_last4 || existing.borrower_aadhaar_last4,
                outstanding_amount: payload.outstanding_amount,
                overdue_amount: payload.overdue_amount,
                days_past_due: payload.days_past_due,
                sma_classification: payload.sma_classification,
                cohort_tag: payload.cohort_tag,
                cohort_assigned_at: payload.cohort_assigned_at,
                data_as_of_date: payload.data_as_of_date,
              },
              { transaction: t }
            );
            row_id = existing.id;
            counters.loansUpdated += 1;
          } else {
            const created = await BankLoanAccount.create(
              { account_uuid: uuidv4(), ...payload },
              { transaction: t }
            );
            row_id = created.id;
            counters.loans += 1;
          }

          accountIdByNumber[payload.finacle_account_number] = row_id;
        } catch (err) {
          rowErrors.push({ tab: 'Loans', row: i + 2, account: row.account_number, error: err.message });
          // Throw so the transaction rolls back — one bad row kills the upload
          throw err;
        }
      }

      // ── Auto-match farmers by mobile (WS6.1) ──
      // For every just-imported or just-updated BankLoanAccount in this
      // workbook, look up the farmer `users` row by exact mobile match. If
      // found, stamp linked_farmer_id + linkage_status = 'auto_matched'.
      // This is how a bank upload immediately surfaces the loan in the
      // farmer-app for farmers who already have an app account — the
      // engagement loop for the test cohort depends on this step.
      //
      // Runs inside the same transaction as the loan inserts so a failure
      // rolls back both the loans and the linkage attempts.
      const touchedAccountIds = Object.values(accountIdByNumber).filter(Boolean);
      if (touchedAccountIds.length > 0) {
        const bankAccounts = await BankLoanAccount.findAll({
          where: { id: touchedAccountIds },
          attributes: ['id', 'borrower_mobile', 'linkage_status', 'linked_farmer_id'],
          transaction: t,
        });
        // Collect distinct mobiles worth looking up (exclude null/empty
        // and already-linked rows — we don't re-link if the bank has
        // already tied this account to a different farmer)
        const mobilesToLookup = [...new Set(
          bankAccounts
            .filter((a) => a.borrower_mobile && !a.linked_farmer_id)
            .map((a) => a.borrower_mobile)
        )];
        if (mobilesToLookup.length > 0) {
          const { User } = getDb();
          const farmers = await User.findAll({
            where: { mobile: mobilesToLookup, is_active: true },
            attributes: ['id', 'mobile'],
            transaction: t,
          });
          const farmerIdByMobile = {};
          for (const f of farmers) farmerIdByMobile[f.mobile] = f.id;

          for (const account of bankAccounts) {
            if (account.linked_farmer_id) continue;
            const farmerId = farmerIdByMobile[account.borrower_mobile];
            if (!farmerId) continue;
            await account.update(
              {
                linked_farmer_id: farmerId,
                linkage_status: 'auto_matched',
              },
              { transaction: t }
            );
            counters.autoMatched += 1;
          }
        }
      }

      // ── Tab 2: Schedules ──
      // Idempotent behavior: if the tab includes any schedules for an
      // account, replace ALL prior schedules for that account with the
      // new set (DELETE + INSERT). This matches the operational model
      // where the bank sends the full schedule for each account in every
      // upload. Accounts NOT mentioned in tab 2 keep their existing rows.
      if (schedulesTab.rowCount > 0) {
        const schedulesByAccount = new Map();
        for (let i = 0; i < schedulesTab.rows.length; i++) {
          const row = schedulesTab.rows[i];
          try {
            const accountNumber = String(row.account_number).trim();
            if (!(accountNumber in accountIdByNumber)) {
              const existing = await BankLoanAccount.findOne({
                where: { finacle_account_number: accountNumber },
                transaction: t,
              });
              if (!existing) {
                throw new Error(`Schedule references unknown account_number ${accountNumber}`);
              }
              accountIdByNumber[accountNumber] = existing.id;
            }
            const statusRaw = String(row.status || 'pending').toLowerCase();
            const status = ['pending', 'paid', 'overdue', 'forgiven'].includes(statusRaw)
              ? statusRaw
              : 'pending';
            const payload = {
              bank_loan_account_id: accountIdByNumber[accountNumber],
              schedule_number: parseInt10(row.installment_number),
              due_date: parseDate(row.due_date),
              due_amount: parseNum(row.due_amount),
              principal_amount: parseNum(row.principal_amount),
              interest_amount: parseNum(row.interest_amount),
              status,
              is_paid: status === 'paid',
            };
            const key = accountIdByNumber[accountNumber];
            if (!schedulesByAccount.has(key)) schedulesByAccount.set(key, []);
            schedulesByAccount.get(key).push(payload);
          } catch (err) {
            rowErrors.push({ tab: 'Schedules', row: i + 2, account: row.account_number, error: err.message });
            throw err;
          }
        }
        // Delete prior schedules for each account mentioned in this upload
        const touchedAccountIds = Array.from(schedulesByAccount.keys());
        if (touchedAccountIds.length > 0) {
          await LoanRepaymentSchedule.destroy({
            where: { bank_loan_account_id: touchedAccountIds },
            transaction: t,
          });
        }
        // Insert the new rows
        const flattened = [].concat(...schedulesByAccount.values());
        if (flattened.length > 0) {
          await LoanRepaymentSchedule.bulkCreate(flattened, { transaction: t });
          counters.schedules = flattened.length;
        }
      }

      // ── Tab 3: Payments ──
      // Idempotent behavior: dedupe on (bank_loan_account_id,
      // repayment_date, utr_reference). If a payment with the same
      // dedup key already exists, skip. This lets banks re-send the
      // same workbook without duplicating payment history.
      if (paymentsTab.rowCount > 0) {
        const candidateRows = [];
        for (let i = 0; i < paymentsTab.rows.length; i++) {
          const row = paymentsTab.rows[i];
          try {
            const accountNumber = String(row.account_number).trim();
            if (!(accountNumber in accountIdByNumber)) {
              const existing = await BankLoanAccount.findOne({
                where: { finacle_account_number: accountNumber },
                transaction: t,
              });
              if (!existing) {
                throw new Error(`Payment references unknown account_number ${accountNumber}`);
              }
              accountIdByNumber[accountNumber] = existing.id;
            }
            const modeRaw = String(row.mode || 'bank_transfer').toLowerCase();
            const mode = ['bank_transfer', 'cash', 'check', 'digital_wallet'].includes(modeRaw)
              ? modeRaw
              : 'bank_transfer';
            candidateRows.push({
              repayment_uuid: uuidv4(),
              bank_loan_account_id: accountIdByNumber[accountNumber],
              schedule_id: null,
              repayment_date: parseDate(row.payment_date),
              repayment_amount: parseNum(row.amount),
              payment_method: mode,
              utr_reference: row.utr_reference || null,
            });
          } catch (err) {
            rowErrors.push({ tab: 'Payments', row: i + 2, account: row.account_number, error: err.message });
            throw err;
          }
        }

        if (candidateRows.length > 0) {
          // Dedupe against existing rows by (bank_loan_account_id,
          // repayment_date, utr_reference). We scope the lookup to just
          // the account_ids in this upload to keep it fast.
          const touchedIds = [...new Set(candidateRows.map((r) => r.bank_loan_account_id))];
          const existing = await LoanRepayment.findAll({
            where: { bank_loan_account_id: touchedIds },
            attributes: ['bank_loan_account_id', 'repayment_date', 'utr_reference'],
            transaction: t,
          });
          const dedupKey = (r) =>
            `${r.bank_loan_account_id}::${r.repayment_date}::${r.utr_reference || ''}`;
          const existingKeys = new Set(existing.map(dedupKey));
          const toInsert = candidateRows.filter((r) => !existingKeys.has(dedupKey(r)));
          if (toInsert.length > 0) {
            await LoanRepayment.bulkCreate(toInsert, { transaction: t });
            counters.payments = toInsert.length;
          }
        }
      }
    });

    // Success
    await BankPortfolioImport.update(
      {
        total_rows: totalRows,
        imported_rows: counters.loans + counters.loansUpdated + counters.schedules + counters.payments,
        failed_rows: 0,
        import_status: 'completed',
        error_log: null,
        import_completed_at: new Date(),
      },
      { where: { id: importId } }
    );
    logger.info(
      `Bulk import ${importId}: ${counters.loans} new loans, ${counters.loansUpdated} updated, ${counters.schedules} schedules, ${counters.payments} payments, ${counters.autoMatched} auto-matched to farmers`
    );
  } catch (err) {
    // Transaction already rolled back by the throw above
    await BankPortfolioImport.update(
      {
        total_rows: totalRows,
        imported_rows: 0,
        failed_rows: totalRows,
        import_status: 'failed',
        error_log: rowErrors.length > 0 ? rowErrors : [{ error: err.message }],
        import_completed_at: new Date(),
      },
      { where: { id: importId } }
    );
    logger.warn(`Bulk import ${importId} rolled back: ${err.message}`);
  }
};

/**
 * GET status — reads the BankPortfolioImport record directly. Scope-gated:
 * non-admin callers can only see imports they uploaded, preventing
 * cross-tenant enumeration of other banks' imports.
 */
const getImportStatus = async (importUuid, { requesterId, requesterRole } = {}) => {
  const { BankPortfolioImport } = getDb();
  const row = await BankPortfolioImport.findOne({ where: { import_uuid: importUuid } });
  if (!row) {
    const err = new Error('Import not found');
    err.statusCode = 404;
    throw err;
  }
  const isAdmin = requesterRole === 'ADMIN' || requesterRole === 'system_admin' || requesterRole === 'super_admin';
  if (!isAdmin && requesterId && row.uploaded_by !== requesterId) {
    const err = new Error('Forbidden: import belongs to a different uploader');
    err.statusCode = 403;
    err.errorCode = 'BANK_IMPORT_FORBIDDEN';
    throw err;
  }
  return {
    importUuid: row.import_uuid,
    status: row.import_status,
    bankName: row.bank_name,
    branchCode: row.branch_code,
    fileName: row.file_name,
    totalRows: row.total_rows,
    importedRows: row.imported_rows,
    failedRows: row.failed_rows,
    errorLog: row.error_log,
    startedAt: row.created_at,
    completedAt: row.import_completed_at,
  };
};

module.exports = {
  kickoffBulkImport,
  processWorkbook,      // exported for tests
  getImportStatus,
  mapLoanType,          // exported so bankPortfolioService can DRY up later
  mapSmaClass,
};
