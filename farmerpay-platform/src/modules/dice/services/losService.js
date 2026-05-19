/**
 * LOS (Loan Origination System) Service
 * End-to-end origination: draft, submit, review, approve, sanction, disburse.
 */

const { Op } = require('sequelize');
const { generateUUID } = require('../../../shared/utils/uuidHelper');
const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

/**
 * Valid status transitions for the loan origination workflow.
 */
const STATUS_FLOW = {
  draft: ['submitted'],
  submitted: ['under_review'],
  under_review: ['forwarded_to_bank', 'rejected'],
  forwarded_to_bank: ['approved', 'rejected'],
  approved: ['disbursed'],
  disbursed: [],
  rejected: ['draft'],  // Allow resubmission: rejected → draft → resubmit
  withdrawn: [],
};

/**
 * Asserts that `toStatus` is a valid successor of `fromStatus` under the
 * STATUS_FLOW state machine. Centralizes transition validation so every
 * state mutation is gated — callers that forget to check will still be
 * blocked when they invoke logStatusHistory.
 */
const assertValidTransition = (fromStatus, toStatus) => {
  const allowed = STATUS_FLOW[fromStatus];
  if (!allowed || !allowed.includes(toStatus)) {
    const err = new Error(`Invalid loan status transition: ${fromStatus} → ${toStatus}`);
    err.statusCode = 409;
    err.errorCode = 'LOS_INVALID_TRANSITION';
    throw err;
  }
};

/**
 * Logs a status change to LoanApplicationStatusHistory.
 */
const logStatusHistory = async (applicationId, { fromStatus, toStatus, changedBy, remarks }) => {
  assertValidTransition(fromStatus, toStatus);
  const { LoanApplicationStatusHistory } = getDb();

  await LoanApplicationStatusHistory.create({
    application_id: applicationId,
    from_status: fromStatus,
    to_status: toStatus,
    transitioned_by: changedBy || null,
    transition_reason: remarks || null,
    transitioned_at: new Date(),
  });
};

/**
 * Initiates a new loan origination in draft status.
 * Calls input cost calculator for loan sizing.
 * @param {Object} params
 * @param {number} params.farmerId
 * @param {number} params.productId
 * @param {number} params.fieldId
 * @param {string} params.popId
 * @param {Array} params.selectedInputs - [{inputItemId, quantity}]
 * @returns {Promise<Object>}
 */
const initiateOrigination = async ({ farmerId, productId, fieldId, popId, selectedInputs }) => {
  const { LoanApplication } = getDb();

  // Create application in draft status
  const application = await LoanApplication.create({
    application_uuid: generateUUID(),
    farmer_id: farmerId,
    product_id: productId,
    field_id: fieldId || null,
    pop_id: popId || null,
    application_status: 'draft',
    selected_inputs: selectedInputs ? JSON.stringify(selectedInputs) : null,
    application_date: new Date(),
  });

  // Attempt loan sizing via input cost calculator
  let loanSizing = null;
  try {
    const { calculateLoanFromInputs } = require('./inputCostCalculatorService');
    if (calculateLoanFromInputs && selectedInputs && selectedInputs.length > 0) {
      loanSizing = await calculateLoanFromInputs({
        popId,
        selectedInputs,
        fieldId,
      });
      if (loanSizing && loanSizing.totalLoanAmount) {
        await application.update({
          loan_amount_requested: loanSizing.totalLoanAmount,
        });
      }
    }
  } catch (calcErr) {
    logger.warn(`Input cost calculation skipped for application ${application.id}: ${calcErr.message}`);
  }

  await logStatusHistory(application.id, {
    fromStatus: null,
    toStatus: 'draft',
    changedBy: farmerId,
    remarks: 'Loan origination initiated',
  });

  logger.info(`Loan origination initiated: application=${application.id}, farmer=${farmerId}`);

  return {
    applicationId: application.id,
    applicationUuid: application.application_uuid,
    status: 'draft',
    farmerId,
    productId,
    loanSizing,
  };
};

/**
 * Submits a draft application for approval after completeness validation.
 * @param {number} applicationId
 * @param {number} farmerId
 * @returns {Promise<Object>}
 */
