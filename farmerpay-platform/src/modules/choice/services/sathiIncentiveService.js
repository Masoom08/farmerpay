/**
 * Sathi Incentive Service
 *
 * Evaluates the 100-beneficiary milestone for each active Sathi and, when
 * the threshold is crossed in a qualifying period, writes an immutable
 * row to sathi_incentive_ledger (10% bonus on top of the 20% base).
 *
 * Idempotent — the unique index
 *   (intermediary_id, milestone, qualifying_period_start)
 * guarantees one bonus per Sathi per period.
 */

const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

const MILESTONE_THRESHOLD = 100;
const BONUS_RATE = 0.1;

/**
 * Returns [periodStart, periodEnd] for the quarter containing `date`.
 * Quarterly windows chosen so milestone resets per quarter.
 */
const quarterBounds = (date = new Date()) => {
  const y = date.getUTCFullYear();
  const q = Math.floor(date.getUTCMonth() / 3);
  const start = new Date(Date.UTC(y, q * 3, 1));
  const end = new Date(Date.UTC(y, q * 3 + 3, 0));
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
};

/**
 * For a single intermediary in the given period, count beneficiaries whose
 * first_product_activated_at falls inside the window. If >= 100 and we don't
 * yet have a row, create one.
 */
const evaluateForIntermediary = async (intermediaryId, { start, end } = {}) => {
  const { SathiBeneficiary, SathiCommissionLedger, SathiIncentiveLedger, Sequelize } = getDb();
  const [periodStart, periodEnd] = start && end ? [start, end] : quarterBounds();

  const beneficiaryCount = await SathiBeneficiary.count({
    where: {
      intermediary_id: intermediaryId,
      is_counted_for_incentive: true,
      first_product_activated_at: {
        [Sequelize.Op.between]: [`${periodStart} 00:00:00`, `${periodEnd} 23:59:59`],
      },
    },
  });

  if (beneficiaryCount < MILESTONE_THRESHOLD) {
    return { crossed: false, beneficiaryCount };
  }

  // Idempotency — bail out if a row already exists for this period.
  const existing = await SathiIncentiveLedger.findOne({
    where: {
      intermediary_id: intermediaryId,
      milestone: '100_beneficiaries',
      qualifying_period_start: periodStart,
    },
  });
  if (existing) {
    return { crossed: true, existing: true, beneficiaryCount, ledgerId: existing.id };
  }

  // Compute base = sum of commission in the period.
  const baseSumRow = await SathiCommissionLedger.findOne({
    where: {
      intermediary_id: intermediaryId,
      created_at: {
        [Sequelize.Op.between]: [`${periodStart} 00:00:00`, `${periodEnd} 23:59:59`],
      },
    },
    attributes: [
      [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('commission_amount_paise')), 0), 'total'],
    ],
    raw: true,
  });

  const baseAmount = Number(baseSumRow?.total || 0);
  const bonusAmount = Math.round(baseAmount * BONUS_RATE);

  const row = await SathiIncentiveLedger.create({
    intermediary_id: intermediaryId,
    milestone: '100_beneficiaries',
    beneficiary_count_snapshot: beneficiaryCount,
    qualifying_period_start: periodStart,
    qualifying_period_end: periodEnd,
    base_amount_paise: baseAmount,
    bonus_rate: BONUS_RATE,
    bonus_amount_paise: bonusAmount,
    payout_status: 'accrued',
  });

  logger.info(
    `[sathi-incentive] Milestone 100 crossed for intermediary ${intermediaryId} — bonus ${bonusAmount} paise (base ${baseAmount})`
  );
  return { crossed: true, existing: false, beneficiaryCount, ledgerId: row.id };
};

/**
 * Nightly job: evaluate all active intermediaries.
 */
const evaluateMilestones = async () => {
  const { Intermediary } = getDb();
  const intermediaries = await Intermediary.findAll({
    where: { is_active: true },
    attributes: ['id'],
  });

  const results = [];
  for (const i of intermediaries) {
    try {
      const r = await evaluateForIntermediary(i.id);
      if (r.crossed) results.push({ intermediaryId: i.id, ...r });
    } catch (err) {
      logger.error(
        `[sathi-incentive] Failed to evaluate intermediary ${i.id}: ${err.message}`
      );
    }
  }
  return results;
};

/**
 * List the incentive rows for a single intermediary.
 */
const listIncentives = async (intermediaryId) => {
  const { SathiIncentiveLedger } = getDb();
  return SathiIncentiveLedger.findAll({
    where: { intermediary_id: intermediaryId },
    order: [['qualifying_period_start', 'DESC']],
  });
};

module.exports = {
  evaluateForIntermediary,
  evaluateMilestones,
  listIncentives,
  quarterBounds,
  MILESTONE_THRESHOLD,
  BONUS_RATE,
};
