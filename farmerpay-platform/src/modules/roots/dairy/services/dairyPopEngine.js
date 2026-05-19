/**
 * Dairy PoP Engine — Breed-specific Package of Practices comparison,
 * compliance scoring, and alert generation for dairy operations.
 *
 * Compares actual dairy performance (yield, feed, health, reproduction)
 * against breed × lactation stage benchmarks from DairyPopTemplate.
 */

const { Op } = require('sequelize');
const logger = require('../../../../shared/utils/logger');
const { generateUUID } = require('../../../../shared/utils/uuidHelper');

let db;
const getDb = () => { if (!db) db = require('../../../../shared/models'); return db; };

const MS_PER_DAY = 86400000;

const classify = (variancePct) => {
  const abs = Math.abs(variancePct);
  if (abs <= 10) return 'EXCELLENT';
  if (abs <= 25) return 'ON_TRACK';
  if (abs <= 50) return 'BELOW_STANDARD';
  return 'CRITICAL';
};

const classifyScore = (score) => {
  if (score >= 80) return 'EXCELLENT';
  if (score >= 60) return 'ON_TRACK';
  if (score >= 40) return 'BELOW_STANDARD';
  return 'CRITICAL';
};

/* ─── Lactation stage resolver ─── */

const resolveLactationStage = async (animalId) => {
  const { DairyBreedingEvent, DairyAnimal } = getDb();

  const animal = await DairyAnimal.findByPk(animalId);
  if (!animal) return null;

  // Use current_lifecycle_stage if available
  const stage = (animal.current_lifecycle_stage || '').toUpperCase();
  if (stage === 'EARLY_LACTATION') return 'EARLY';
  if (stage === 'PEAK_LACTATION') return 'MID';
  if (stage === 'LATE_LACTATION') return 'LATE';
  if (stage === 'DRY') return 'DRY';

  // Fallback: compute from last calving
  const lastCalving = await DairyBreedingEvent.findOne({
    where: { animal_id: animal.animal_uuid, actual_calving_date: { [Op.not]: null }, is_active: true },
    order: [['actual_calving_date', 'DESC']],
  });

  if (!lastCalving) return 'EARLY'; // default if no calving history

  const daysSinceCalving = Math.round((Date.now() - new Date(lastCalving.actual_calving_date).getTime()) / MS_PER_DAY);
  if (daysSinceCalving < 90) return 'EARLY';
  if (daysSinceCalving < 180) return 'MID';
  if (daysSinceCalving < 270) return 'LATE';
  return 'DRY';
};

/* ====================================================================
 * 1. computeYieldVariance
 * ==================================================================== */

const computeYieldVariance = async (animalId, dateRange = {}) => {
  const { DairyAnimal, DairyMilkProductionLog, DairyPopTemplate } = getDb();

  const animal = await DairyAnimal.findByPk(animalId);
  if (!animal) { const err = new Error('Animal not found'); err.statusCode = 404; throw err; }

  const lactationStage = await resolveLactationStage(animalId);
  const breed = animal.breed || animal.breed_code || 'HF Crossbred';

  // Get PoP template
  const template = await DairyPopTemplate.findOne({
    where: { breed: { [Op.like]: `%${breed}%` }, lactation_stage: lactationStage, is_active: true },
  });

  // Get actual yield
  const where = { animal_id: animal.animal_uuid, is_active: true };
  if (dateRange.from) where.production_date = { [Op.gte]: dateRange.from };
  if (dateRange.to) where.production_date = { ...(where.production_date || {}), [Op.lte]: dateRange.to };

  const logs = await DairyMilkProductionLog.findAll({ where, order: [['production_date', 'DESC']], limit: 30 });

  const totalYield = logs.reduce((s, l) => s + parseFloat(l.total_daily_milk || 0), 0);
  const avgYield = logs.length > 0 ? totalYield / logs.length : 0;
  const expectedAvg = template ? parseFloat(template.expected_daily_yield_liters || 0) : null;

  const variancePct = expectedAvg && expectedAvg > 0
    ? Math.round(((avgYield - expectedAvg) / expectedAvg) * 100 * 10) / 10
    : null;

  return {
    animalId, breed, lactationStage,
    actualAvg: Math.round(avgYield * 100) / 100,
    expectedAvg,
    variancePct,
    daysLogged: logs.length,
    status: variancePct !== null ? classify(variancePct) : 'UNKNOWN',
  };
};

