/**
 * PULSE Nudge Service — Phase 2 behavioural nudges for farmers.
 *
 * Returns a list of "nudges" — small contextual prompts that the
 * farmer-app persona home renders as amber banners. Each nudge is a
 * nudge-worthy combination of state across ROOTS (crop cycle),
 * DICE (repayment schedule), and PULSE (mandi price / recommendation)
 * that a farmer should know about but probably hasn't checked.
 *
 * Nudge types shipped in v1:
 *
 *   1. harvest_decision_pending
 *        — farmer has a post_harvest cycle but hasn't run the
 *          sell-or-store wizard (no pulse_sell_recommendations row
 *          for this cycle). Taps → /sell-or-store?cycleId=<uuid>
 *
 *   2. emi_pressure
 *        — next EMI due in <= 14 days AND no harvest sale recorded
 *          in the last 30 days. The farmer is likely about to distress-
 *          sell. Taps → /sell-or-store to help them decide.
 *
 *   3. price_window_closing
 *        — the farmer saved a "Store for 30/45/60d" recommendation
 *          recently, but the mandi price has ALREADY dropped 5% from
 *          the day of the recommendation. Their storage plan is going
 *          sideways. Taps → /sell-or-store?cycleId=<uuid> to re-run.
 *
 * Each nudge carries a severity (low / medium / high) and a CTA.
 * The frontend renders only the highest-severity nudge at a time to
 * avoid banner overload — so the service returns them sorted.
 *
 * Auth: Tier-1 (the farmer reads their own nudges). The controller
 * resolves req.user.id → user.id via the existing resolveUserId
 * helper and passes it in.
 */

const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

/**
 * Get all active nudges for a farmer. Returns an array sorted by
 * severity (high first). The caller typically renders only index 0.
 *
 * @param {number} farmerId - internal users.id PK
 * @returns {Promise<Array<{id, type, severity, title, body, ctaLabel, ctaRoute}>>}
 */
