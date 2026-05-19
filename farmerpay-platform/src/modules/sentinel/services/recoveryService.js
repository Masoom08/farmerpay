/**
 * Recovery Service
 * Recovery case management and action logging.
 */

const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

/**
 * Lists recovery cases with optional filtering.
 */
const getRecoveryCases = async (filters = {}) => {
  const { RecoveryCase, LoanApplication } = getDb();

  const where = { is_active: true };
  if (filters.caseStage) where.recovery_case_stage = filters.caseStage;

  const limit = filters.limit || 20;
  const offset = filters.offset || 0;

  // Scope by requesting officer, same as sentinel/portfolio. `bankUserId`
  // is forced to req.user.id for BANK_OFFICER callers at the controller
  // layer; ADMIN can omit and see every bank's recovery cases.
  const applicationWhere = { is_active: true };
  if (filters.bankUserId) {
    const bankerId = parseInt(filters.bankUserId, 10);
    if (!Number.isNaN(bankerId)) {
      applicationWhere[Op.or] = [
        { reviewed_by: bankerId },
        { checker_id: bankerId },
      ];
    }
  } else {
    logger.warn(
      'sentinel.recovery cases called without bankUserId filter — returning unscoped view. ' +
      'Expect ADMIN callers only.'
    );
  }

  const { count, rows } = await RecoveryCase.findAndCountAll({
    where,
    include: [
      {
        model: LoanApplication,
        as: 'application',
        where: applicationWhere,
        required: true,
        attributes: ['id', 'farmer_id'],
      },
    ],
    order: [['recovery_case_opened_date', 'DESC']],
    limit,
    offset,
  });

  return {
    cases: rows.map((c) => ({
      caseId: c.id,
      caseUuid: c.case_uuid,
      applicationId: c.application_id,
      stage: c.recovery_case_stage,
      openedDate: c.recovery_case_opened_date,
      totalRecoveryAmount: c.total_recovery_amount,
      remainingAmount: c.remaining_recovery_amount,
      recoveryProbability: c.recovery_probability_percent,
      lastAttemptDate: c.last_recovery_attempt_date,
    })),
    total: count,
  };
};

/**
 * Retrieves a single recovery case with action logs.
 */