/* ====================================================================
 * 2. computeFeedEfficiency
 * ==================================================================== */

const computeFeedEfficiency = async (herdId, dateRange = {}) => {
  const { DairyFeedUsageLog, DairyMilkProductionLog, DairyHerdRegister, DairyAnimal, DairyPopTemplate } = getDb();

  const herd = await DairyHerdRegister.findByPk(herdId);
  if (!herd) { const err = new Error('Herd not found'); err.statusCode = 404; throw err; }

  const feedWhere = { herd_id: herdId, is_active: true };
  if (dateRange.from) feedWhere.feed_date = { [Op.gte]: dateRange.from };
  if (dateRange.to) feedWhere.feed_date = { ...(feedWhere.feed_date || {}), [Op.lte]: dateRange.to };

  const feedLogs = await DairyFeedUsageLog.findAll({ where: feedWhere });
  const totalFeedCost = feedLogs.reduce((s, l) => s + parseFloat(l.feed_cost || 0), 0);

  // Get milk production for same period (all animals in herd)
  const animals = await DairyAnimal.findAll({
    where: { farmer_id: herd.farmer_id, is_active: true, status: 'ACTIVE' },
    attributes: ['animal_uuid'],
  });
  const animalUuids = animals.map((a) => a.animal_uuid);

  let totalMilk = 0;
  if (animalUuids.length > 0) {
    const milkWhere = { animal_id: { [Op.in]: animalUuids }, is_active: true };
    if (dateRange.from) milkWhere.production_date = { [Op.gte]: dateRange.from };
    if (dateRange.to) milkWhere.production_date = { ...(milkWhere.production_date || {}), [Op.lte]: dateRange.to };

    const milkLogs = await DairyMilkProductionLog.findAll({ where: milkWhere });
    totalMilk = milkLogs.reduce((s, l) => s + parseFloat(l.total_daily_milk || 0), 0);
  }

  const costPerLiter = totalMilk > 0 ? Math.round((totalFeedCost / totalMilk) * 100) / 100 : null;

  // Get benchmark from PoP (assume MID stage as average)
  const template = await DairyPopTemplate.findOne({
    where: { lactation_stage: 'MID', is_active: true },
    order: [['breed', 'ASC']],
  });
  const benchmarkCostPerLiter = template && template.expected_daily_yield_liters > 0
    ? Math.round((parseFloat(template.expected_feed_cost_per_day || 0) / parseFloat(template.expected_daily_yield_liters)) * 100) / 100
    : null;

  const variancePct = costPerLiter && benchmarkCostPerLiter && benchmarkCostPerLiter > 0
    ? Math.round(((costPerLiter - benchmarkCostPerLiter) / benchmarkCostPerLiter) * 100 * 10) / 10
    : null;

  return {
    herdId, totalFeedCost: Math.round(totalFeedCost * 100) / 100,
    totalMilkLiters: Math.round(totalMilk * 100) / 100,
    costPerLiter, benchmark: benchmarkCostPerLiter,
    variancePct, status: variancePct !== null ? classify(variancePct) : 'UNKNOWN',
  };
};

/* ====================================================================
 * 3. checkVaccinationCompliance
 * ==================================================================== */

