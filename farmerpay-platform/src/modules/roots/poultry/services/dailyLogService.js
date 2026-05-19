/**
 * Poultry Daily Log Service — Daily production/health data entry.
 */
const { Op } = require('sequelize');
const logger = require('../../../../shared/utils/logger');
const { generateUUID } = require('../../../../shared/utils/uuidHelper');

let db;
const getDb = () => { if (!db) db = require('../../../../shared/models'); return db; };

const createDailyLog = async (flockId, data) => {
  const { PoultryDailyLog, PoultryFlock, sequelize } = getDb();
  const t = await sequelize.transaction();

  try {
    const flock = await PoultryFlock.findByPk(flockId, { transaction: t });
    if (!flock || !flock.is_active || flock.status !== 'ACTIVE') {
      const err = new Error('Active flock not found'); err.statusCode = 404; throw err;
    }

    const mortalityCount = data.mortalityCount || 0;
    if (mortalityCount > flock.current_count) {
      const err = new Error('Mortality count exceeds current flock count'); err.statusCode = 400; throw err;
    }

    const log = await PoultryDailyLog.create({
      uuid: generateUUID(),
      flock_id: flockId,
      log_date: data.logDate,
      mortality_count: mortalityCount,
      feed_consumed_kg: data.feedConsumedKg || null,
      water_consumed_liters: data.waterConsumedLiters || null,
      egg_count: data.eggCount || null,
      sample_weight_g: data.sampleWeightG || null,
      temperature_high: data.temperatureHigh || null,
      temperature_low: data.temperatureLow || null,
      humidity_pct: data.humidityPct || null,
      disease_observed: data.diseaseObserved || false,
      disease_notes: data.diseaseNotes || null,
      photo_url: data.photoUrl || null,
    }, { transaction: t });

    // Auto-update flock current_count
    const newCount = flock.current_count - mortalityCount;
    await flock.update({ current_count: Math.max(0, newCount) }, { transaction: t });

    await t.commit();

    // Post-log: compute batch summary + check alerts (non-blocking)
    try {
      const batchAnalytics = require('./batchAnalyticsService');
      await batchAnalytics.generateBatchSummary(flockId);
    } catch (e) { logger.warn('Post-log analytics failed', { flockId, error: e.message }); }

    try {
      const alertService = require('./alertService');
      await alertService.runAllChecks(flockId);
    } catch (e) { logger.warn('Post-log alert check failed', { flockId, error: e.message }); }

    logger.info(`Poultry daily log: flock ${flockId}, date ${data.logDate}, mortality ${mortalityCount}`);
    return mapLogDto(log);
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

const getDailyLogs = async (flockId, dateRange = {}) => {
  const { PoultryDailyLog } = getDb();
  const where = { flock_id: flockId, is_active: true };
  if (dateRange.from) where.log_date = { ...where.log_date, [Op.gte]: dateRange.from };
  if (dateRange.to) where.log_date = { ...(where.log_date || {}), [Op.lte]: dateRange.to };

  const logs = await PoultryDailyLog.findAll({ where, order: [['log_date', 'DESC']] });
  return logs.map(mapLogDto);
};

const getLatestLog = async (flockId) => {
  const { PoultryDailyLog } = getDb();
  const log = await PoultryDailyLog.findOne({
    where: { flock_id: flockId, is_active: true },
    order: [['log_date', 'DESC']],
  });
  return log ? mapLogDto(log) : null;
};

const mapLogDto = (log) => ({
  logId: log.id, logUuid: log.uuid, flockId: log.flock_id,
  logDate: log.log_date, mortalityCount: log.mortality_count,
  feedConsumedKg: log.feed_consumed_kg ? parseFloat(log.feed_consumed_kg) : null,
  waterConsumedLiters: log.water_consumed_liters ? parseFloat(log.water_consumed_liters) : null,
  eggCount: log.egg_count, sampleWeightG: log.sample_weight_g,
  temperatureHigh: log.temperature_high ? parseFloat(log.temperature_high) : null,
  temperatureLow: log.temperature_low ? parseFloat(log.temperature_low) : null,
  humidityPct: log.humidity_pct, diseaseObserved: log.disease_observed,
  diseaseNotes: log.disease_notes, photoUrl: log.photo_url,
});

module.exports = { createDailyLog, getDailyLogs, getLatestLog };
