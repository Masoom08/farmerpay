/**
 * Finacle Webhook Service
 * Processes inbound events from Finacle CBS via middleware/Event Hub.
 * Routes events to appropriate FarmerPay services.
 *
 * Finacle Menu Code → FarmerPay Action:
 *   HLADISB (disbursement)  → Create gold monitoring case in SENTINEL
 *   Collection flow         → Update DICE repayment, recalculate RSS
 *   Asset classification    → Update SMA in dashboard
 *   CAACLA (closure)        → Close monitoring case, trigger gold return
 *   Loan modification       → Detect evergreening, enforce fresh TRUST check
 *   HSCLM (collateral)      → Update gold_loan_collaterals LTV
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

/**
 * Verifies HMAC-SHA256 signature on inbound webhook.
 */
const verifyHmac = (payload, signature, secret) => {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};

/**
 * Processes an inbound Finacle webhook event.
 */
const processWebhookEvent = async (eventType, payload, meta = {}) => {
  const { FinacleIntegrationEvent, BankLoanAccount } = getDb();

  // Idempotency check
  const idempotencyKey = meta.idempotencyKey || `${eventType}-${payload.accountNumber}-${Date.now()}`;
  const existing = await FinacleIntegrationEvent.findOne({ where: { idempotency_key: idempotencyKey } });
  if (existing) {
    logger.info(`Duplicate webhook ignored: ${idempotencyKey}`);
    return { status: 'ignored', reason: 'duplicate' };
  }

  // Log the event
  const event = await FinacleIntegrationEvent.create({
    event_uuid: uuidv4(),
    direction: 'inbound',
    event_type: eventType,
    finacle_account_number: payload.accountNumber || null,
    finacle_cif_id: payload.cifId || null,
    finacle_menu_code: payload.menuCode || null,
    request_payload: payload,
    idempotency_key: idempotencyKey,
    processing_status: 'processing',
    hmac_signature: meta.hmacSignature || null,
    hmac_verified: meta.hmacVerified || null,
    source_ip: meta.sourceIp || null,
  });

  try {
    // Find matching bank loan account
    let loanAccount = null;
    if (payload.accountNumber) {
      loanAccount = await BankLoanAccount.findOne({
        where: { finacle_account_number: payload.accountNumber, is_active: true },
      });
      if (loanAccount) {
        await event.update({ bank_loan_account_id: loanAccount.id });
      }
    }

    // Route to appropriate handler
    let result;
    switch (eventType) {
      case 'loan_disbursement':
        result = await handleDisbursement(payload, loanAccount);
        break;
      case 'repayment_received':
        result = await handleRepayment(payload, loanAccount);
        break;
      case 'sma_classification_change':
        result = await handleSmaChange(payload, loanAccount);
        break;
      case 'account_closure':
        result = await handleClosure(payload, loanAccount);
        break;
      case 'topup_renewal':
        result = await handleTopup(payload, loanAccount);
        break;
      case 'collateral_valuation_update':
        result = await handleCollateralUpdate(payload, loanAccount);
        break;
      default:
        result = { action: 'logged_only' };
    }

    await event.update({
      processing_status: 'processed',
      response_payload: result,
      processed_at: new Date(),
    });

    logger.info(`Webhook processed: ${eventType} for ${payload.accountNumber}`);
    return { status: 'processed', eventId: event.id, result };

  } catch (err) {
    await event.update({
      processing_status: 'failed',
      failure_reason: err.message,
      retry_count: event.retry_count + 1,
    });
    logger.error(`Webhook failed: ${eventType} — ${err.message}`);
    throw err;
  }
};

// ─── Event Handlers ───────────────────────────────────────────────

/**
 * HLADISB: Loan disbursement → Create SENTINEL gold monitoring case.
 */
const handleDisbursement = async (payload, loanAccount) => {
  const { GoldLoanCollateral, GoldLoanLtvMonitor, LoanHealthSnapshot, BankLoanAccount } = getDb();

  // Update or create bank loan account
  if (!loanAccount) {
    loanAccount = await BankLoanAccount.create({
      account_uuid: uuidv4(),
      finacle_account_number: payload.accountNumber,
      finacle_cif_id: payload.cifId || null,
      borrower_name: payload.borrowerName || null,
      loan_type: 'agri_gold',
      sanction_amount: payload.disbursementAmount,
      sanction_date: new Date(),
      outstanding_amount: payload.disbursementAmount,
      repayment_type: payload.repaymentType === 'BULLET' ? 'bullet' : 'emi',
      disbursement_mode: payload.disbursementMode || 'bank_transfer',
      cash_disbursement_amount: payload.cashAmount || null,
      sma_classification: 'standard',
    });
  }

  // Create initial health snapshot
  await LoanHealthSnapshot.create({
    snapshot_uuid: uuidv4(),
    application_id: loanAccount.linked_application_id || null,
    snapshot_date: new Date(),
    days_overdue: 0,
    principal_outstanding: payload.disbursementAmount,
    total_outstanding: payload.disbursementAmount,
    health_status: 'good',
    health_score: 100,
  });

  // If gold collateral data provided, create collateral record
  if (payload.goldWeightGrams) {
    await GoldLoanCollateral.create({
      collateral_uuid: uuidv4(),
      application_id: loanAccount.linked_application_id || null,
      gross_weight_grams: payload.goldWeightGrams,
      purity_carat: payload.goldPurityCarat || 22.0,
      total_gold_value: payload.goldValuationAmount || null,
      valuation_date: new Date(),
      ltv_at_sanction_pct: payload.ltvAtSanction || null,
      ltv_compliant: true,
    });
  }

  return { action: 'gold_case_created', loanAccountId: loanAccount.id };
};