const checkVaccinationCompliance = async (herdId) => {
  const { DairyHerdRegister, DairyAnimalHealthRecord, DairyAnimal, DairyPopTemplate } = getDb();

  const herd = await DairyHerdRegister.findByPk(herdId);
  if (!herd) { const err = new Error('Herd not found'); err.statusCode = 404; throw err; }

  // Get vaccination records
  const animals = await DairyAnimal.findAll({
    where: { farmer_id: herd.farmer_id, is_active: true, status: 'ACTIVE' },
  });

  const healthRecords = await DairyAnimalHealthRecord.findAll({
    where: { is_active: true, vaccinations_done: true },
    order: [['record_date', 'DESC']],
  });

  // Get expected schedule from PoP template
  const template = await DairyPopTemplate.findOne({
    where: { is_active: true, vaccination_schedule: { [Op.not]: null } },
  });

  const schedule = template?.vaccination_schedule || [
    { name: 'FMD', frequency_months: 6 },
    { name: 'HS-BQ', frequency_months: 6 },
    { name: 'Brucella', frequency_months: 12 },
    { name: 'Deworming', frequency_months: 3 },
  ];

  const completed = healthRecords.map((r) => ({
    date: r.record_date,
    animalCount: 1,
  }));

  const overdue = [];
  const today = new Date();

  schedule.forEach((vacc) => {
    const lastRecord = healthRecords[0]; // simplified: check latest
    const monthsSinceLast = lastRecord
      ? Math.round((today - new Date(lastRecord.record_date)) / (30 * MS_PER_DAY))
      : 999;

    if (monthsSinceLast > (vacc.frequency_months || 6)) {
      overdue.push({ vaccine: vacc.name, lastDone: lastRecord?.record_date || null, monthsOverdue: monthsSinceLast - vacc.frequency_months });
    }
  });

  const compliancePct = schedule.length > 0
    ? Math.round(((schedule.length - overdue.length) / schedule.length) * 100)
    : 100;

  return { scheduled: schedule, completed: completed.length, overdue, compliancePct };
};

/* ====================================================================
 * 4. checkReproductiveEfficiency
 * ==================================================================== */

const checkReproductiveEfficiency = async (herdId) => {
  const { DairyHerdRegister, DairyAnimal, DairyBreedingEvent, DairyPopTemplate } = getDb();

  const herd = await DairyHerdRegister.findByPk(herdId);
  if (!herd) { const err = new Error('Herd not found'); err.statusCode = 404; throw err; }

  const animals = await DairyAnimal.findAll({
    where: { farmer_id: herd.farmer_id, is_active: true, status: 'ACTIVE' },
    attributes: ['animal_uuid', 'breed', 'breed_code'],
  });

  const animalUuids = animals.map((a) => a.animal_uuid);
  if (animalUuids.length === 0) return { avgCalvingInterval: null, expected: null, conceptionRate: null, status: 'UNKNOWN' };

  const events = await DairyBreedingEvent.findAll({
    where: { animal_id: { [Op.in]: animalUuids }, is_active: true },
    order: [['ai_date', 'DESC']],
  });

  const totalAttempts = events.length;
  const confirmed = events.filter((e) => e.pregnancy_confirmed === 'YES').length;
  const conceptionRate = totalAttempts > 0 ? Math.round((confirmed / totalAttempts) * 100) : null;

  // Calculate calving intervals
  const calvingDates = events
    .filter((e) => e.actual_calving_date)
    .map((e) => new Date(e.actual_calving_date).getTime())
    .sort((a, b) => b - a);

  let avgCalvingInterval = null;
  if (calvingDates.length >= 2) {
    const intervals = [];
    // Group by animal
    const byAnimal = {};
    events.filter((e) => e.actual_calving_date).forEach((e) => {
      if (!byAnimal[e.animal_id]) byAnimal[e.animal_id] = [];
      byAnimal[e.animal_id].push(new Date(e.actual_calving_date).getTime());
    });

    Object.values(byAnimal).forEach((dates) => {
      dates.sort((a, b) => b - a);
      for (let i = 0; i < dates.length - 1; i++) {
        intervals.push(Math.round((dates[i] - dates[i + 1]) / MS_PER_DAY));
      }
    });

    if (intervals.length > 0) {
      avgCalvingInterval = Math.round(intervals.reduce((s, i) => s + i, 0) / intervals.length);
    }
  }

  // Get expected from PoP
  const template = await DairyPopTemplate.findOne({ where: { is_active: true }, order: [['breed', 'ASC']] });
  const expectedInterval = template ? template.expected_calving_interval_days : 400;

  // Calf mortality
  const stillborns = events.filter((e) => e.calving_outcome === 'STILLBORN' || e.calving_outcome === 'ABORTION').length;
  const totalCalvings = events.filter((e) => e.actual_calving_date).length;
  const calfMortalityRate = totalCalvings > 0 ? Math.round((stillborns / totalCalvings) * 100 * 10) / 10 : 0;

  const status = avgCalvingInterval
    ? (avgCalvingInterval <= expectedInterval ? 'ON_TRACK' : avgCalvingInterval <= expectedInterval * 1.2 ? 'BELOW_STANDARD' : 'CRITICAL')
    : 'UNKNOWN';

  return {
    avgCalvingInterval, expected: expectedInterval,
    conceptionRate, totalAttempts, confirmed,
    calfMortalityRate, totalCalvings,
    status,
  };
};