const getRecoveryCase = async (caseId, { bankerId = null } = {}) => {
  const { RecoveryCase, RecoveryActionLog, LoanApplication } = getDb();

  const recoveryCase = await RecoveryCase.findOne({
    where: { id: caseId, is_active: true },
    include: [
      {
        model: RecoveryActionLog,
        as: 'actionLogs',
        where: { is_active: true },
        required: false,
        order: [['recovery_action_date', 'DESC']],
      },
      {
        model: LoanApplication,
        as: 'application',
        attributes: ['id', 'farmer_id', 'reviewed_by', 'checker_id'],
      },
    ],
  });

  if (!recoveryCase) {
    const err = new Error('Recovery case not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  // IDOR guard: a non-admin banker may only read cases on loans they touched.
  // ADMIN callers pass bankerId=null to skip this gate.
  if (bankerId !== null) {
    const app = recoveryCase.application;
    const touched = app && (app.reviewed_by === bankerId || app.checker_id === bankerId);
    if (!touched) {
      const err = new Error('Forbidden: recovery case outside your portfolio');
      err.statusCode = 403;
      err.errorCode = 'SENTINEL_CASE_FORBIDDEN';
      throw err;
    }
  }

  return {
    case: {
      caseId: recoveryCase.id,
      caseUuid: recoveryCase.case_uuid,
      applicationId: recoveryCase.application_id,
      stage: recoveryCase.recovery_case_stage,
      openedDate: recoveryCase.recovery_case_opened_date,
      totalRecoveryAmount: recoveryCase.total_recovery_amount,
      remainingAmount: recoveryCase.remaining_recovery_amount,
      recoveryProbability: recoveryCase.recovery_probability_percent,
    },
    actionLogs: (recoveryCase.actionLogs || []).map((a) => ({
      actionType: a.recovery_action_type,
      date: a.recovery_action_date,
      notes: a.recovery_action_notes,
      amountPursued: a.recovery_amount_pursued,
      amountReceived: a.recovery_amount_received,
    })),
  };
};

/**
 * Logs a new recovery action for a case.
 */
const createRecoveryAction = async (caseId, userId, data) => {
  const { RecoveryCase, RecoveryActionLog } = getDb();

  const recoveryCase = await RecoveryCase.findOne({
    where: { id: caseId, is_active: true },
  });
  if (!recoveryCase) {
    const err = new Error('Recovery case not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  // Warn on probable PII in note text. Bankers often paste phone numbers,
  // account numbers, or Aadhaar fragments into free-text notes; we don't
  // reject them (operators may legitimately need to reference them) but
  // flag via structured log so compliance can spot patterns.
  if (data.notes) {
    const patterns = [
      /\b\d{10}\b/,                        // 10-digit phone / mobile
      /\b\d{12}\b/,                        // Aadhaar
      /\b[A-Z]{5}\d{4}[A-Z]\b/,           // PAN
      /\b\d{9,18}\b/,                      // bank account numbers
    ];
    if (patterns.some((re) => re.test(data.notes))) {
      logger.warn('sentinel.recovery_note_pii_suspected', {
        event: 'sentinel.recovery_note_pii_suspected',
        caseId, userId, noteLength: data.notes.length,
      });
    }
  }

  const actionLog = await RecoveryActionLog.create({
    log_uuid: uuidv4(),
    recovery_case_id: caseId,
    recovery_action_type: data.actionType,
    recovery_action_date: data.actionDate || new Date(),
    recovery_action_by: userId,
    recovery_action_notes: data.notes || null,
    recovery_amount_pursued: data.amountPursued || null,
  });

  // Update last attempt date on case
  await recoveryCase.update({
    last_recovery_attempt_date: data.actionDate || new Date(),
  });

  logger.info(`Recovery action ${data.actionType} logged for case ${caseId}`);
  return { actionLog };
};

/**
 * Creates a new recovery case for a defaulted / NPA loan.
 * Validates that the loan is in NPA / defaulted status before opening a case.
 * @param {number} loanApplicationId
 * @param {string} reason - Reason for opening recovery case
 * @returns {Promise<Object>}
 */
const createRecoveryCase = async (loanApplicationId, reason) => {
  const { LoanApplication, RecoveryCase, LoanHealthSnapshot } = getDb();

  const application = await LoanApplication.findOne({
    where: { id: loanApplicationId, is_active: true },
  });
  if (!application) {
    const err = new Error('Loan application not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  // Validate the loan qualifies for recovery (NPA or defaulted)
  const snapshot = await LoanHealthSnapshot.findOne({
    where: { application_id: loanApplicationId, is_active: true },
    order: [['snapshot_date', 'DESC']],
  });

  const healthStatus = snapshot ? snapshot.health_status : null;
  const daysOverdue = snapshot ? (snapshot.days_overdue || 0) : 0;

  if (healthStatus !== 'npa' && daysOverdue <= 90) {
    const err = new Error('Recovery case can only be created for NPA or defaulted loans (>90 days overdue)');
    err.statusCode = 400;
    err.errorCode = 'REC_001';
    throw err;
  }

  // Check if a recovery case already exists for this application
  const existingCase = await RecoveryCase.findOne({
    where: { application_id: loanApplicationId, is_active: true },
  });
  if (existingCase) {
    const err = new Error('A recovery case already exists for this application');
    err.statusCode = 409;
    err.errorCode = 'REC_002';
    throw err;
  }

  const totalOutstanding = snapshot
    ? parseFloat(snapshot.total_outstanding || 0)
    : parseFloat(application.loan_amount_approved || application.loan_amount_requested || 0);

  const recoveryCase = await RecoveryCase.create({
    case_uuid: uuidv4(),
    application_id: loanApplicationId,
    recovery_case_stage: 'early_recovery',
    recovery_case_opened_date: new Date(),
    recovery_reason: reason || 'NPA classification',
    total_recovery_amount: totalOutstanding,
    remaining_recovery_amount: totalOutstanding,
    recovery_probability_percent: 60, // initial estimate
    days_overdue_at_opening: daysOverdue,
  });

  logger.info(`Recovery case created for application ${loanApplicationId}: case=${recoveryCase.id}, stage=early_recovery`);

  return {
    caseId: recoveryCase.id,
    caseUuid: recoveryCase.case_uuid,
    applicationId: loanApplicationId,
    stage: 'early_recovery',
    openedDate: recoveryCase.recovery_case_opened_date,
    totalRecoveryAmount: totalOutstanding,
    reason: recoveryCase.recovery_reason,
  };
};

/**
 * Logs a recovery action for an existing case.
 * @param {number} caseId
 * @param {Object} params
 * @param {string} params.actionType - phone_call | field_visit | legal_notice | sarfaesi | lok_adalat | settlement | write_off
 * @param {string} params.notes
 * @param {string} params.outcome - positive | neutral | negative
 * @returns {Promise<Object>}
 */
const logRecoveryAction = async (caseId, { actionType, notes, outcome }) => {
  const { RecoveryCase, RecoveryActionLog } = getDb();

  const recoveryCase = await RecoveryCase.findOne({
    where: { id: caseId, is_active: true },
  });
  if (!recoveryCase) {
    const err = new Error('Recovery case not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const actionLog = await RecoveryActionLog.create({
    log_uuid: uuidv4(),
    recovery_case_id: caseId,
    recovery_action_type: actionType,
    recovery_action_date: new Date(),
    recovery_action_notes: notes || null,
    recovery_action_outcome: outcome || null,
  });

  // Update last attempt date
  await recoveryCase.update({
    last_recovery_attempt_date: new Date(),
  });

  logger.info(`Recovery action logged: case=${caseId}, type=${actionType}, outcome=${outcome}`);

  return {
    logId: actionLog.id,
    logUuid: actionLog.log_uuid,
    caseId,
    actionType,
    notes,
    outcome,
    actionDate: actionLog.recovery_action_date,
  };
};

module.exports = {
  getRecoveryCases,
  getRecoveryCase,
  createRecoveryAction,
  createRecoveryCase,
  logRecoveryAction,
};