/**
 * Collection flow: Repayment → Update DICE + recalculate RSS.
 */
const handleRepayment = async (payload, loanAccount) => {
  if (!loanAccount) return { action: 'no_matching_account' };

  await loanAccount.update({
    outstanding_amount: payload.outstandingAfter || loanAccount.outstanding_amount,
    days_past_due: payload.dpdAfter || 0,
    data_as_of_date: new Date(),
  });

  return { action: 'repayment_recorded', newOutstanding: payload.outstandingAfter };
};

/**
 * Asset classification: SMA change → Update dashboard.
 */
const handleSmaChange = async (payload, loanAccount) => {
  const { SmaClassificationLog } = getDb();

  if (!loanAccount) return { action: 'no_matching_account' };

  const smaMap = { 'STANDARD': 'standard', 'SMA-0': 'sma_0', 'SMA-1': 'sma_1', 'SMA-2': 'sma_2', 'NPA': 'npa' };
  const newClass = smaMap[payload.newClassification] || 'standard';

  await loanAccount.update({ sma_classification: newClass });

  if (loanAccount.linked_application_id) {
    await SmaClassificationLog.create({
      log_uuid: uuidv4(),
      application_id: loanAccount.linked_application_id,
      sma_classification: newClass === 'sma_0' ? 'sma_0_30' : newClass === 'sma_1' ? 'sma_30_60' : newClass === 'sma_2' ? 'sma_60_90' : newClass === 'npa' ? 'sma_90_plus' : 'standard',
      classification_date: new Date(),
      classification_reason: payload.reason || 'Finacle sync',
      previous_classification: payload.previousClassification || null,
      classification_trigger: 'monitoring_trigger',
    });
  }

  return { action: 'sma_updated', newClassification: newClass };
};

/**
 * CAACLA: Account closure → Close monitoring case.
 */
const handleClosure = async (payload, loanAccount) => {
  if (!loanAccount) return { action: 'no_matching_account' };

  await loanAccount.update({
    sma_classification: 'standard',
    outstanding_amount: 0,
    is_active: false,
  });

  return { action: 'account_closed' };
};

/**
 * Topup/renewal → Detect evergreening.
 */
const handleTopup = async (payload, loanAccount) => {
  const { RedFlagEvent } = getDb();

  if (!loanAccount) return { action: 'no_matching_account' };

  // Flag potential evergreening if topup without fresh appraisal
  if (loanAccount.linked_application_id && !payload.freshAppraisal) {
    await RedFlagEvent.create({
      event_uuid: uuidv4(),
      application_id: loanAccount.linked_application_id,
      flag_type: 'zero_agri_activity',
      flag_severity: 'high',
      event_description: `Top-up/renewal detected on ${payload.accountNumber} without fresh appraisal — potential evergreening`,
      event_date: new Date(),
      event_timestamp: new Date(),
    });
  }

  return { action: 'topup_flagged', evergreening_risk: !payload.freshAppraisal };
};

/**
 * HSCLM: Collateral valuation update → Recalculate LTV.
 */
const handleCollateralUpdate = async (payload, loanAccount) => {
  const { GoldLoanLtvMonitor } = getDb();

  if (!loanAccount || !loanAccount.linked_application_id) return { action: 'no_matching_account' };

  const currentLtv = loanAccount.outstanding_amount && payload.newValuation
    ? ((parseFloat(loanAccount.outstanding_amount) / parseFloat(payload.newValuation)) * 100).toFixed(2)
    : null;

  await GoldLoanLtvMonitor.create({
    monitor_uuid: uuidv4(),
    application_id: loanAccount.linked_application_id,
    monitor_date: new Date(),
    principal_outstanding: loanAccount.outstanding_amount,
    current_gold_value: payload.newValuation,
    current_ltv_pct: currentLtv,
    ltv_breach: currentLtv > 85,
    margin_call_triggered: currentLtv > 90,
  });

  await loanAccount.update({
    gold_valuation_amount: payload.newValuation,
    gold_valuation_date: new Date(),
  });

  return { action: 'ltv_recalculated', currentLtv };
};

module.exports = { processWebhookEvent, verifyHmac };
