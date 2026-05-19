/**
 * Sathi Commission Service
 *
 * Core accrual engine. Every FP revenue event attributable to a farmer
 * flows through recordRevenueEvent(), which:
 *   1. Finds the farmer's current active IntermediaryAssignment
 *   2. Writes a SathiCommissionLedger row (20% of gross)
 *   3. Upserts the SathiBeneficiary row and sets first_product_activated_at
 *      on the farmer's first product activation
 *
 * Idempotent on (revenue_event_type, revenue_event_ref_id) — re-firing
 * the same event does not double-credit.
 */

const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

const DEFAULT_COMMISSION_RATE = 0.2;

/**
 * Compute YYYY-MM for a given Date (defaults to now).
 */
const accrualPeriod = (date = new Date()) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

/**
 * Find the active Sathi assignment for a farmer, if any.
 * Returns null when the farmer has no active intermediary.
 */
const findActiveAssignment = async (farmerId) => {
  const { IntermediaryAssignment } = getDb();
  return IntermediaryAssignment.findOne({
    where: { farmer_id: farmerId, assignment_status: 'active', is_active: true },
    order: [['assigned_at', 'DESC']],
  });
};

/**
 * Records a revenue event and (if the farmer has an active Sathi) credits
 * the commission.
 *
 * @param {Object} event
 * @param {number} event.farmerId        Farmer's users.id
 * @param {string} event.eventType       See SathiCommissionLedger.revenue_event_type
 * @param {number} event.grossAmountPaise  Integer paise
 * @param {number} [event.refId]         Polymorphic source id
 * @param {string} [event.productType]   'loan' | 'insurance' | 'activity' — if this event
 *                                        is the farmer's first product, this sets the
 *                                        first_product_type on SathiBeneficiary
 * @param {Sequelize.Transaction} [event.transaction]
 * @returns {Promise<{ledgerId: number|null, skipped: boolean, reason?: string}>}
 */
const recordRevenueEvent = async ({
  farmerId,
  eventType,
  grossAmountPaise,
  refId = null,
  productType = null,
  transaction = null,
}) => {
  const { SathiCommissionLedger, SathiBeneficiary } = getDb();

  if (!farmerId || !eventType || !grossAmountPaise) {
    return { ledgerId: null, skipped: true, reason: 'missing_required_fields' };
  }

  // Idempotency — skip if we've already booked this exact event.
  if (refId) {
    const existing = await SathiCommissionLedger.findOne({
      where: { revenue_event_type: eventType, revenue_event_ref_id: refId },
      transaction,
    });
    if (existing) {
      return { ledgerId: existing.id, skipped: true, reason: 'already_booked' };
    }
  }

  const assignment = await findActiveAssignment(farmerId);
  if (!assignment) {
    logger.info(
      `[sathi-commission] No active assignment for farmer ${farmerId} — skipping ${eventType} (${grossAmountPaise} paise)`
    );
    return { ledgerId: null, skipped: true, reason: 'no_active_sathi' };
  }

  const commissionAmount = Math.round(grossAmountPaise * DEFAULT_COMMISSION_RATE);

  const ledgerRow = await SathiCommissionLedger.create(
    {
      intermediary_id: assignment.intermediary_id,
      farmer_id: farmerId,
      revenue_event_type: eventType,
      revenue_event_ref_id: refId,
      gross_amount_paise: grossAmountPaise,
      commission_rate: DEFAULT_COMMISSION_RATE,
      commission_amount_paise: commissionAmount,
      accrual_period: accrualPeriod(),
      payout_status: 'accrued',
    },
    { transaction }
  );

  // Beneficiary lifecycle — first_product_activated_at set once per farmer.
  const [beneficiary, created] = await SathiBeneficiary.findOrCreate({
    where: {
      intermediary_id: assignment.intermediary_id,
      farmer_id: farmerId,
    },
    defaults: {
      assignment_id: assignment.id,
      status: 'active',
      first_product_activated_at: productType ? new Date() : null,
      first_product_type: productType,
      first_product_ref_id: productType ? refId : null,
      is_counted_for_incentive: Boolean(productType),
    },
    transaction,
  });

  if (!created && productType && !beneficiary.first_product_activated_at) {
    await beneficiary.update(
      {
        first_product_activated_at: new Date(),
        first_product_type: productType,
        first_product_ref_id: refId,
        is_counted_for_incentive: true,
        status: 'active',
      },
      { transaction }
    );
  }

  logger.info(
    `[sathi-commission] Booked ${commissionAmount} paise (${eventType}) for intermediary ${assignment.intermediary_id} / farmer ${farmerId}`
  );

  return { ledgerId: ledgerRow.id, skipped: false };
};

/**
 * Returns the commission ledger for a given intermediary in a period.
 */
const listCommissions = async (intermediaryId, { period = null, limit = 100 } = {}) => {
  const { SathiCommissionLedger } = getDb();
  const where = { intermediary_id: intermediaryId };
  if (period) where.accrual_period = period;
  return SathiCommissionLedger.findAll({
    where,
    order: [['created_at', 'DESC']],
    limit,
  });
};

/**
 * Aggregates commission totals by period for a dashboard.
 */
const getTotals = async (intermediaryId, { period = null } = {}) => {
  const rows = await listCommissions(intermediaryId, { period, limit: 10000 });
  const totals = rows.reduce(
    (acc, row) => {
      acc.gross += Number(row.gross_amount_paise);
      acc.commission += Number(row.commission_amount_paise);
      acc.count += 1;
      return acc;
    },
    { gross: 0, commission: 0, count: 0 }
  );
  return totals;
};

module.exports = {
  recordRevenueEvent,
  listCommissions,
  getTotals,
  accrualPeriod,
  findActiveAssignment,
  DEFAULT_COMMISSION_RATE,
};
