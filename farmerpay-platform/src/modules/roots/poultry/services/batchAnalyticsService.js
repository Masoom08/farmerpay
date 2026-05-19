/**
 * Poultry Batch Analytics — FCR, mortality, egg production, economics.
 */
const logger = require('../../../../shared/utils/logger');
const { generateUUID } = require('../../../../shared/utils/uuidHelper');

let db;
const getDb = () => { if (!db) db = require('../../../../shared/models'); return db; };

const computeFCR = async (flockId) => {
  const { PoultryFlock, PoultryDailyLog } = getDb();
  const flock = await PoultryFlock.findByPk(flockId);
  if (!flock) return null;

  const logs = await PoultryDailyLog.findAll({ where: { flock_id: flockId, is_active: true } });
  const totalFeedKg = logs.reduce((s, l) => s + parseFloat(l.feed_consumed_kg || 0), 0);

  // Get latest weight sample
  const lastWeighed = logs.filter((l) => l.sample_weight_g).sort((a, b) => b.log_date > a.log_date ? 1 : -1)[0];
  const avgWeightG = lastWeighed ? lastWeighed.sample_weight_g : null;
  const initialWeightG = flock.avg_initial_weight_g || 0;
  const weightGainG = avgWeightG ? avgWeightG - initialWeightG : null;

  if (!weightGainG || weightGainG <= 0 || totalFeedKg <= 0) return null;

  const totalFeedG = totalFeedKg * 1000;
  const totalWeightGainG = weightGainG * flock.current_count;
  return totalWeightGainG > 0 ? Math.round((totalFeedG / totalWeightGainG) * 1000) / 1000 : null;
};

const computeMortalityRate = async (flockId) => {
  const { PoultryFlock, PoultryDailyLog } = getDb();
  const flock = await PoultryFlock.findByPk(flockId);
  if (!flock || flock.initial_count <= 0) return 0;

  const logs = await PoultryDailyLog.findAll({ where: { flock_id: flockId, is_active: true } });
  const totalDeaths = logs.reduce((s, l) => s + (l.mortality_count || 0), 0);
  return Math.round((totalDeaths / flock.initial_count) * 10000) / 100;
};

const computeEggProductionPct = async (flockId) => {
  const { PoultryFlock, PoultryDailyLog } = getDb();
  const flock = await PoultryFlock.findByPk(flockId);
  if (!flock || flock.current_count <= 0) return null;

  const logs = await PoultryDailyLog.findAll({
    where: { flock_id: flockId, is_active: true },
    order: [['log_date', 'DESC']], limit: 7,
  });

  const totalEggs = logs.reduce((s, l) => s + (l.egg_count || 0), 0);
  const days = logs.length || 1;
  return Math.round((totalEggs / (flock.current_count * days)) * 10000) / 100;
};

const computeCostPerBird = async (flockId) => {
  const { PoultryFlock, PoultryCostEvent } = getDb();
  const flock = await PoultryFlock.findByPk(flockId);
  if (!flock || flock.current_count <= 0) return null;

  const costs = await PoultryCostEvent.findAll({ where: { flock_id: flockId, is_active: true } });
  const totalCost = costs.reduce((s, c) => s + parseFloat(c.amount || 0), 0);
  return Math.round((totalCost / flock.current_count) * 100) / 100;
};

const computeRevenuePerBird = async (flockId) => {
  const { PoultryFlock, PoultryRevenueEvent } = getDb();
  const flock = await PoultryFlock.findByPk(flockId);
  if (!flock || flock.initial_count <= 0) return null;

  const revenues = await PoultryRevenueEvent.findAll({ where: { flock_id: flockId, is_active: true } });
  const totalRevenue = revenues.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0);
  return Math.round((totalRevenue / flock.initial_count) * 100) / 100;
};

const generateBatchSummary = async (flockId) => {
  const { PoultryFlock, PoultryBatchSummary, PoultryDailyLog, PoultryCostEvent, PoultryRevenueEvent } = getDb();
  const flock = await PoultryFlock.findByPk(flockId);
  if (!flock) return null;

  const logs = await PoultryDailyLog.findAll({ where: { flock_id: flockId, is_active: true } });
  const costs = await PoultryCostEvent.findAll({ where: { flock_id: flockId, is_active: true } });
  const revenues = await PoultryRevenueEvent.findAll({ where: { flock_id: flockId, is_active: true } });

  const cumulativeMortality = logs.reduce((s, l) => s + (l.mortality_count || 0), 0);
  const cumulativeFeedKg = logs.reduce((s, l) => s + parseFloat(l.feed_consumed_kg || 0), 0);
  const totalEggs = logs.reduce((s, l) => s + (l.egg_count || 0), 0);
  const totalCost = costs.reduce((s, c) => s + parseFloat(c.amount || 0), 0);
  const totalRevenue = revenues.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0);

  const lastWeighed = logs.filter((l) => l.sample_weight_g).sort((a, b) => (b.log_date > a.log_date ? 1 : -1))[0];
  const fcr = await computeFCR(flockId);
  const mortalityPct = flock.initial_count > 0 ? Math.round((cumulativeMortality / flock.initial_count) * 10000) / 100 : 0;

  const days = logs.length || 1;
  const eggPct = flock.current_count > 0 ? Math.round((totalEggs / (flock.current_count * days)) * 10000) / 100 : null;

  const data = {
    flock_id: flockId,
    summary_date: new Date().toISOString().slice(0, 10),
    cumulative_mortality: cumulativeMortality,
    mortality_rate_pct: mortalityPct,
    cumulative_feed_kg: Math.round(cumulativeFeedKg * 100) / 100,
    fcr,
    avg_weight_g: lastWeighed ? lastWeighed.sample_weight_g : null,
    total_egg_count: totalEggs,
    egg_production_pct: eggPct,
    total_cost: Math.round(totalCost * 100) / 100,
    total_revenue: Math.round(totalRevenue * 100) / 100,
    profit_per_bird: flock.initial_count > 0 ? Math.round(((totalRevenue - totalCost) / flock.initial_count) * 100) / 100 : null,
    cost_per_bird: flock.current_count > 0 ? Math.round((totalCost / flock.current_count) * 100) / 100 : null,
  };

  // Upsert: update today's or create new
  const existing = await PoultryBatchSummary.findOne({
    where: { flock_id: flockId, summary_date: data.summary_date, is_active: true },
  });

  if (existing) {
    await existing.update(data);
    return existing;
  }

  const summary = await PoultryBatchSummary.create({ uuid: generateUUID(), ...data });
  return summary;
};

module.exports = { computeFCR, computeMortalityRate, computeEggProductionPct, computeCostPerBird, computeRevenuePerBird, generateBatchSummary };
