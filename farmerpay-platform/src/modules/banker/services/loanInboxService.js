/**
 * Loan Inbox Service
 *
 * Banker-side operations on loan_applications rows submitted by
 * farmers via /loan-journey. Closes the loop on the origination flow:
 *
 *   farmer submits  -> status='submitted' + finacle origination push
 *   banker claims   -> status='under_review' + status history row
 *   banker approves -> status='approved' + approval_* fields set
 *                      + status history + finacle approval push
 *   banker rejects  -> status='rejected' + rejected_reason
 *                      + status history
 *
 * All transitions share a single transitionStatus() helper that locks
 * the row, verifies the current status is in a whitelist of valid
 * from-statuses (so concurrent bankers can't double-approve), updates
 * the row with the new status + extra fields, and writes an audit row
 * to loan_application_status_history.
 *
 * The service is Tier-1 from the banker's perspective — the existing
 * bankerRoutes.js mounts authenticate + roleCheck('dice_analyst',
 * 'system_admin', 'FARMER') in front of everything.
 */

const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');
const { buildMeta } = require('../../../shared/utils/paginationHelper');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

// ─── Shared transition helper ─────────────────────────────────────

/**
 * Locks the application row, verifies the current status, applies the
 * update + extra fields, and writes a status history row. Returns the
 * updated application. Throws a 404 if not found, 409 if the status
 * isn't in `fromStatuses`.
 */