/* ====================================================================
 * 5. computeDairyComplianceScore
 * ==================================================================== */

const computeDairyComplianceScore = async (herdId) => {
  const { DairyHerdRegister, RootsComplianceSnapshot } = getDb();

  const herd = await DairyHerdRegister.findByPk(herdId);
  if (!herd) { const err = new Error('Herd not found'); err.statusCode = 404; throw err; }

  // Compute sub-scores
  const feedResult = await computeFeedEfficiency(herdId, {}).catch(() => ({ status: 'UNKNOWN' }));
  const vaccResult = await checkVaccinationCompliance(herdId).catch(() => ({ compliancePct: 50 }));
  const reproResult = await checkReproductiveEfficiency(herdId).catch(() => ({ status: 'UNKNOWN' }));

  // Feed compliance (25%)
  const feedScore = feedResult.status === 'EXCELLENT' ? 100 : feedResult.status === 'ON_TRACK' ? 75 : feedResult.status === 'BELOW_STANDARD' ? 40 : feedResult.status === 'CRITICAL' ? 15 : 50;

  // Health compliance (30%)
  const healthScore = vaccResult.compliancePct || 50;

  // Reproductive compliance (20%)
  const reproScore = reproResult.status === 'ON_TRACK' ? 100 : reproResult.status === 'BELOW_STANDARD' ? 50 : reproResult.status === 'CRITICAL' ? 20 : 50;

  // Production efficiency (25%) — use feed efficiency as proxy
  const prodScore = feedResult.costPerLiter
    ? (feedResult.costPerLiter < 15 ? 100 : feedResult.costPerLiter < 25 ? 75 : feedResult.costPerLiter < 40 ? 50 : 25)
    : 50;

  const overallScore = Math.round(
    feedScore * 0.25 + healthScore * 0.30 + reproScore * 0.20 + prodScore * 0.25
  );

  // Upsert compliance snapshot
  const snapshotDate = new Date().toISOString().slice(0, 10);
  const [snapshot, created] = await RootsComplianceSnapshot.findOrCreate({
    where: { farmer_id: herd.farmer_id, activity_type: 'DAIRY', activity_reference_id: herdId, snapshot_date: snapshotDate },
    defaults: {
      uuid: generateUUID(),
      farmer_id: herd.farmer_id,
      activity_type: 'DAIRY',
      activity_reference_id: herdId,
      overall_compliance_score: overallScore,
      cost_compliance_score: feedScore,
      practice_compliance_score: healthScore,
      timing_compliance_score: reproScore,
      quantity_compliance_score: prodScore,
      data_completeness_pct: 70, // dairy doesn't have stage-based completeness
      snapshot_date: snapshotDate,
    },
  });

  if (!created) {
    await snapshot.update({
      overall_compliance_score: overallScore,
      cost_compliance_score: feedScore,
      practice_compliance_score: healthScore,
      timing_compliance_score: reproScore,
      quantity_compliance_score: prodScore,
    });
  }

  logger.info(`Dairy PoP compliance: herd ${herdId}, score ${overallScore}`);

  return {
    herdId, farmerId: herd.farmer_id,
    overallScore, status: classifyScore(overallScore),
    breakdown: {
      feedCompliance: { score: feedScore, weight: 25 },
      healthCompliance: { score: healthScore, weight: 30 },
      reproductiveCompliance: { score: reproScore, weight: 20 },
      productionEfficiency: { score: prodScore, weight: 25 },
    },
    snapshotDate,
  };
};

