/**
 * Finacle Outbound Service
 * Pushes data FROM FarmerPay TO Finacle CBS via middleware/API.
 *
 * Outbound flows:
 *   1. Loan origination (DICE application → Finacle LOS)
 *   2. Insurance enrollment (DICE insurance → Finacle Standing Instructions)
 *   3. End-use verification (SENTINEL score → Finacle loan remarks)
 *   4. PSL classification evidence (SENTINEL → Finacle account classification)
 *   5. Pre-delinquency alerts (SENTINEL RSS → Finacle officer notification)
 *   6. Gold return reminders (SENTINEL → Finacle closure workflow)
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

/**
 * Build a persisted-audit copy of the outbound payload with sensitive
 * identifiers redacted. The real payload is still sent to Finacle; only the
 * local `FinacleIntegrationEvent.request_payload` audit row gets a masked
 * version. The dedicated `finacle_account_number` column on the event (used
 * for reconciliation + indexing) retains the full value.
 */
const maskTail = (val, keep = 4) => {
  if (!val) return val;
  const s = String(val);
  if (s.length <= keep) return '*'.repeat(s.length);
  return '*'.repeat(s.length - keep) + s.slice(-keep);
};

const redactPayloadForAudit = (payload) => {
  const clone = JSON.parse(JSON.stringify(payload || {}));
  if (clone.finacleAccountNumber) clone.finacleAccountNumber = maskTail(clone.finacleAccountNumber, 4);
  if (clone.borrower) {
    if (clone.borrower.mobile) clone.borrower.mobile = maskTail(clone.borrower.mobile, 4);
    if (clone.borrower.pan) clone.borrower.pan = maskTail(clone.borrower.pan, 4);
    if (clone.borrower.aadhaar) clone.borrower.aadhaar = maskTail(clone.borrower.aadhaar, 4);
  }
  return clone;
};

/**
 * Pushes a loan origination request to Finacle LOS.
 * Called when a DICE loan application is approved and ready for bank processing.
 */
const pushLoanOrigination = async (applicationId) => {
  const { LoanApplication, LoanProduct, User, FinacleIntegrationEvent } = getDb();

  const application = await LoanApplication.findOne({
    where: { id: applicationId, is_active: true },
    include: [
      { model: LoanProduct, as: 'product' },
      { model: User, as: 'farmer', attributes: ['id', 'first_name', 'last_name', 'mobile'] },
    ],
  });

  if (!application) throw new Error('Application not found');

  const payload = {
    requestType: 'LOAN_ORIGINATION',
    farmerPayApplicationId: application.application_uuid,
    borrower: {
      name: `${application.farmer.first_name} ${application.farmer.last_name}`,
      mobile: application.farmer.mobile,
      farmerPayId: application.farmer_id,
    },
    loanDetails: {
      productCode: application.product ? application.product.product_code : null,
      requestedAmount: application.apply_for_amount,
      approvedAmount: application.approval_amount,
      tenure: application.approval_tenure_months,
      interestRate: application.approval_interest_rate,
      repaymentType: application.repayment_type || 'emi',
      collateralType: application.collateral_type || 'none',
      isGoldLoan: application.is_gold_loan || false,
      pslClassification: application.psl_classification || null,
      endUseDeclaration: application.end_use_declaration || null,
    },
    riskAssessment: {
      trustScore: application.risk_score,
    },
    timestamp: new Date().toISOString(),
  };

  const event = await FinacleIntegrationEvent.create({
    event_uuid: uuidv4(),
    direction: 'outbound',
    event_type: 'loan_origination_push',
    application_id: applicationId,
    farmer_id: application.farmer_id,
    request_payload: redactPayloadForAudit(payload),
    processing_status: 'processed',
    processed_at: new Date(),
  });

  logger.info(`Loan origination pushed to Finacle queue: application ${applicationId}`);
  return { eventId: event.id, payload };
};

/**
 * Pushes a loan APPROVAL to Finacle LOS.
 * Called when a banker approves a previously-submitted application
 * via the loan inbox in banker-dashboard.html or /admin/loans. The
 * approval event carries the final sanction details (amount, rate,
 * tenure, banker-id, timestamp) so the bank's CBS worker can book
 * the sanction against the farmerPayApplicationId that was queued
 * at submit time.
 */