const transitionStatus = async ({
  applicationId,
  fromStatuses,
  toStatus,
  bankerId,
  reason,
  extraFields = {},
}) => {
  const { LoanApplication, LoanApplicationStatusHistory, sequelize } = getDb();

  return sequelize.transaction(async (t) => {
    const app = await LoanApplication.findOne({
      where: { id: applicationId, is_active: true },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    if (!app) {
      const err = new Error('Application not found');
      err.statusCode = 404;
      err.errorCode = 'RES_001';
      throw err;
    }
    if (!fromStatuses.includes(app.application_status)) {
      const err = new Error(
        `Cannot transition from ${app.application_status} to ${toStatus}. Expected current status in [${fromStatuses.join(', ')}].`,
      );
      err.statusCode = 409;
      err.errorCode = 'STATE_001';
      throw err;
    }

    const fromStatus = app.application_status;
    const updates = { application_status: toStatus, ...extraFields };
    await app.update(updates, { transaction: t });

    await LoanApplicationStatusHistory.create(
      {
        application_id: app.id,
        from_status: fromStatus,
        to_status: toStatus,
        transitioned_by: bankerId,
        transition_reason: reason || `Banker transition to ${toStatus}`,
      },
      { transaction: t },
    );

    logger.info(
      `Loan application ${app.id} transitioned ${fromStatus} -> ${toStatus} by banker ${bankerId}`,
    );

    return app;
  });
};

// ─── List the inbox ───────────────────────────────────────────────

/**
 * Lists loan applications filtered by status, paginated. Optionally
 * filters by district (from input_cost_breakdown.land_context) and
 * free-text search on farmer name / mobile / application uuid.
 */
const listApplications = async (
  { status, district, search } = {},
  { page, limit, offset } = {},
) => {
  const { LoanApplication, LoanProduct, LoanProvider, User } = getDb();

  const where = { is_active: true };
  if (status) {
    // Accept comma-separated list so the SPA can pass
    // ?status=submitted,under_review
    const statuses = Array.isArray(status) ? status : String(status).split(',');
    where.application_status = { [Op.in]: statuses };
  } else {
    // Default: show the two actionable statuses for the inbox
    where.application_status = { [Op.in]: ['submitted', 'under_review'] };
  }

  const farmerWhere = {};
  if (search) {
    farmerWhere[Op.or] = [
      { first_name: { [Op.like]: `%${search}%` } },
      { last_name: { [Op.like]: `%${search}%` } },
      { mobile: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await LoanApplication.findAndCountAll({
    where,
    include: [
      {
        model: LoanProduct,
        as: 'product',
        attributes: ['product_name'],
        include: [
          { model: LoanProvider, as: 'provider', attributes: ['provider_name'] },
        ],
      },
      {
        model: User,
        as: 'farmer',
        attributes: ['id', 'first_name', 'last_name', 'mobile'],
        where: Object.keys(farmerWhere).length ? farmerWhere : undefined,
        required: !!Object.keys(farmerWhere).length,
      },
    ],
    order: [['applied_at', 'DESC']],
    limit,
    offset,
  });

  const now = Date.now();
  const mapped = rows
    .map((a) => {
      const breakdown = a.input_cost_breakdown || {};
      const landContext = breakdown.land_context || {};
      // Optional district filter (post-query since it's in a JSON col)
      if (district && landContext.district !== district) return null;

      const appliedMs = a.applied_at ? new Date(a.applied_at).getTime() : now;
      const daysWaiting = Math.max(0, Math.floor((now - appliedMs) / (1000 * 60 * 60 * 24)));
      const requested = parseFloat(a.apply_for_amount || 0);
      const sofTotal = parseFloat(a.sof_cost_per_hectare || 0)
        * parseFloat(landContext.areaHectares || 0);
      const overSof = sofTotal > 0 && requested > sofTotal;

      return {
        applicationId: a.id,
        applicationUuid: a.application_uuid,
        farmerId: a.farmer_id,
        farmerName: a.farmer
          ? `${a.farmer.first_name || ''} ${a.farmer.last_name || ''}`.trim() || '—'
          : '—',
        farmerMobile: a.farmer?.mobile || null,
        productName: a.product?.product_name || 'Loan',
        providerName: a.product?.provider?.provider_name || null,
        appliedAmount: requested,
        calculatedRecommendedAmount: parseFloat(a.calculated_recommended_amount || 0) || null,
        sofCostPerHectare: parseFloat(a.sof_cost_per_hectare || 0) || null,
        nabardBenchmarkPerHectare: parseFloat(a.nabard_benchmark_per_hectare || 0) || null,
        sofTotalForArea: sofTotal > 0 ? Math.round(sofTotal) : null,
        landContext,
        intendedUse: a.intended_use,
        sizingMethod: a.sizing_method,
        hasOverSofFlag: overSof,
        status: a.application_status,
        appliedAt: a.applied_at,
        daysWaiting,
      };
    })
    .filter(Boolean);

  return {
    rows: mapped,
    meta: buildMeta(page || 1, limit || 20, district ? mapped.length : count),
  };
};

// ─── Get one application with full detail ────────────────────────

const getApplicationDetail = async (applicationId) => {
  const {
    LoanApplication,
    LoanApplicationStatusHistory,
    LoanApplicationDocument,
    LoanProduct,
    LoanProvider,
    User,
    FinacleIntegrationEvent,
  } = getDb();

  const application = await LoanApplication.findOne({
    where: { id: applicationId, is_active: true },
    include: [
      {
        model: LoanProduct,
        as: 'product',
        include: [{ model: LoanProvider, as: 'provider' }],
      },
      { model: User, as: 'farmer', attributes: ['id', 'first_name', 'last_name', 'mobile'] },
    ],
  });
  if (!application) {
    const err = new Error('Application not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const statusHistory = await LoanApplicationStatusHistory.findAll({
    where: { application_id: applicationId },
    order: [['created_at', 'ASC']],
  });

  const documents = await LoanApplicationDocument.findAll({
    where: { application_id: applicationId, is_active: true },
    order: [['created_at', 'ASC']],
  });

  const finacleEvents = await FinacleIntegrationEvent.findAll({
    where: { application_id: applicationId },
    order: [['created_at', 'ASC']],
  });

  return {
    application: {
      applicationId: application.id,
      applicationUuid: application.application_uuid,
      farmerId: application.farmer_id,
      farmerName: application.farmer
        ? `${application.farmer.first_name || ''} ${application.farmer.last_name || ''}`.trim()
        : '—',
      farmerMobile: application.farmer?.mobile || null,
      productName: application.product?.product_name || 'Loan',
      providerName: application.product?.provider?.provider_name || null,
      minInterestRate: parseFloat(application.product?.min_interest_rate || 0) || null,
      maxInterestRate: parseFloat(application.product?.max_interest_rate || 0) || null,
      status: application.application_status,
      appliedAmount: parseFloat(application.apply_for_amount || 0),
      appliedTenureMonths: application.apply_for_tenure_months,
      intendedUse: application.intended_use,
      sofId: application.sof_id,
      sofCostPerHectare: parseFloat(application.sof_cost_per_hectare || 0) || null,
      nabardBenchmarkPerHectare: parseFloat(application.nabard_benchmark_per_hectare || 0) || null,
      calculatedRecommendedAmount: parseFloat(application.calculated_recommended_amount || 0) || null,
      amountAboveSof: parseFloat(application.amount_above_sof || 0) || null,
      sizingMethod: application.sizing_method,
      inputCostBreakdown: application.input_cost_breakdown || null,
      landContext: (application.input_cost_breakdown || {}).land_context || null,
      approvalAmount: parseFloat(application.approval_amount || 0) || null,
      approvalInterestRate: parseFloat(application.approval_interest_rate || 0) || null,
      approvalTenureMonths: application.approval_tenure_months,
      approvedByBankUser: application.approved_by_bank_user,
      approvedAt: application.approved_at,
      rejectedReason: application.rejected_reason,
      appliedAt: application.applied_at,
    },
    statusHistory: statusHistory.map((h) => ({
      id: h.id,
      fromStatus: h.from_status,
      toStatus: h.to_status,
      transitionReason: h.transition_reason,
      transitionedBy: h.transitioned_by,
      at: h.created_at,
    })),
    documents: documents.map((d) => ({
      documentRowId: d.id,
      documentType: d.document_type,
      isMandatory: d.is_mandatory,
      verified: d.verified,
      uploadedAt: d.created_at,
    })),
    finacleEvents: finacleEvents.map((e) => ({
      eventId: e.id,
      eventType: e.event_type,
      direction: e.direction,
      processingStatus: e.processing_status,
      createdAt: e.created_at,
    })),
  };
};

// ─── Transition actions ──────────────────────────────────────────

const claimApplication = async (applicationId, bankerId) => {
  const app = await transitionStatus({
    applicationId,
    fromStatuses: ['submitted'],
    toStatus: 'under_review',
    bankerId,
    reason: 'Claimed by banker for review',
  });
  return { applicationId: app.id, status: app.application_status };
};

const approveApplication = async (
  applicationId,
  bankerId,
  { approvalAmount, approvalInterestRate, approvalTenureMonths, notes },
) => {
  const app = await transitionStatus({
    applicationId,
    fromStatuses: ['submitted', 'under_review'],
    toStatus: 'approved',
    bankerId,
    reason: notes || 'Approved by banker',
    extraFields: {
      approval_amount: approvalAmount,
      approval_interest_rate: approvalInterestRate,
      approval_tenure_months: approvalTenureMonths,
      approved_by_bank_user: bankerId,
      approved_at: new Date(),
    },
  });

  // Queue a second Finacle outbound event for the approval so the
  // bank's CBS worker knows a new sanction is ready to book.
  try {
    const finacleOutboundService = require('../../bank/services/finacleOutboundService');
    await finacleOutboundService.pushLoanApproval(app.id);
  } catch (e) {
    logger.warn(`Finacle approval push failed for application ${app.id}: ${e.message}`);
  }

  // Sathi commission hook — if the farmer has an active Sathi assignment,
  // credit 20% of the loan processing fee as commission. Fire-and-forget;
  // a failure here must NOT block loan approval.
  try {
    const sathiCommissionService = require('../../choice/services/sathiCommissionService');
    // Processing fee = 1% of approval amount in paise (platform default).
    // If the dice module tracks a real fee column, substitute it here.
    const grossFeePaise = Math.round(Number(approvalAmount || 0) * 100 * 0.01);
    if (grossFeePaise > 0) {
      await sathiCommissionService.recordRevenueEvent({
        farmerId: app.farmer_id,
        eventType: 'loan_processing_fee',
        grossAmountPaise: grossFeePaise,
        refId: app.id,
        productType: 'loan',
      });
    }
  } catch (e) {
    logger.warn(`Sathi commission hook failed for application ${app.id}: ${e.message}`);
  }

  return { applicationId: app.id, status: app.application_status };
};

const rejectApplication = async (applicationId, bankerId, { rejectionReason }) => {
  const app = await transitionStatus({
    applicationId,
    fromStatuses: ['submitted', 'under_review'],
    toStatus: 'rejected',
    bankerId,
    reason: rejectionReason || 'Rejected by banker',
    extraFields: {
      rejected_reason: rejectionReason || null,
    },
  });
  return { applicationId: app.id, status: app.application_status };
};

module.exports = {
  listApplications,
  getApplicationDetail,
  claimApplication,
  approveApplication,
  rejectApplication,
};
