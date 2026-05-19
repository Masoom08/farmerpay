/**
 * Poultry Flock Service — Flock/batch CRUD and dashboard.
 */
const logger = require('../../../../shared/utils/logger');
const { generateUUID } = require('../../../../shared/utils/uuidHelper');

let db;
const getDb = () => { if (!db) db = require('../../../../shared/models'); return db; };

const createFlock = async (farmerId, data) => {
  const { PoultryFlock } = getDb();
  const flock = await PoultryFlock.create({
    uuid: generateUUID(),
    farmer_id: farmerId,
    batch_name: data.batchName,
    bird_type: data.birdType,
    breed: data.breed || null,
    placement_date: data.placementDate,
    initial_count: data.initialCount,
    current_count: data.initialCount,
    avg_initial_weight_g: data.avgInitialWeightG || null,
    shed_type: data.shedType || null,
    farm_register_id: data.farmRegisterId || null,
    notes: data.notes || null,
  });
  logger.info(`Poultry flock created: ${flock.uuid}, farmer: ${farmerId}`);
  return mapFlockDto(flock);
};

const getFlockById = async (flockId) => {
  const { PoultryFlock, PoultryBatchSummary } = getDb();
  const flock = await PoultryFlock.findByPk(flockId, {
    include: [{ model: PoultryBatchSummary, as: 'batchSummaries', limit: 1, order: [['summary_date', 'DESC']] }],
  });
  if (!flock || !flock.is_active) { const err = new Error('Flock not found'); err.statusCode = 404; throw err; }
  return mapFlockDto(flock);
};

const listFarmerFlocks = async (farmerId, filters = {}) => {
  const { PoultryFlock, PoultryBatchSummary } = getDb();
  const where = { farmer_id: farmerId, is_active: true };
  if (filters.status) where.status = filters.status;

  const flocks = await PoultryFlock.findAll({
    where,
    include: [{ model: PoultryBatchSummary, as: 'batchSummaries', limit: 1, order: [['summary_date', 'DESC']], required: false }],
    order: [['created_at', 'DESC']],
  });
  return flocks.map(mapFlockDto);
};

const updateFlock = async (flockId, data) => {
  const { PoultryFlock } = getDb();
  const flock = await PoultryFlock.findByPk(flockId);
  if (!flock || !flock.is_active) { const err = new Error('Flock not found'); err.statusCode = 404; throw err; }

  const updates = {};
  if (data.batchName !== undefined) updates.batch_name = data.batchName;
  if (data.breed !== undefined) updates.breed = data.breed;
  if (data.shedType !== undefined) updates.shed_type = data.shedType;
  if (data.notes !== undefined) updates.notes = data.notes;

  await flock.update(updates);
  return mapFlockDto(flock);
};

const completeFlock = async (flockId, completionDate) => {
  const { PoultryFlock } = getDb();
  const flock = await PoultryFlock.findByPk(flockId);
  if (!flock || !flock.is_active) { const err = new Error('Flock not found'); err.statusCode = 404; throw err; }

  await flock.update({ status: 'COMPLETED', completion_date: completionDate || new Date().toISOString().slice(0, 10) });
  return mapFlockDto(flock);
};

const getFlockDashboard = async (flockId) => {
  const { PoultryFlock, PoultryDailyLog, PoultryBatchSummary, PoultryPopTemplate } = getDb();
  const { Op } = require('sequelize');

  const flock = await PoultryFlock.findByPk(flockId);
  if (!flock || !flock.is_active) { const err = new Error('Flock not found'); err.statusCode = 404; throw err; }

  const daysSincePlacement = Math.round((Date.now() - new Date(flock.placement_date).getTime()) / 86400000);
  const weekNumber = Math.ceil(daysSincePlacement / 7);

  // Latest summary
  const summary = await PoultryBatchSummary.findOne({
    where: { flock_id: flockId, is_active: true },
    order: [['summary_date', 'DESC']],
  });

  // Last 7 days logs
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const recentLogs = await PoultryDailyLog.findAll({
    where: { flock_id: flockId, is_active: true, log_date: { [Op.gte]: sevenDaysAgo } },
    order: [['log_date', 'DESC']],
  });

  // PoP standard for this week
  const popStandard = await PoultryPopTemplate.findOne({
    where: { bird_type: flock.bird_type === 'LAYER' ? 'LAYER' : 'BROILER', week_number: weekNumber, is_active: true },
  });

  const dailyAvgFeed = recentLogs.length > 0
    ? recentLogs.reduce((s, l) => s + parseFloat(l.feed_consumed_kg || 0), 0) / recentLogs.length
    : 0;

  return {
    flockId: flock.id, flockUuid: flock.uuid, batchName: flock.batch_name,
    birdType: flock.bird_type, breed: flock.breed,
    currentCount: flock.current_count, initialCount: flock.initial_count,
    status: flock.status, daysSincePlacement, weekNumber,
    mortalityRate: summary ? parseFloat(summary.mortality_rate_pct || 0) : 0,
    fcr: summary ? parseFloat(summary.fcr || 0) : null,
    avgWeightG: summary ? summary.avg_weight_g : null,
    eggProductionPct: summary ? parseFloat(summary.egg_production_pct || 0) : null,
    totalCost: summary ? parseFloat(summary.total_cost || 0) : 0,
    totalRevenue: summary ? parseFloat(summary.total_revenue || 0) : 0,
    profitPerBird: summary ? parseFloat(summary.profit_per_bird || 0) : null,
    dailyAvgFeedKg: Math.round(dailyAvgFeed * 100) / 100,
    popStandard: popStandard ? {
      expectedFeedGPerBird: popStandard.expected_feed_g_per_bird,
      expectedWeightG: popStandard.expected_weight_g,
      expectedEggPct: popStandard.expected_egg_pct ? parseFloat(popStandard.expected_egg_pct) : null,
      expectedMortalityPct: popStandard.expected_mortality_pct ? parseFloat(popStandard.expected_mortality_pct) : null,
      vaccinationDue: popStandard.vaccination_due,
    } : null,
  };
};

const mapFlockDto = (flock) => ({
  flockId: flock.id, flockUuid: flock.uuid, farmerId: flock.farmer_id,
  batchName: flock.batch_name, birdType: flock.bird_type, breed: flock.breed,
  placementDate: flock.placement_date, initialCount: flock.initial_count,
  currentCount: flock.current_count, avgInitialWeightG: flock.avg_initial_weight_g,
  status: flock.status, completionDate: flock.completion_date,
  shedType: flock.shed_type, notes: flock.notes,
  latestSummary: flock.batchSummaries?.[0] ? {
    mortalityRatePct: parseFloat(flock.batchSummaries[0].mortality_rate_pct || 0),
    fcr: flock.batchSummaries[0].fcr ? parseFloat(flock.batchSummaries[0].fcr) : null,
    totalCost: parseFloat(flock.batchSummaries[0].total_cost || 0),
    totalRevenue: parseFloat(flock.batchSummaries[0].total_revenue || 0),
  } : null,
  createdAt: flock.created_at,
});

module.exports = { createFlock, getFlockById, listFarmerFlocks, updateFlock, completeFlock, getFlockDashboard };