const submitForApproval = async (applicationId, farmerId) => {
  const { LoanApplication } = getDb();

  const application = await LoanApplication.findOne({
    where: { id: applicationId, farmer_id: farmerId, is_active: true },
  });
  if (!application) {
    const err = new Error('Loan application not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  if (application.application_status !== 'draft') {
    const err = new Error(`Cannot submit: application is in '${application.application_status}' status`);
    err.statusCode = 400;
    err.errorCode = 'LOS_001';
    throw err;
  }

  // Validate completeness
  const issues = [];
  if (!application.kyc_status || application.kyc_status !== 'verified') {
    issues.push('KYC not verified');
  }
  if (!application.field_id) {
    issues.push('Field not linked');
  }
  if (!application.pop_id) {
    issues.push('Package of Practice not linked');
  }

  // Warn but do not block if non-critical items are missing
  if (issues.length > 0) {
    logger.warn(`Application ${applicationId} submitted with warnings: ${issues.join(', ')}`);
  }

  await application.update({ application_status: 'submitted', submitted_at: new Date() });

  await logStatusHistory(applicationId, {
    fromStatus: 'draft',
    toStatus: 'submitted',
    changedBy: farmerId,
    remarks: issues.length > 0 ? `Submitted with warnings: ${issues.join(', ')}` : 'Submitted for approval',
  });

  logger.info(`Application ${applicationId} submitted for approval by farmer ${farmerId}`);

  return {
    applicationId,
    status: 'submitted',
    warnings: issues,
  };
};

/**
 * Maker (approver) reviews the application.
 * Moves from under_review to forwarded_to_bank (approved) or rejected.
 * @param {number} applicationId
 * @param {number} reviewerId
 * @param {string} decision - 'approve' | 'reject'
 * @param {string} remarks
 * @returns {Promise<Object>}
 */
const approverReview = async (applicationId, reviewerId, decision, remarks) => {
  const { LoanApplication } = getDb();

  const application = await LoanApplication.findOne({
    where: { id: applicationId, is_active: true },
  });
  if (!application) {
    const err = new Error('Loan application not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  // Segregation of duties: a reviewer must never be the applicant.
  if (reviewerId && application.farmer_id === reviewerId) {
    const err = new Error('You cannot review your own loan application');
    err.statusCode = 403;
    err.errorCode = 'LOS_SELF_REVIEW';
    throw err;
  }

  // Allow review from submitted or under_review
  const allowedStatuses = ['submitted', 'under_review'];
  if (!allowedStatuses.includes(application.application_status)) {
    const err = new Error(`Cannot review: application is in '${application.application_status}' status`);
    err.statusCode = 400;
    err.errorCode = 'LOS_002';
    throw err;
  }

  const fromStatus = application.application_status;
  let toStatus;

  if (decision === 'approve') {
    toStatus = 'forwarded_to_bank';
  } else if (decision === 'reject') {
    toStatus = 'rejected';
  } else {
    const err = new Error('Decision must be approve or reject');
    err.statusCode = 400;
    err.errorCode = 'LOS_003';
    throw err;
  }

  await application.update({
    application_status: toStatus,
    reviewed_by: reviewerId,
    reviewed_at: new Date(),
    review_remarks: remarks || null,
  });

  await logStatusHistory(applicationId, {
    fromStatus,
    toStatus,
    changedBy: reviewerId,
    remarks: remarks || `Maker review: ${decision}`,
  });

  logger.info('dice.review', {
    event: 'dice.review',
    applicationId, reviewerId, decision, fromStatus, toStatus,
  });

  return {
    applicationId,
    status: toStatus,
    reviewedBy: reviewerId,
    decision,
    remarks,
  };
};

/**
 * Checker (bank officer) final approval or rejection.
 * Moves from forwarded_to_bank to approved or rejected.
 * @param {number} applicationId
 * @param {number} checkerId
 * @param {string} decision - 'approve' | 'reject'
 * @param {string} remarks
 * @returns {Promise<Object>}
 */
const checkerApproval = async (applicationId, checkerId, decision, remarks) => {
  const { LoanApplication } = getDb();

  const application = await LoanApplication.findOne({
    where: { id: applicationId, is_active: true },
  });
  if (!application) {
    const err = new Error('Loan application not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  // Segregation of duties: a checker must never be the applicant, and must
  // not be the same user who performed the maker review.
  if (checkerId && application.farmer_id === checkerId) {
    const err = new Error('You cannot approve your own loan application');
    err.statusCode = 403;
    err.errorCode = 'LOS_SELF_APPROVE';
    throw err;
  }
  if (checkerId && application.reviewed_by && application.reviewed_by === checkerId) {
    const err = new Error('Checker must be different from the maker/reviewer (maker-checker separation)');
    err.statusCode = 403;
    err.errorCode = 'LOS_MAKER_CHECKER';
    throw err;
  }

  if (application.application_status !== 'forwarded_to_bank') {
    const err = new Error(`Cannot approve/reject: application is in '${application.application_status}' status`);
    err.statusCode = 400;
    err.errorCode = 'LOS_004';
    throw err;
  }

  let toStatus;
  if (decision === 'approve') {
    toStatus = 'approved';
  } else if (decision === 'reject') {
    toStatus = 'rejected';
  } else {
    const err = new Error('Decision must be approve or reject');
    err.statusCode = 400;
    err.errorCode = 'LOS_005';
    throw err;
  }

  await application.update({
    application_status: toStatus,
    checker_id: checkerId,
    checker_approved_at: decision === 'approve' ? new Date() : null,
    checker_remarks: remarks || null,
  });

  await logStatusHistory(applicationId, {
    fromStatus: 'forwarded_to_bank',
    toStatus,
    changedBy: checkerId,
    remarks: remarks || `Checker decision: ${decision}`,
  });

  logger.info('dice.checker_approval', {
    event: 'dice.checker_approval',
    applicationId, checkerId, decision, toStatus,
  });

  return {
    applicationId,
    status: toStatus,
    checkedBy: checkerId,
    decision,
    remarks,
  };
};

/**
 * Generates sanction letter details for an approved application.
 * @param {number} applicationId
 * @returns {Promise<Object>}
 */
const generateSanctionLetter = async (applicationId) => {
  const { LoanApplication, LoanProduct, ScaleOfFinance } = getDb();

  const application = await LoanApplication.findOne({
    where: { id: applicationId, is_active: true },
    include: [
      { model: LoanProduct, as: 'product', required: false },
    ],
  });

  if (!application) {
    const err = new Error('Loan application not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  if (application.application_status !== 'approved') {
    const err = new Error('Sanction letter can only be generated for approved applications');
    err.statusCode = 400;
    err.errorCode = 'LOS_006';
    throw err;
  }

  // Parse selected inputs if stored
  let inputBreakdown = [];
  try {
    inputBreakdown = application.selected_inputs ? JSON.parse(application.selected_inputs) : [];
  } catch (_) {
    inputBreakdown = [];
  }

  // Fetch SoF reference if available
  let sofReference = null;
  if (application.sof_id) {
    const sof = await ScaleOfFinance.findOne({ where: { id: application.sof_id, is_active: true } });
    if (sof) {
      sofReference = {
        sofId: sof.id,
        district: sof.district_id,
        crop: sof.crop_id,
        season: sof.season,
        financialYear: sof.financial_year,
        costPerHectare: sof.cost_per_hectare,
      };
    }
  }

  const sanctionDetails = {
    applicationId: application.id,
    applicationUuid: application.application_uuid,
    farmerId: application.farmer_id,
    sanctionAmount: application.loan_amount_approved || application.loan_amount_requested,
    interestRate: application.product ? application.product.interest_rate : null,
    tenureMonths: application.product ? application.product.tenure_months : null,
    processingFee: application.product ? application.product.processing_fee_percent : null,
    productName: application.product ? application.product.product_name : null,
    sofReference,
    inputBreakdown,
    sanctionDate: new Date().toISOString().split('T')[0],
  };

  logger.info(`Sanction letter generated for application ${applicationId}`);

  return sanctionDetails;
};

/**
 * Records disbursement for an approved application.
 * @param {number} applicationId
 * @param {Object} disbursementData
 * @param {string} disbursementData.mode - neft | rtgs | imps | account_transfer
 * @param {number} disbursementData.amount
 * @param {string} disbursementData.utr - Unique Transaction Reference
 * @param {number} disbursementData.bankAccountId
 * @returns {Promise<Object>}
 */
const recordDisbursement = async (applicationId, { mode, amount, utr, bankAccountId }) => {
  const { LoanApplication, LoanDisbursement, sequelize } = getDb();

  // Idempotency check outside the transaction so replayed webhook/CI retries
  // short-circuit without starting a DB write.
  if (utr) {
    const replay = await LoanDisbursement.findOne({
      where: { application_id: applicationId, utr_reference: utr },
    });
    if (replay) {
      logger.info(`Disbursement replay detected for application ${applicationId} UTR ${utr}; returning existing record`);
      return replay;
    }
  }

  const txn = await sequelize.transaction();
  let disbursement;
  let application;
  try {
    // Lock the application row so two concurrent disburse requests for the
    // same application cannot both observe `approved` and race to create
    // duplicate disbursement rows.
    application = await LoanApplication.findOne({
      where: { id: applicationId, is_active: true },
      lock: txn.LOCK.UPDATE,
      transaction: txn,
    });
    if (!application) {
      const err = new Error('Loan application not found');
      err.statusCode = 404;
      err.errorCode = 'RES_001';
      throw err;
    }

    if (application.application_status !== 'approved') {
      const err = new Error('Disbursement can only be recorded for approved applications');
      err.statusCode = 400;
      err.errorCode = 'LOS_007';
      throw err;
    }

    disbursement = await LoanDisbursement.create({
      disbursement_uuid: generateUUID(),
      application_id: applicationId,
      disbursement_mode: mode,
      disbursement_amount: amount,
      utr_reference: utr,
      bank_account_id: bankAccountId || null,
      disbursement_date: new Date(),
      disbursement_status: 'completed',
    }, { transaction: txn });

    await application.update({
      application_status: 'disbursed',
      disbursed_at: new Date(),
      disbursed_amount: amount,
    }, { transaction: txn });

    await txn.commit();
  } catch (err) {
    await txn.rollback();
    throw err;
  }

  await logStatusHistory(applicationId, {
    fromStatus: 'approved',
    toStatus: 'disbursed',
    changedBy: null,
    remarks: `Disbursed via ${mode}, UTR: ${utr}, Amount: ${amount}`,
  });

  // Generate the EMI repayment schedule on disbursement so the farmer can
  // start tracking instalments immediately. We pull rate + tenure from the
  // approved values on the application; fall back to product min rate / 12mo
  // if either is missing (older seeded loans).
  try {
    const { LoanProduct, LoanRepaymentSchedule } = getDb();
    const existing = await LoanRepaymentSchedule.count({ where: { application_id: applicationId } });
    if (existing === 0) {
      let interestRate = parseFloat(application.approval_interest_rate);
      let tenureMonths = application.approval_tenure_months;
      if (!interestRate || !tenureMonths) {
        const product = await LoanProduct.findOne({ where: { id: application.loan_product_id } });
        if (product) {
          interestRate = interestRate || parseFloat(product.min_interest_rate) || 7;
          tenureMonths = tenureMonths || product.tenure_months_max || application.apply_for_tenure_months || 12;
        }
      }
      const { generateRepaymentSchedule } = require('./applicationService');
      await generateRepaymentSchedule(applicationId, amount, interestRate || 7, tenureMonths || 12);
      logger.info(`Repayment schedule auto-generated for application ${applicationId}: rate=${interestRate}%, tenure=${tenureMonths}mo`);
    }
  } catch (schedErr) {
    logger.warn(`Failed to generate repayment schedule for application ${applicationId}: ${schedErr.message}`);
  }

  logger.info('dice.disbursement', {
    event: 'dice.disbursement',
    applicationId, disbursementId: disbursement.id,
    disbursementUuid: disbursement.disbursement_uuid,
    mode, amount, utr,
  });

  return {
    applicationId,
    disbursementId: disbursement.id,
    disbursementUuid: disbursement.disbursement_uuid,
    mode,
    amount,
    utr,
    status: 'disbursed',
    disbursementDate: disbursement.disbursement_date,
  };
};

/**
 * Returns application details with full status history timeline.
 * @param {number} applicationId
 * @returns {Promise<Object>}
 */
const getOriginationStatus = async (applicationId) => {
  const { LoanApplication, LoanApplicationStatusHistory, LoanProduct } = getDb();

  const application = await LoanApplication.findOne({
    where: { id: applicationId, is_active: true },
    include: [
      { model: LoanProduct, as: 'product', required: false },
    ],
  });

  if (!application) {
    const err = new Error('Loan application not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const history = await LoanApplicationStatusHistory.findAll({
    where: { application_id: applicationId, is_active: true },
    order: [['transitioned_at', 'ASC']],
  });

  return {
    application: {
      applicationId: application.id,
      applicationUuid: application.application_uuid,
      farmerId: application.farmer_id,
      productId: application.product_id,
      productName: application.product ? application.product.product_name : null,
      currentStatus: application.application_status,
      loanAmountRequested: application.loan_amount_requested,
      loanAmountApproved: application.loan_amount_approved,
      applicationDate: application.application_date,
    },
    timeline: history.map((h) => ({
      fromStatus: h.from_status,
      toStatus: h.to_status,
      changedBy: h.transitioned_by,
      remarks: h.transition_reason,
      changedAt: h.transitioned_at,
    })),
  };
};

module.exports = {
  initiateOrigination,
  submitForApproval,
  approverReview,
  checkerApproval,
  generateSanctionLetter,
  recordDisbursement,
  getOriginationStatus,
};
