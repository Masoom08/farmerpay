/**
 * Poultry Alert Service — Detects anomalies in flock metrics.
 */
const { Op } = require('sequelize');
const logger = require('../../../../shared/utils/logger');

let db;
const getDb = () => { if (!db) db = require('../../../../shared/models'); return db; };

const checkMortalitySpike = async (flockId) => {
  const { PoultryFlock, PoultryDailyLog } = getDb();
  const flock = await PoultryFlock.findByPk(flockId);
  if (!flock || flock.current_count <= 0) return null;

  const latestLog = await PoultryDailyLog.findOne({
    where: { flock_id: flockId, is_active: true }, order: [['log_date', 'DESC']],
  });
  if (!latestLog) return null;

  const dailyRate = (latestLog.mortality_count / (flock.current_count + latestLog.mortality_count)) * 100;

  // Cumulative rate
  const allLogs = await PoultryDailyLog.findAll({ where: { flock_id: flockId, is_active: true } });
  const totalDeaths = allLogs.reduce((s, l) => s + (l.mortality_count || 0), 0);
  const cumulativeRate = flock.initial_count > 0 ? (totalDeaths / flock.initial_count) * 100 : 0;

  if (dailyRate > 1) return { type: 'MORTALITY_SPIKE', severity: 'RED', message: `Daily mortality ${dailyRate.toFixed(1)}% (${latestLog.mortality_count} birds)` };
  if (cumulativeRate > 5) return { type: 'MORTALITY_HIGH', severity: 'AMBER', message: `Cumulative mortality ${cumulativeRate.toFixed(1)}%` };
  return null;
};

const checkFCRDeterioration = async (flockId) => {
  const { PoultryFlock } = getDb();
  const flock = await PoultryFlock.findByPk(flockId);
  if (!flock || flock.bird_type === 'LAYER') return null;

  const daysSince = Math.round((Date.now() - new Date(flock.placement_date).getTime()) / 86400000);
  if (daysSince < 35) return null; // too early to judge FCR (broiler ~6 weeks)

  const batchAnalytics = require('./batchAnalyticsService');
  const fcr = await batchAnalytics.computeFCR(flockId);
  if (fcr && fcr > 2.0) {
    return { type: 'FCR_HIGH', severity: 'AMBER', message: `FCR ${fcr.toFixed(2)} exceeds 2.0 target at week ${Math.ceil(daysSince / 7)}` };
  }
  return null;
};

const checkEggDrop = async (flockId) => {
  const { PoultryFlock, PoultryDailyLog } = getDb();
  const flock = await PoultryFlock.findByPk(flockId);
  if (!flock || (flock.bird_type !== 'LAYER' && flock.bird_type !== 'COUNTRY')) return null;

  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
  const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const prevWeek = await PoultryDailyLog.findAll({
    where: { flock_id: flockId, is_active: true, log_date: { [Op.between]: [twoWeeksAgo, oneWeekAgo] } },
  });
  const thisWeek = await PoultryDailyLog.findAll({
    where: { flock_id: flockId, is_active: true, log_date: { [Op.gt]: oneWeekAgo } },
  });

  const prevEggs = prevWeek.reduce((s, l) => s + (l.egg_count || 0), 0);
  const thisEggs = thisWeek.reduce((s, l) => s + (l.egg_count || 0), 0);

  if (prevEggs > 0 && thisEggs < prevEggs * 0.9) {
    const dropPct = Math.round((1 - thisEggs / prevEggs) * 100);
    return { type: 'EGG_DROP', severity: 'AMBER', message: `Egg production dropped ${dropPct}% this week` };
  }
  return null;
};

const checkWeightLag = async (flockId) => {
  const { PoultryFlock, PoultryPopTemplate, PoultryDailyLog } = getDb();
  const flock = await PoultryFlock.findByPk(flockId);
  if (!flock || flock.bird_type === 'LAYER') return null;

  const daysSince = Math.round((Date.now() - new Date(flock.placement_date).getTime()) / 86400000);
  const weekNumber = Math.ceil(daysSince / 7);

  const template = await PoultryPopTemplate.findOne({
    where: { bird_type: 'BROILER', week_number: weekNumber, is_active: true },
  });
  if (!template || !template.expected_weight_g) return null;

  const latestWeighed = await PoultryDailyLog.findOne({
    where: { flock_id: flockId, is_active: true, sample_weight_g: { [Op.not]: null } },
    order: [['log_date', 'DESC']],
  });
  if (!latestWeighed) return null;

  if (latestWeighed.sample_weight_g < template.expected_weight_g * 0.8) {
    return {
      type: 'WEIGHT_LAG', severity: 'AMBER',
      message: `Weight ${latestWeighed.sample_weight_g}g vs expected ${template.expected_weight_g}g at week ${weekNumber}`,
    };
  }
  return null;
};

const runAllChecks = async (flockId) => {
  const alerts = [];
  const checks = [checkMortalitySpike, checkFCRDeterioration, checkEggDrop, checkWeightLag];

  for (const check of checks) {
    try {
      const result = await check(flockId);
      if (result) alerts.push(result);
    } catch (err) {
      logger.warn(`Poultry alert check failed for flock ${flockId}`, { error: err.message });
    }
  }

  return alerts;
};

module.exports = { checkMortalitySpike, checkFCRDeterioration, checkEggDrop, checkWeightLag, runAllChecks };