const getActiveNudges = async (farmerId) => {
  if (!farmerId) return [];

  const {
    CultivationCycle, CultivationCycleExpenseSummary, HarvestRecord, HarvestSaleRecord,
    LoanApplication, LoanRepaymentSchedule,
    PulseSellRecommendation, PulseCommodity, PulsePriceRecord,
    CropMaster,
  } = getDb();

  const nudges = [];
  const today = new Date();
  const fourteenDaysFromNow = new Date();
  fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // ── Find all post_harvest cycles for the farmer (used by nudges 1 + 3) ──
  const harvestCycles = await CultivationCycle.findAll({
    where: {
      farmer_id: farmerId,
      cycle_status: { [Op.in]: ['harvesting', 'post_harvest'] },
      is_active: true,
    },
    order: [['cycle_actual_harvest_date', 'DESC']],
    raw: true,
  });

  // ── Nudge 1: harvest_decision_pending ─────────────────────────
  // For each post_harvest cycle, check if there's a sell
  // recommendation row. If not, nudge the farmer to run the wizard.
  for (const cycle of harvestCycles) {
    const existingRec = await PulseSellRecommendation.findOne({
      where: { farmer_id: farmerId, cycle_id: cycle.cycle_uuid, is_active: true },
      raw: true,
    });
    if (existingRec) continue;

    // Get crop name for the banner copy
    const cropMaster = cycle.crop_id
      ? await CropMaster.findOne({ where: { crop_id: cycle.crop_id }, raw: true })
      : null;
    const cropName = cycle.self_declared_crop || cropMaster?.crop_name || 'your harvest';

    nudges.push({
      id: `harvest_decision_${cycle.cycle_uuid}`,
      type: 'harvest_decision_pending',
      severity: 'medium',
      title: `📊 Decide what to do with your ${cropName} harvest`,
      body: 'Run the sell-or-store calculator — takes 2 minutes.',
      ctaLabel: 'Start calculator',
      ctaRoute: `/sell-or-store?cycleId=${cycle.cycle_uuid}`,
      meta: { cycleUuid: cycle.cycle_uuid, cropName },
    });
    break; // one per nudge type
  }

  // ── Nudge 2: emi_pressure ─────────────────────────────────────
  // Check if the next EMI is within 14 days AND there's no recorded
  // harvest sale in the last 30 days.
  const activeLoans = await LoanApplication.findAll({
    where: {
      farmer_id: farmerId,
      is_active: true,
      application_status: { [Op.in]: ['disbursed', 'active', 'approved'] },
    },
    raw: true,
  });

  let nextEmiNearby = null;
  for (const loan of activeLoans) {
    const schedule = await LoanRepaymentSchedule.findOne({
      where: {
        application_id: loan.id,
        is_paid: false,
        is_active: true,
        due_date: { [Op.lte]: fourteenDaysFromNow, [Op.gte]: today },
      },
      order: [['due_date', 'ASC']],
      raw: true,
    });
    if (schedule && (!nextEmiNearby || new Date(schedule.due_date) < new Date(nextEmiNearby.due_date))) {
      nextEmiNearby = schedule;
    }
  }

  if (nextEmiNearby) {
    // Check for recent harvest sales to see if the farmer is
    // already liquid. We look at HarvestSaleRecord joined on
    // HarvestRecord where cycle belongs to this farmer.
    const recentHarvestRecords = await HarvestRecord.findAll({
      where: {
        is_active: true,
        // cycle_id on harvest_records is the cycle_uuid string
        cycle_id: { [Op.in]: harvestCycles.map((c) => c.cycle_uuid) },
      },
      raw: true,
    });
    let hasRecentSale = false;
    if (recentHarvestRecords.length > 0) {
      const recentSales = await HarvestSaleRecord.findOne({
        where: {
          harvest_record_id: { [Op.in]: recentHarvestRecords.map((r) => r.id) },
          sale_date: { [Op.gte]: thirtyDaysAgo },
          is_active: true,
        },
        raw: true,
      });
      hasRecentSale = !!recentSales;
    }

    if (!hasRecentSale) {
      const daysToEmi = Math.ceil(
        (new Date(nextEmiNearby.due_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      const emiAmount = parseFloat(nextEmiNearby.due_amount || 0);
      nudges.push({
        id: `emi_pressure_${nextEmiNearby.id}`,
        type: 'emi_pressure',
        severity: 'high',
        title: `🏦 EMI ₹${Math.round(emiAmount).toLocaleString('en-IN')} due in ${daysToEmi} days`,
        body:
          harvestCycles.length > 0
            ? 'You have a harvest ready. Use the sell-or-store calculator to decide the best way to cover this EMI.'
            : 'Plan your cash flow — tap to see all your options.',
        ctaLabel: harvestCycles.length > 0 ? 'Run calculator' : 'See repayments',
        ctaRoute:
          harvestCycles.length > 0
            ? `/sell-or-store?cycleId=${harvestCycles[0].cycle_uuid}`
            : '/repayments',
        meta: { emiAmount, daysToEmi, dueDate: nextEmiNearby.due_date },
      });
    }
  }

  // ── Nudge 3: price_window_closing ─────────────────────────────
  // Find the most recent "store" recommendation. If the current mandi
  // price has dropped 5%+ from the day of the recommendation, warn.
  const recentRecs = await PulseSellRecommendation.findAll({
    where: {
      farmer_id: farmerId,
      is_active: true,
      optimal_strategy: { [Op.in]: ['store_15d', 'store_30d'] },
      farmer_followed_recommendation: null, // only nudge if feedback not yet given
    },
    order: [['recommendation_generated_date', 'DESC']],
    limit: 3,
    raw: true,
  });

  for (const rec of recentRecs) {
    // Get today's price and the price at the time of the recommendation
    const commodity = await PulseCommodity.findOne({
      where: { commodity_id: rec.commodity_id, is_active: true },
      raw: true,
    });
    if (!commodity) continue;

    const priceThen = parseFloat(rec.recommended_price || 0);
    if (priceThen <= 0) continue;

    const latestPrice = await PulsePriceRecord.findOne({
      where: { commodity_id: rec.commodity_id, is_active: true },
      order: [['record_date', 'DESC']],
      raw: true,
    });
    if (!latestPrice) continue;
    const priceNow = parseFloat(latestPrice.modal_price || latestPrice.closing_price || 0);

    const dropPct = ((priceThen - priceNow) / priceThen) * 100;
    if (dropPct >= 5) {
      nudges.push({
        id: `price_drop_${rec.id}`,
        type: 'price_window_closing',
        severity: 'high',
        title: `📉 ${commodity.commodity_name} price down ${dropPct.toFixed(1)}% since your decision`,
        body: `You planned to store, but prices dropped from ₹${Math.round(priceThen)} to ₹${Math.round(priceNow)}/qtl. Consider re-running the calculator.`,
        ctaLabel: 'Re-run calculator',
        ctaRoute: rec.cycle_id
          ? `/sell-or-store?cycleId=${rec.cycle_id}`
          : '/sell-or-store',
        meta: { recommendationId: rec.id, priceThen, priceNow, dropPct },
      });
      break; // one per nudge type
    }
  }

  // Sort by severity (high first) — the frontend picks nudges[0]
  const severityOrder = { high: 0, medium: 1, low: 2 };
  nudges.sort((a, b) => (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2));

  logger.info(`PULSE nudges for farmer ${farmerId}: ${nudges.length} active`);
  return nudges;
};

/**
 * Save farmer feedback on a previously-saved recommendation.
 *
 * @param {number} farmerId
 * @param {number} recommendationId
 * @param {object} feedback - { followed, actualPriceAchieved, actualSaleDate }
 */
const saveFeedback = async (farmerId, recommendationId, feedback) => {
  const { PulseSellRecommendation } = getDb();

  const rec = await PulseSellRecommendation.findOne({
    where: { id: recommendationId, farmer_id: farmerId, is_active: true },
  });
  if (!rec) {
    const err = new Error('Recommendation not found or not yours');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const updates = {};
  if (feedback.followed !== undefined) {
    updates.farmer_followed_recommendation = feedback.followed;
  }
  if (feedback.actualPriceAchieved != null) {
    updates.actual_price_achieved = parseFloat(feedback.actualPriceAchieved);
  }
  await rec.update(updates);

  logger.info(
    `Recommendation feedback saved: farmer=${farmerId} rec=${recommendationId} ` +
      `followed=${feedback.followed} price=${feedback.actualPriceAchieved}`,
  );

  return {
    recommendationId: rec.id,
    recommendationUuid: rec.recommendation_uuid,
    followed: rec.farmer_followed_recommendation,
    actualPriceAchieved: rec.actual_price_achieved,
  };
};

module.exports = { getActiveNudges, saveFeedback };