const pushLoanApproval = async (applicationId) => {
  const { LoanApplication, LoanProduct, User, FinacleIntegrationEvent } = getDb();

  const application = await LoanApplication.findOne({
    where: { id: applicationId, is_active: true },
    include: [
      { model: LoanProduct, as: 'product' },
      { model: User, as: 'farmer', attributes: ['id', 'first_name', 'last_name', 'mobile'] },
    ],
  });

  if (!application) throw new Error('Application not found');

  const payload = {
    requestType: 'LOAN_APPROVAL',
    farmerPayApplicationId: application.application_uuid,
    borrower: {
      name: `${application.farmer.first_name} ${application.farmer.last_name}`,
      mobile: application.farmer.mobile,
      farmerPayId: application.farmer_id,
    },
    approval: {
      productCode: application.product ? application.product.product_code : null,
      approvedAmount: application.approval_amount,
      approvedInterestRate: application.approval_interest_rate,
      approvedTenureMonths: application.approval_tenure_months,
      approvedByBankUserId: application.approved_by_bank_user,
      approvedAt: application.approved_at,
    },
    originalRequest: {
      requestedAmount: application.apply_for_amount,
      requestedTenureMonths: application.apply_for_tenure_months,
      sofCostPerHectare: application.sof_cost_per_hectare,
      nabardBenchmarkPerHectare: application.nabard_benchmark_per_hectare,
      calculatedRecommendedAmount: application.calculated_recommended_amount,
      sizingMethod: application.sizing_method,
    },
    timestamp: new Date().toISOString(),
  };

  // NOTE: The finacle_integration_events.event_type enum doesn't have
  // a dedicated 'loan_approval_push' value yet. We reuse the existing
  // 'loan_origination_push' type and discriminate via
  // request_payload.requestType = 'LOAN_APPROVAL'. A future migration
  // can add the dedicated enum value + back-fill old rows if needed.
  const event = await FinacleIntegrationEvent.create({
    event_uuid: uuidv4(),
    direction: 'outbound',
    event_type: 'loan_origination_push',
    application_id: applicationId,
    farmer_id: application.farmer_id,
    request_payload: redactPayloadForAudit(payload),
    processing_status: 'processed',
    processed_at: new Date(),
  });

  logger.info(`Loan approval pushed to Finacle queue: application ${applicationId}`);
  return { eventId: event.id, payload };
};

/**
 * Pushes insurance enrollment to Finacle for Standing Instruction setup.
 */
const pushInsuranceEnrollment = async (enrollmentId) => {
  const { InsuranceEnrollment, User, FinacleIntegrationEvent } = getDb();

  const enrollment = await InsuranceEnrollment.findOne({
    where: { id: enrollmentId, is_active: true },
    include: [{ model: User, as: 'farmer', attributes: ['id', 'first_name', 'last_name', 'mobile'] }],
  });

  if (!enrollment) throw new Error('Insurance enrollment not found');

  const payload = {
    requestType: 'INSURANCE_ENROLLMENT',
    farmerPayEnrollmentId: enrollment.enrollment_uuid,
    borrower: {
      name: `${enrollment.farmer.first_name} ${enrollment.farmer.last_name}`,
      mobile: enrollment.farmer.mobile,
    },
    insurance: {
      type: enrollment.insurance_type,
      insurerName: enrollment.insurer_name,
      policyNumber: enrollment.policy_number,
      sumInsured: enrollment.sum_insured,
      premiumAmount: enrollment.premium_paid,
      premiumSubsidy: enrollment.premium_subsidy,
      cropInsured: enrollment.crop_insured,
      season: enrollment.season,
      linkedLoanId: enrollment.linked_loan_id,
    },
    timestamp: new Date().toISOString(),
  };

  const event = await FinacleIntegrationEvent.create({
    event_uuid: uuidv4(),
    direction: 'outbound',
    event_type: 'insurance_enrollment_push',
    farmer_id: enrollment.farmer_id,
    request_payload: redactPayloadForAudit(payload),
    processing_status: 'processed',
    processed_at: new Date(),
  });

  logger.info(`Insurance enrollment pushed to Finacle: ${enrollmentId}`);
  return { eventId: event.id, payload };
};

