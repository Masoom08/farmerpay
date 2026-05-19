/**
 * Farmer Loan Feed Service — unified loan list for the farmer-app.
 *
 * Powers `GET /dice/loans/me` which is consumed by:
 *   - farmer-app/app/(tabs)/money.tsx         (Money tab loans section)
 *   - farmer-app/app/repayments.tsx            (repayments screen)
 *
 * Returns the UNION of:
 *   (a) FarmerPay-originated loans — rows in `loan_applications` that
 *       belong to the authenticated farmer, disbursed or earlier
 *   (b) Bank-imported loans (May 2026 pilot) — rows in `bank_loan_accounts`
 *       that have been linked to this farmer via `linked_farmer_id`,
 *       either auto-matched during bulk import (WS6.1) or field-agent
 *       confirmed via POST /farmer/link-loan-account (WS6.2)
 *
 * Each row carries a `source` discriminator ('farmerpay' | 'bank') so
 * the UI can badge the bank-imported rows separately. The response
 * shape is backward-compatible with the existing money.tsx expectation
 * — it reads `data.loans` and treats every row as a LoanSummary. New
 * fields (source, bankName, schemeName, nextEmi) are additive.
 *
 * The "next EMI" calculation picks the earliest unpaid installment per
 * loan from `loan_repayment_schedules`, irrespective of which source
 * the loan came from (both sources use the same table via the nullable
 * `application_id` / `bank_loan_account_id` FKs added in WS2).
 */

const { Op } = require('sequelize');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

// ─── Helpers ───────────────────────────────────────────────────

const isoDate = (d) => {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  return new Date(d).toISOString().slice(0, 10);
};

const num = (v) => (v == null ? null : Number(v));

/**
 * Compute the next unpaid EMI row from a schedule array. Returns null
 * if the loan is fully paid or has no schedule yet.
 */
const pickNextEmi = (schedules = []) => {
  const unpaid = schedules
    .filter((s) => s.status !== 'paid' && s.status !== 'forgiven')
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
  if (unpaid.length === 0) return null;
  const next = unpaid[0];
  return {
    scheduleNumber: next.schedule_number,
    dueDate: isoDate(next.due_date),
    dueAmount: num(next.due_amount),
    status: next.status,
  };
};

// ─── FarmerPay-originated loans ────────────────────────────────

const getFarmerPayLoans = async (farmerId) => {
  const { LoanApplication, LoanProduct, LoanProvider, LoanRepaymentSchedule, LoanDisbursement } = getDb();

  const applications = await LoanApplication.findAll({
    where: { farmer_id: farmerId, is_active: true },
    include: [
      { model: LoanProduct, as: 'product', attributes: ['product_name', 'product_code'],
        include: [{ model: LoanProvider, as: 'provider', attributes: ['provider_name'] }],
      },
      { model: LoanRepaymentSchedule, as: 'repaymentSchedule', required: false,
        where: { is_active: true },
      },
      { model: LoanDisbursement, as: 'disbursements', required: false,
        where: { is_active: true },
      },
    ],
    order: [['applied_at', 'DESC']],
  });

  return applications.map((app) => {
    const schedules = app.repaymentSchedule || [];
    const disbursed = (app.disbursements || [])[0];
    const totalScheduled = schedules.reduce((s, x) => s + Number(x.due_amount || 0), 0);
    const totalPaid = schedules
      .filter((x) => x.is_paid || x.status === 'paid')
      .reduce((s, x) => s + Number(x.paid_amount || x.due_amount || 0), 0);
    return {
      source: 'farmerpay',
      loanId: app.id,
      loanUuid: app.application_uuid,
      applicationId: app.id, // backward-compat: existing UI reads this key
      productCode: app.product?.product_code || null,
      productName: app.product?.product_name || 'Loan',
      providerName: app.product?.provider?.provider_name || null,
      principalAmount: num(app.approval_amount || app.apply_for_amount),
      outstandingAmount: num(totalScheduled - totalPaid),
      status: app.application_status,
      disbursedAt: disbursed?.transferred_at || null,
      schemeName: null,
      bankName: app.product?.provider?.provider_name || null,
      district: null,
      linkageStatus: null,
      nextEmi: pickNextEmi(schedules),
      scheduleCount: schedules.length,
    };
  });
};

