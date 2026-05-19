/**
 * Application Service
 * Loan application lifecycle: create, submit, track, withdraw, repayment schedule generation.
 */

const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');
const { generateUUID } = require('../../../shared/utils/uuidHelper');
const { parsePagination, buildMeta } = require('../../../shared/utils/paginationHelper');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

/**
 * Creates and submits a loan application.
 * Rate limited: 5 applications per farmer per month.
 * @param {number} farmerId
 * @param {Object} data - { productId, loanAmount, tenureMonths, intendedUse, documents }
 * @returns {Promise<Object>}
 */
const applyForLoan = async (farmerId, data) => {
  const { LoanApplication, LoanApplicationStatus, LoanApplicationStatusHistory, LoanApplicationDocument, LoanProduct, sequelize: seq } = getDb();

  // Rate check: 5 per month
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentCount = await LoanApplication.count({
    where: { farmer_id: farmerId, applied_at: { [Op.gte]: monthAgo }, is_active: true },
  });
  if (recentCount >= 5) {
    const err = new Error('Maximum 5 loan applications per month');
    err.statusCode = 429; err.errorCode = 'RATE_001';
    throw err;
  }

  // Verify product exists
  const product = await LoanProduct.findByPk(data.productId);
  if (!product || !product.is_active) {
    const err = new Error('Loan product not found');
    err.statusCode = 404; err.errorCode = 'RES_001';
    throw err;
  }

  // Validate amount within product range
  const amount = parseFloat(data.loanAmount);
  if (product.min_loan_amount && amount < parseFloat(product.min_loan_amount)) {
    const err = new Error(`Minimum loan amount is ${product.min_loan_amount}`);
    err.statusCode = 400; err.errorCode = 'VAL_001';
    throw err;
  }
  if (product.max_loan_amount && amount > parseFloat(product.max_loan_amount)) {
    const err = new Error(`Maximum loan amount is ${product.max_loan_amount}`);
    err.statusCode = 400; err.errorCode = 'VAL_001';
    throw err;
  }

  const transaction = await seq.transaction();

  try {
    // Phase 2 wizard rebuild — pass through the cost-calculation context
    // so the banker can see how the amount was justified, which DLTC SoF
    // norm it sits against, and which plot it covers. Land context is
    // serialized into input_cost_breakdown.land_context since the
    // loan_applications table doesn't have dedicated land columns yet.
    const inputCostBreakdown = data.inputCostBreakdown || (data.landContext ? {} : null);
    if (inputCostBreakdown && data.landContext) {
      inputCostBreakdown.land_context = data.landContext;
    }
    if (inputCostBreakdown && data.sofCostPerHectare != null) {
      inputCostBreakdown.sof_cost_per_hectare = data.sofCostPerHectare;
      inputCostBreakdown.nabard_benchmark_per_hectare = data.nabardBenchmarkPerHectare;
    }

    const application = await LoanApplication.create({
      application_uuid: generateUUID(),
      farmer_id: farmerId,
      loan_product_id: data.productId,
      apply_for_amount: amount,
      apply_for_tenure_months: data.tenureMonths,
      intended_use: data.intendedUse || null,
      application_status: 'submitted',
      applied_at: new Date(),
      // Phase 2 cost-calculation passthrough — populates the orphaned
      // columns from the earlier audit. Each is optional so the legacy
      // thin-form path stays working.
      sof_id: data.sofId || null,
      sof_cost_per_hectare: data.sofCostPerHectare || null,
      nabard_benchmark_per_hectare: data.nabardBenchmarkPerHectare || null,
      calculated_recommended_amount: data.calculatedRecommendedAmount || null,
      input_cost_breakdown: inputCostBreakdown,
      amount_above_sof: data.amountAboveSof || null,
      sizing_method: data.sizingMethod || 'manual',
    }, { transaction });

    // Record status
    await LoanApplicationStatus.create({
      application_id: application.id,
      status: 'submitted',
      changed_by: farmerId,
      status_notes: 'Application submitted by farmer',
    }, { transaction });

    // Record status history
    await LoanApplicationStatusHistory.create({
      application_id: application.id,
      from_status: null,
      to_status: 'submitted',
      transitioned_by: farmerId,
      transition_reason: 'New application submitted',
    }, { transaction });

    // Attach documents
    if (data.documents && data.documents.length > 0) {
      const docRecords = data.documents.map((docId) => ({
        application_id: application.id,
        document_id: typeof docId === 'object' ? docId.documentId : docId,
        document_type: typeof docId === 'object' ? docId.documentType : 'other',
      }));
      await LoanApplicationDocument.bulkCreate(docRecords, { transaction });
    }

    await transaction.commit();

    logger.info(`Loan application submitted: ${application.application_uuid}, farmer: ${farmerId}`);

    // Phase 2 — push the application to the Finacle outbound queue.
    // The outbound service writes a FinacleIntegrationEvent row with
    // direction='outbound' and event_type='loan_origination_push'. A
    // separate worker (or the bank pulling the queue) is what actually
    // delivers it to the bank's CBS — this call just enqueues it. The
    // wizard's status timeline can poll the application to see when
    // bankers move it through the lifecycle.
    //
    // Wrapped in try/catch so a queue failure doesn't fail the loan
    // submission itself — the application row is already committed,
    // and a banker can resync it manually if needed.
    try {
      const finacleOutboundService = require('../../bank/services/finacleOutboundService');
      await finacleOutboundService.pushLoanOrigination(application.id);
      logger.info(`Loan application ${application.id} enqueued to Finacle outbound`);
    } catch (pushErr) {
      logger.warn(`Finacle push failed for application ${application.id}: ${pushErr.message}`);
    }

    return {
      applicationId: application.id,
      applicationUuid: application.application_uuid,
      applicationStatus: application.application_status,
      appliedAt: application.applied_at,
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

/**
 * Gets all applications for a farmer with pagination.
 * @param {number} farmerId
 * @param {Object} query
 * @returns {Promise<Object>}
 */
const getApplications = async (farmerId, query) => {
  const { LoanApplication, LoanProduct, LoanProvider } = getDb();
  const { page, limit, offset } = parsePagination(query);

  const { count, rows } = await LoanApplication.findAndCountAll({
    where: { farmer_id: farmerId, is_active: true },
    include: [{
      model: LoanProduct, as: 'product', attributes: ['product_name'],
      include: [{ model: LoanProvider, as: 'provider', attributes: ['provider_name'] }],
    }],
    order: [['applied_at', 'DESC']],
    limit, offset,
  });

  const applications = rows.map((a) => ({
    applicationId: a.id, applicationUuid: a.application_uuid,
    productName: a.product?.product_name, providerName: a.product?.provider?.provider_name,
    loanAmount: a.apply_for_amount, tenureMonths: a.apply_for_tenure_months,
    status: a.application_status, appliedAt: a.applied_at,
    approvalAmount: a.approval_amount,
  }));

  return { applications, meta: buildMeta(page, limit, count) };
};

/**
 * Gets detailed application info including documents and repayment schedule.
 * @param {number} farmerId
 * @param {number} applicationId
 * @returns {Promise<Object>}
 */
const getApplicationDetail = async (farmerId, applicationId) => {
  const { LoanApplication, LoanProduct, LoanProvider, LoanApplicationDocument, LoanRepaymentSchedule, LoanDisbursement } = getDb();

  const application = await LoanApplication.findOne({
    where: { id: applicationId, farmer_id: farmerId, is_active: true },
    include: [
      { model: LoanProduct, as: 'product', include: [{ model: LoanProvider, as: 'provider' }] },
      { model: LoanApplicationDocument, as: 'documents', where: { is_active: true }, required: false },
      { model: LoanRepaymentSchedule, as: 'repaymentSchedule', where: { is_active: true }, required: false, order: [['schedule_number', 'ASC']] },
      { model: LoanDisbursement, as: 'disbursements', where: { is_active: true }, required: false },
    ],
  });

  if (!application) {
    const err = new Error('Application not found');
    err.statusCode = 404; err.errorCode = 'RES_001';
    throw err;
  }

  return application;
};

/**
 * Withdraws a loan application (only if in draft or submitted status).
 * @param {number} farmerId
 * @param {number} applicationId
 * @returns {Promise<Object>}
 */
const withdrawApplication = async (farmerId, applicationId) => {
  const { LoanApplication, LoanApplicationStatusHistory } = getDb();

  const application = await LoanApplication.findOne({
    where: { id: applicationId, farmer_id: farmerId, is_active: true },
  });

  if (!application) {
    const err = new Error('Application not found');
    err.statusCode = 404; err.errorCode = 'RES_001';
    throw err;
  }

  if (!['draft', 'submitted'].includes(application.application_status)) {
    const err = new Error('Cannot withdraw application in current status');
    err.statusCode = 400; err.errorCode = 'VAL_001';
    throw err;
  }

  const previousStatus = application.application_status;
  await application.update({ application_status: 'closed', is_active: false });

  await LoanApplicationStatusHistory.create({
    application_id: applicationId,
    from_status: previousStatus,
    to_status: 'closed',
    transitioned_by: farmerId,
    transition_reason: 'Withdrawn by farmer',
  });

  logger.info(`Application ${applicationId} withdrawn by farmer ${farmerId}`);
  return { message: 'Application withdrawn' };
};

/**
 * Generates a repayment schedule for an approved loan.
 * Uses reducing balance method with equal monthly installments (EMI).
 * @param {number} applicationId
 * @param {number} approvalAmount
 * @param {number} interestRate - Annual rate as percentage
 * @param {number} tenureMonths
 * @returns {Promise<Array>}
 */
const generateRepaymentSchedule = async (applicationId, approvalAmount, interestRate, tenureMonths) => {
  const { LoanRepaymentSchedule } = getDb();

  const principal = parseFloat(approvalAmount);
  const monthlyRate = (parseFloat(interestRate) / 100) / 12;
  const emi = monthlyRate > 0
    ? principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) / (Math.pow(1 + monthlyRate, tenureMonths) - 1)
    : principal / tenureMonths;

  const schedules = [];
  let balance = principal;
  const startDate = new Date();

  for (let i = 1; i <= tenureMonths; i++) {
    const interestForMonth = balance * monthlyRate;
    const principalForMonth = emi - interestForMonth;
    balance -= principalForMonth;

    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    schedules.push({
      application_id: applicationId,
      schedule_number: i,
      due_date: dueDate.toISOString().split('T')[0],
      due_amount: Math.round(emi * 100) / 100,
      principal_amount: Math.round(principalForMonth * 100) / 100,
      interest_amount: Math.round(interestForMonth * 100) / 100,
      status: 'pending',
    });
  }

  await LoanRepaymentSchedule.bulkCreate(schedules);
  logger.info(`Repayment schedule generated: ${tenureMonths} installments for application ${applicationId}`);
  return schedules;
};

/**
 * Records a loan consent before or during application.
 * Persists to ConsentRecord for RBI compliance.
 */
const captureConsent = async (farmerId, data) => {
  const { ConsentRecord, LoanApplication } = getDb();

  // Consent must be tied to a real loan application the farmer owns.
  // Without this gate, a farmer could create consent rows for applications
  // they don't own (or that don't exist) and pollute the compliance log.
  if (!data.applicationId) {
    const err = new Error('applicationId is required to capture consent');
    err.statusCode = 400;
    err.errorCode = 'DICE_CONSENT_APP_REQUIRED';
    throw err;
  }
  const app = await LoanApplication.findOne({
    where: { id: data.applicationId, farmer_id: farmerId, is_active: true },
  });
  if (!app) {
    const err = new Error('Loan application not found for this farmer');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const consent = await ConsentRecord.create({
    consent_uuid: generateUUID(),
    farmer_id: farmerId,
    application_id: data.applicationId,
    consent_type: data.consentType || 'lending',
    consent_version: data.version || '1.0',
    consent_text: data.consentText || 'I consent to this loan application and agree to the terms and conditions.',
    accepted: true,
    accepted_at: new Date(),
    consent_channel: data.channel || 'mobile_app',
    ip_address: data.ipAddress || null,
    user_agent: data.userAgent || null,
    consent_expiry_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    is_active: true,
  });
  logger.info('dice.consent', {
    event: 'dice.consent',
    farmerId, applicationId: data.applicationId,
    consentId: consent.id, consentUuid: consent.consent_uuid,
    consentType: data.consentType || 'lending',
    channel: data.channel || 'mobile_app',
    ipAddress: data.ipAddress || null,
  });
  return { consentId: consent.id, consentUuid: consent.consent_uuid };
};

/**
 * Records an actual loan repayment against a schedule entry.
 * @param {number} farmerId
 * @param {Object} data - { applicationId, scheduleId, amount, paymentMethod, utrReference }
 */
const recordRepayment = async (farmerId, data) => {
  const { LoanRepayment, LoanRepaymentSchedule, LoanApplication, ConsentRecord } = getDb();

  // Validate application belongs to farmer
  const app = await LoanApplication.findOne({
    where: { id: data.applicationId, farmer_id: farmerId, is_active: true },
  });
  if (!app) {
    const err = new Error('Loan application not found');
    err.statusCode = 404; err.errorCode = 'RES_001'; throw err;
  }

  // Active, unexpired consent required for money-moving operations.
  // A revoked or expired consent should block further repayments until
  // the farmer re-consents (RBI compliance).
  const activeConsent = await ConsentRecord.findOne({
    where: {
      farmer_id: farmerId,
      application_id: data.applicationId,
      consent_type: 'lending',
      accepted: true,
      is_active: true,
    },
    order: [['accepted_at', 'DESC']],
  });
  if (!activeConsent || (activeConsent.consent_expiry_at && new Date(activeConsent.consent_expiry_at) <= new Date())) {
    const err = new Error('No valid consent for this loan application');
    err.statusCode = 403;
    err.errorCode = 'DICE_CONSENT_REQUIRED';
    throw err;
  }

  // Validate schedule entry
  let schedule = null;
  if (data.scheduleId) {
    schedule = await LoanRepaymentSchedule.findOne({
      where: { id: data.scheduleId, application_id: data.applicationId },
    });
  }

  // Overpayment guard: a repayment cannot exceed the outstanding loan
  // balance. Without this, farmers or buggy automations could post
  // arbitrary repayment amounts, corrupting the ledger and creating
  // reconciliation nightmares with Finacle.
  const disbursed = parseFloat(app.disbursed_amount || app.approval_amount || 0);
  const priorRepayAgg = await LoanRepayment.sum('repayment_amount', {
    where: { application_id: data.applicationId },
  });
  const priorRepayments = parseFloat(priorRepayAgg || 0);
  const outstanding = Math.max(0, disbursed - priorRepayments);
  const amt = parseFloat(data.amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    const err = new Error('Invalid repayment amount');
    err.statusCode = 400; err.errorCode = 'DICE_REPAY_INVALID_AMOUNT';
    throw err;
  }
  // Allow a small tolerance for rounding (₹10) so a final EMI isn't rejected.
  if (amt > outstanding + 10) {
    const err = new Error(`Repayment amount ${amt} exceeds outstanding balance ${outstanding.toFixed(2)}`);
    err.statusCode = 400; err.errorCode = 'DICE_REPAY_EXCEEDS_OUTSTANDING';
    throw err;
  }

  const repayment = await LoanRepayment.create({
    repayment_uuid: generateUUID(),
    application_id: data.applicationId,
    schedule_id: data.scheduleId || null,
    repayment_date: new Date(),
    repayment_amount: data.amount,
    payment_method: data.paymentMethod || 'bank_transfer',
    utr_reference: data.utrReference || null,
    repaid_by_farmer: true,
    recorded_by_agent: data.agentId || null,
    is_subvention_eligible: data.isSubventionEligible || false,
  });

  // Update schedule entry if matched
  if (schedule) {
    await schedule.update({
      is_paid: true,
      paid_date: new Date(),
      paid_amount: data.amount,
      status: 'paid',
    });
  }

  logger.info('dice.repayment', {
    event: 'dice.repayment',
    applicationId: data.applicationId, farmerId,
    repaymentId: repayment.id, repaymentUuid: repayment.repayment_uuid,
    amount: data.amount, paymentMethod: data.paymentMethod,
    scheduleId: data.scheduleId || null,
  });

  return {
    repaymentId: repayment.id,
    repaymentUuid: repayment.repayment_uuid,
    amount: data.amount,
    method: data.paymentMethod,
    scheduleId: data.scheduleId,
  };
};

/**
 * Resubmit a rejected application — resets to draft status for farmer to update and resubmit.
 * @param {number} farmerId
 * @param {number} applicationId
 */
const resubmitApplication = async (farmerId, applicationId) => {
  const { LoanApplication, LoanApplicationStatusHistory } = getDb();

  const app = await LoanApplication.findOne({
    where: { id: applicationId, farmer_id: farmerId, is_active: true },
  });
  if (!app) {
    const err = new Error('Application not found'); err.statusCode = 404; throw err;
  }
  if (app.application_status !== 'rejected') {
    const err = new Error('Only rejected applications can be resubmitted'); err.statusCode = 400; throw err;
  }

  await app.update({
    application_status: 'draft',
    rejected_reason: null,
  });

  await LoanApplicationStatusHistory.create({
    application_id: applicationId,
    from_status: 'rejected',
    to_status: 'draft',
    transitioned_by: farmerId,
    transition_reason: 'Farmer resubmission after rejection',
  });

  logger.info(`Application ${applicationId} resubmitted by farmer ${farmerId}`);
  return { applicationId, status: 'draft', message: 'Application reset to draft. Please update and resubmit.' };
};

module.exports = {
  applyForLoan, getApplications, getApplicationDetail, withdrawApplication,
  generateRepaymentSchedule, captureConsent, recordRepayment, resubmitApplication,
};
