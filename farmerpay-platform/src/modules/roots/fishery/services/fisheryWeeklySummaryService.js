/**
 * Fishery Weekly Summary Service
 * Bulk-entry path for Large-tier fishery farmers. Separate inland and sea
 * cost buckets so P&L attribution stays clean. On finalize, fans out to
 * aggregated FARM-scope cost/revenue events flagged is_estimated=true.
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../../shared/models');
  return db;
};

const upsertWeeklySummary = async (farmerId, data) => {
  const { FisheryWeeklySummary } = getDb();
  const existing = await FisheryWeeklySummary.findOne({
    where: { farmer_id: farmerId, week_start_date: data.weekStartDate },
  });

  const payload = {
    week_end_date: data.weekEndDate,
    total_feed_cost: data.totalFeedCost || 0,
    total_fingerling_cost: data.totalFingerlingCost || 0,
    total_pond_labor_cost: data.totalPondLaborCost || 0,
    total_aeration_cost: data.totalAerationCost || 0,
    total_health_cost: data.totalHealthCost || 0,
    total_fuel_cost: data.totalFuelCost || 0,
    total_ice_cost: data.totalIceCost || 0,
    total_crew_wages: data.totalCrewWages || 0,
    total_gear_cost: data.totalGearCost || 0,
    total_maintenance_cost: data.totalMaintenanceCost || 0,
    total_other_cost: data.totalOtherCost || 0,
    total_fish_kg: data.totalFishKg || 0,
    total_fish_revenue: data.totalFishRevenue || 0,
    total_other_revenue: data.totalOtherRevenue || 0,
    notes: data.notes || null,
  };

  if (existing) {
    if (existing.is_finalized) {
      const err = new Error('Week already finalized — use correction flow');
      err.statusCode = 409;
      err.errorCode = 'RES_002';
      throw err;
    }
    await existing.update(payload);
    return existing;
  }

  return FisheryWeeklySummary.create({
    summary_uuid: uuidv4(),
    farmer_id: farmerId,
    week_start_date: data.weekStartDate,
    ...payload,
  });
};

const finalizeWeek = async (farmerId, summaryUuid) => {
  const { FisheryWeeklySummary, FisheryCostEvent, FisheryRevenueEvent } = getDb();
  const summary = await FisheryWeeklySummary.findOne({
    where: { summary_uuid: summaryUuid, farmer_id: farmerId },
  });
  if (!summary) {
    const err = new Error('Weekly summary not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }
  if (summary.is_finalized) return summary;

  const eventDate = summary.week_end_date;
  const costBuckets = [
    ['FEED', 'total_feed_cost'],
    ['FINGERLINGS', 'total_fingerling_cost'],
    ['LABOR', 'total_pond_labor_cost'],
    ['AERATION_ELECTRICITY', 'total_aeration_cost'],
    ['HEALTH_TREATMENT', 'total_health_cost'],
    ['FUEL', 'total_fuel_cost'],
    ['ICE', 'total_ice_cost'],
    ['CREW_WAGES', 'total_crew_wages'],
    ['NETS_GEAR', 'total_gear_cost'],
    ['BOAT_MAINTENANCE', 'total_maintenance_cost'],
    ['OTHER', 'total_other_cost'],
  ];

  for (const [category, field] of costBuckets) {
    const amount = parseFloat(summary[field] || 0);
    if (amount > 0) {
      await FisheryCostEvent.create({
        event_uuid: uuidv4(),
        farmer_id: farmerId,
        event_date: eventDate,
        scope: 'FARM',
        category,
        amount,
        amount_formal: 0,
        amount_informal: 0,
        source_table: 'fishery_weekly_summaries',
        source_event_uuid: summary.summary_uuid,
        is_estimated: true,
        notes: `Weekly bulk entry (${summary.week_start_date} to ${summary.week_end_date})`,
      });
    }
  }

  if (parseFloat(summary.total_fish_revenue || 0) > 0) {
    await FisheryRevenueEvent.create({
      event_uuid: uuidv4(),
      farmer_id: farmerId,
      event_date: eventDate,
      scope: 'FARM',
      category: 'FISH_SALE_WHOLESALE',
      quantity_kg: summary.total_fish_kg || 0,
      amount: summary.total_fish_revenue,
      source_table: 'fishery_weekly_summaries',
      source_event_uuid: summary.summary_uuid,
      is_estimated: true,
      notes: 'Weekly fish sales bulk entry',
    });
  }
  if (parseFloat(summary.total_other_revenue || 0) > 0) {
    await FisheryRevenueEvent.create({
      event_uuid: uuidv4(),
      farmer_id: farmerId,
      event_date: eventDate,
      scope: 'FARM',
      category: 'OTHER',
      amount: summary.total_other_revenue,
      source_table: 'fishery_weekly_summaries',
      source_event_uuid: summary.summary_uuid,
      is_estimated: true,
      notes: 'Weekly other revenue bulk entry',
    });
  }

  await summary.update({ is_finalized: true, finalized_at: new Date() });
  logger.info(`Fishery weekly summary ${summaryUuid} finalized and fanned out`);
  return summary;
};

const listWeeklySummaries = async (farmerId, limit = 12) => {
  const { FisheryWeeklySummary } = getDb();
  return FisheryWeeklySummary.findAll({
    where: { farmer_id: farmerId },
    order: [['week_start_date', 'DESC']],
    limit,
  });
};

module.exports = { upsertWeeklySummary, finalizeWeek, listWeeklySummaries };