/**
 * Pushes end-use verification score to Finacle loan remarks.
 */
const pushEndUseVerification = async (applicationId) => {
  const { EndUseScoreLog, PslComplianceTracker, BankLoanAccount, FinacleIntegrationEvent } = getDb();

  const endUse = await EndUseScoreLog.findOne({
    where: { application_id: applicationId, is_active: true },
    order: [['scoring_date', 'DESC']],
  });

  const psl = await PslComplianceTracker.findOne({
    where: { application_id: applicationId, is_active: true },
  });

  const bankAccount = await BankLoanAccount.findOne({
    where: { linked_application_id: applicationId, is_active: true },
  });

  const payload = {
    requestType: 'ENDUSE_VERIFICATION',
    finacleAccountNumber: bankAccount ? bankAccount.finacle_account_number : null,
    farmerPayApplicationId: applicationId,
    endUseScore: endUse ? endUse.use_match_percentage : null,
    diversionDetected: endUse ? endUse.diversion_detected : false,
    pslClassification: psl ? psl.current_classification : null,
    pslReclassified: psl ? psl.reclassified : false,
    agriSpendPercentage: psl ? psl.agri_spend_percentage : null,
    scoringDate: endUse ? endUse.scoring_date : null,
    timestamp: new Date().toISOString(),
  };

  const event = await FinacleIntegrationEvent.create({
    event_uuid: uuidv4(),
    direction: 'outbound',
    event_type: 'enduse_verification_push',
    finacle_account_number: bankAccount ? bankAccount.finacle_account_number : null,
    application_id: applicationId,
    request_payload: redactPayloadForAudit(payload),
    processing_status: 'processed',
    processed_at: new Date(),
  });

  logger.info(`End-use verification pushed for application ${applicationId}`);
  return { eventId: event.id, payload };
};

/**
 * Pushes pre-delinquency alert to Finacle officer notification.
 */
const pushPreDelinquencyAlert = async (applicationId, rssScore, rssData) => {
  const { BankLoanAccount, FinacleIntegrationEvent } = getDb();

  const bankAccount = await BankLoanAccount.findOne({
    where: { linked_application_id: applicationId, is_active: true },
  });

  const payload = {
    requestType: 'PRE_DELINQUENCY_ALERT',
    finacleAccountNumber: bankAccount ? bankAccount.finacle_account_number : null,
    alertSeverity: rssScore < 30 ? 'CRITICAL' : rssScore < 50 ? 'HIGH' : 'MEDIUM',
    rssScore,
    rssBand: rssScore >= 70 ? 'GREEN' : rssScore >= 50 ? 'YELLOW' : rssScore >= 30 ? 'ORANGE' : 'RED',
    components: rssData || {},
    predictedSmaDate: rssScore < 40 ? 'Within 30 days' : 'Within 90 days',
    recommendedAction: rssScore < 30 ? 'Immediate field visit and restructuring discussion'
      : rssScore < 50 ? 'RM engagement and payment reminder escalation'
      : 'Proactive monitoring',
    timestamp: new Date().toISOString(),
  };

  const event = await FinacleIntegrationEvent.create({
    event_uuid: uuidv4(),
    direction: 'outbound',
    event_type: 'pre_delinquency_alert',
    finacle_account_number: bankAccount ? bankAccount.finacle_account_number : null,
    application_id: applicationId,
    request_payload: redactPayloadForAudit(payload),
    processing_status: 'processed',
    processed_at: new Date(),
  });

  logger.info(`Pre-delinquency alert pushed: application ${applicationId}, RSS ${rssScore}`);
  return { eventId: event.id, payload };
};

module.exports = {
  pushLoanOrigination, pushLoanApproval, pushInsuranceEnrollment,
  pushEndUseVerification, pushPreDelinquencyAlert,
};