/* ====================================================================
 * 6. generateDairyAlerts
 * ==================================================================== */

const generateDairyAlerts = async (herdId) => {
  const { DairyHerdRegister, DairyAnimal, DairyMilkProductionLog, DairyBreedingEvent } = getDb();
  const alerts = [];

  const herd = await DairyHerdRegister.findByPk(herdId);
  if (!herd) return alerts;

  const animals = await DairyAnimal.findAll({
    where: { farmer_id: herd.farmer_id, is_active: true, status: 'ACTIVE' },
  });

  // Yield drop: 3 consecutive days >20% below 7-day avg
  for (const animal of animals.slice(0, 10)) {
    try {
      const logs = await DairyMilkProductionLog.findAll({
        where: { animal_id: animal.animal_uuid, is_active: true },
        order: [['production_date', 'DESC']], limit: 10,
      });
      if (logs.length >= 7) {
        const weekAvg = logs.slice(0, 7).reduce((s, l) => s + parseFloat(l.total_daily_milk || 0), 0) / 7;
        const last3 = logs.slice(0, 3);
        const allBelow = last3.every((l) => parseFloat(l.total_daily_milk || 0) < weekAvg * 0.8);
        if (allBelow && weekAvg > 0) {
          alerts.push({ type: 'YIELD_DROP', severity: 'HIGH', animal: animal.tag_id || animal.animal_uuid, message: `Yield dropped >20% for 3 days (avg was ${weekAvg.toFixed(1)}L)` });
        }
      }
    } catch {}
  }

  // Vaccination overdue
  const vaccResult = await checkVaccinationCompliance(herdId).catch(() => null);
  if (vaccResult?.overdue?.length > 0) {
    vaccResult.overdue.forEach((v) => {
      alerts.push({ type: 'VACCINATION_OVERDUE', severity: 'MEDIUM', message: `${v.vaccine} overdue by ${v.monthsOverdue} months` });
    });
  }

  // Breeding window (heat detection): last calving + 60 days
  for (const animal of animals.filter((a) => a.sex === 'FEMALE' || !a.sex)) {
    try {
      const lastCalving = await DairyBreedingEvent.findOne({
        where: { animal_id: animal.animal_uuid, actual_calving_date: { [Op.not]: null }, is_active: true },
        order: [['actual_calving_date', 'DESC']],
      });
      if (lastCalving) {
        const daysSince = Math.round((Date.now() - new Date(lastCalving.actual_calving_date).getTime()) / MS_PER_DAY);
        if (daysSince >= 55 && daysSince <= 75) {
          alerts.push({ type: 'BREEDING_WINDOW', severity: 'MEDIUM', animal: animal.tag_id || animal.animal_uuid, message: `Breeding window open (${daysSince} days post-calving)` });
        }
        // Dry-off reminder: calving + 270 days
        if (daysSince >= 260 && daysSince <= 280) {
          alerts.push({ type: 'DRY_OFF_REMINDER', severity: 'LOW', animal: animal.tag_id || animal.animal_uuid, message: `Consider dry-off (${daysSince} days in lactation)` });
        }
      }
    } catch {}
  }

  // Feed cost spike
  const feedResult = await computeFeedEfficiency(herdId, {}).catch(() => null);
  if (feedResult?.variancePct && feedResult.variancePct > 30) {
    alerts.push({ type: 'FEED_COST_SPIKE', severity: 'MEDIUM', message: `Feed cost ${feedResult.variancePct}% above benchmark` });
  }

  return alerts;
};

module.exports = {
  computeYieldVariance,
  computeFeedEfficiency,
  checkVaccinationCompliance,
  checkReproductiveEfficiency,
  computeDairyComplianceScore,
  generateDairyAlerts,
};