// ─── Bank-imported loans ───────────────────────────────────────

const getBankLoans = async (farmerId) => {
  const { BankLoanAccount, BankPortfolioImport, LoanRepaymentSchedule } = getDb();

  const accounts = await BankLoanAccount.findAll({
    where: {
      linked_farmer_id: farmerId,
      is_active: true,
      linkage_status: { [Op.in]: ['auto_matched', 'manually_linked', 'confirmed'] },
    },
    include: [
      { model: BankPortfolioImport, as: 'import', attributes: ['bank_name'], required: false },
    ],
    order: [['sanction_date', 'DESC']],
  });

  if (accounts.length === 0) return [];

  // Batch-load schedules so we make one query instead of N
  const accountIds = accounts.map((a) => a.id);
  const schedules = await LoanRepaymentSchedule.findAll({
    where: { bank_loan_account_id: accountIds, is_active: true },
    order: [['due_date', 'ASC']],
  });
  const schedulesByAccount = {};
  for (const s of schedules) {
    if (!schedulesByAccount[s.bank_loan_account_id]) schedulesByAccount[s.bank_loan_account_id] = [];
    schedulesByAccount[s.bank_loan_account_id].push(s);
  }

  return accounts.map((a) => {
    const sched = schedulesByAccount[a.id] || [];
    return {
      source: 'bank',
      loanId: a.id,
      loanUuid: a.account_uuid,
      applicationId: a.id, // same key as farmerpay rows so the frontend treats them uniformly
      productCode: (a.loan_type || '').toUpperCase(),
      productName: a.scheme_name || a.loan_type || 'Bank loan',
      providerName: a.import?.bank_name || null,
      bankName: a.import?.bank_name || null,
      principalAmount: num(a.sanction_amount),
      outstandingAmount: num(a.outstanding_amount),
      status: a.sma_classification || 'standard',
      disbursedAt: a.sanction_date || null,
      schemeName: a.scheme_name || null,
      schemeCode: a.scheme_code || null,
      district: a.district || null,
      linkageStatus: a.linkage_status,
      smaClassification: a.sma_classification,
      daysPastDue: a.days_past_due || 0,
      nextEmi: pickNextEmi(sched),
      scheduleCount: sched.length,
    };
  });
};

// ─── Public entry point ────────────────────────────────────────

/**
 * Returns the unified loan feed for a farmer. The result is a list of
 * loan summaries sorted by most-recently-originated first, with a
 * convenience `nextEmi` at the top level pointing at the earliest
 * unpaid installment across all loans.
 *
 * @param {number} farmerId - users.id (internal numeric ID, not user_id UUID)
 */
const getMyLoans = async (farmerId) => {
  const [farmerpay, bank] = await Promise.all([
    getFarmerPayLoans(farmerId),
    getBankLoans(farmerId),
  ]);

  // Merge + sort by disbursement date desc (most recent first)
  const merged = [...farmerpay, ...bank].sort((a, b) => {
    const da = a.disbursedAt ? String(a.disbursedAt) : '0';
    const db_ = b.disbursedAt ? String(b.disbursedAt) : '0';
    return db_.localeCompare(da);
  });

  // Earliest unpaid EMI across every loan
  const allNextEmis = merged
    .map((l) => l.nextEmi)
    .filter(Boolean)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
  const earliestNext = allNextEmis[0] || null;

  // Totals for the money-tab header
  const totalOutstanding = merged.reduce((s, l) => s + Number(l.outstandingAmount || 0), 0);
  const totalPrincipal = merged.reduce((s, l) => s + Number(l.principalAmount || 0), 0);

  return {
    loans: merged,
    count: merged.length,
    counts: {
      farmerpay: farmerpay.length,
      bank: bank.length,
    },
    totals: {
      principal: totalPrincipal,
      outstanding: totalOutstanding,
    },
    nextEmi: earliestNext,
  };
};

module.exports = {
  getMyLoans,
  // Exported for tests + for reuse elsewhere
  getFarmerPayLoans,
  getBankLoans,
  pickNextEmi,
};
