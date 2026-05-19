/**
 * Horticulture Service
 * Business logic for orchard management, planting, harvest, health, inputs, irrigation.
 */

const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const logger = require('../../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../../shared/models');
  return db;
};

/**
 * Creates a new orchard for a farmer.
 */
const createOrchard = async (farmerId, data) => {
  const { HorticultureOrchard } = getDb();

  const orchard = await HorticultureOrchard.create({
    orchard_uuid: uuidv4(),
    farmer_id: farmerId,
    orchard_name: data.orchardName,
    crop_name: data.cropName || null,
    variety: data.variety || null,
    area_hectares: data.areaHectares || null,
    planting_date: data.plantingDate || null,
    plant_count: data.plantCount || null,
    plant_spacing_meters: data.plantSpacingMeters || null,
    infrastructure_type: data.infrastructureType || 'open_field',
    infrastructure_area_sqm: data.infrastructureAreaSqm || null,
    subsidy_scheme: data.subsidyScheme || null,
    subsidy_amount: data.subsidyAmount || null,
    orchard_gps_latitude: data.latitude || null,
    orchard_gps_longitude: data.longitude || null,
  });

  logger.info(`Orchard ${orchard.id} created for farmer ${farmerId}`);
  return { orchardId: orchard.id, orchardUuid: orchard.orchard_uuid };
};

/**
 * Gets all orchards for a farmer.
 */
const getOrchards = async (farmerId) => {
  const { HorticultureOrchard } = getDb();

  const orchards = await HorticultureOrchard.findAll({
    where: { farmer_id: farmerId, is_active: true },
    order: [['created_at', 'DESC']],
  });

  return orchards.map((o) => ({
    orchardId: o.id,
    orchardUuid: o.orchard_uuid,
    orchardName: o.orchard_name,
    cropName: o.crop_name,
    variety: o.variety,
    areaHectares: o.area_hectares,
    infrastructureType: o.infrastructure_type,
    plantCount: o.plant_count,
  }));
};

/**
 * Gets orchard detail with all related records.
 */
const getOrchardDetail = async (orchardId) => {
  const {
    HorticultureOrchard, HorticulturePlanting, HorticultureHarvest,
    HorticultureHealthRecord, HorticultureInputLog, HorticultureIrrigationLog,
  } = getDb();

  const orchard = await HorticultureOrchard.findOne({
    where: { id: orchardId, is_active: true },
    include: [
      { model: HorticulturePlanting, as: 'plantings', where: { is_active: true }, required: false },
      { model: HorticultureHarvest, as: 'harvests', where: { is_active: true }, required: false, limit: 10, order: [['harvest_date', 'DESC']] },
      { model: HorticultureHealthRecord, as: 'healthRecords', where: { is_active: true }, required: false, limit: 5, order: [['observation_date', 'DESC']] },
    ],
  });

  if (!orchard) {
    const err = new Error('Orchard not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  return orchard;
};

/**
 * Adds a planting record to an orchard.
 */
const addPlanting = async (orchardId, data) => {
  const { HorticultureOrchard, HorticulturePlanting } = getDb();

  const orchard = await HorticultureOrchard.findOne({ where: { id: orchardId, is_active: true } });
  if (!orchard) {
    const err = new Error('Orchard not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const planting = await HorticulturePlanting.create({
    orchard_id: orchardId,
    sapling_source: data.saplingSource || null,
    sapling_variety: data.saplingVariety || null,
    sapling_count: data.saplingCount || null,
    sapling_cost_per_unit: data.saplingCostPerUnit || null,
    planting_date: data.plantingDate || null,
    survival_rate_percent: data.survivalRatePercent || null,
  });

  return { plantingId: planting.id };
};

/**
 * Records a harvest with grading.
 */
const addHarvest = async (orchardId, data) => {
  const { HorticultureOrchard, HorticultureHarvest } = getDb();

  const orchard = await HorticultureOrchard.findOne({ where: { id: orchardId, is_active: true } });
  if (!orchard) {
    const err = new Error('Orchard not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const totalSaleValue = data.saleQuantityKg && data.salePricePerKg
    ? data.saleQuantityKg * data.salePricePerKg
    : null;

  const harvest = await HorticultureHarvest.create({
    orchard_id: orchardId,
    harvest_date: data.harvestDate,
    total_yield_kg: data.totalYieldKg || null,
    grade_a_kg: data.gradeAKg || null,
    grade_b_kg: data.gradeBKg || null,
    grade_c_kg: data.gradeCKg || null,
    rejection_kg: data.rejectionKg || null,
    rejection_reason: data.rejectionReason || null,
    sale_quantity_kg: data.saleQuantityKg || null,
    sale_price_per_kg: data.salePricePerKg || null,
    total_sale_value: totalSaleValue,
    buyer_name: data.buyerName || null,
    buyer_type: data.buyerType || null,
  });

  return { harvestId: harvest.id };
};

/**
 * Records a health observation.
 */
const addHealthRecord = async (orchardId, data) => {
  const { HorticultureOrchard, HorticultureHealthRecord } = getDb();

  const orchard = await HorticultureOrchard.findOne({ where: { id: orchardId, is_active: true } });
  if (!orchard) {
    const err = new Error('Orchard not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const record = await HorticultureHealthRecord.create({
    orchard_id: orchardId,
    observation_date: data.observationDate,
    health_status: data.healthStatus || null,
    pest_detected: data.pestDetected || false,
    pest_name: data.pestName || null,
    disease_detected: data.diseaseDetected || false,
    disease_name: data.diseaseName || null,
    affected_plant_count: data.affectedPlantCount || null,
    treatment_given: data.treatmentGiven || null,
  });

  return { healthRecordId: record.id };
};

/**
 * Records an input application.
 */
const addInputLog = async (orchardId, data) => {
  const { HorticultureOrchard, HorticultureInputLog } = getDb();

  const orchard = await HorticultureOrchard.findOne({ where: { id: orchardId, is_active: true } });
  if (!orchard) {
    const err = new Error('Orchard not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const log = await HorticultureInputLog.create({
    orchard_id: orchardId,
    input_date: data.inputDate,
    input_type: data.inputType || null,
    input_name: data.inputName || null,
    quantity: data.quantity || null,
    unit: data.unit || null,
    cost: data.cost || null,
  });

  return { inputLogId: log.id };
};

/**
 * Records an irrigation event.
 */
const addIrrigationLog = async (orchardId, data) => {
  const { HorticultureOrchard, HorticultureIrrigationLog } = getDb();

  const orchard = await HorticultureOrchard.findOne({ where: { id: orchardId, is_active: true } });
  if (!orchard) {
    const err = new Error('Orchard not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const log = await HorticultureIrrigationLog.create({
    orchard_id: orchardId,
    irrigation_date: data.irrigationDate,
    irrigation_method: data.irrigationMethod || null,
    duration_hours: data.durationHours || null,
    water_source: data.waterSource || null,
    cost: data.cost || null,
  });

  return { irrigationLogId: log.id };
};

/**
 * Gets production summary for an orchard for a given month/year.
 */
const getProductionSummary = async (orchardId, month, year) => {
  const {
    HorticultureOrchard, HorticultureHarvest, HorticultureInputLog,
    HorticultureExpenseSummary, HorticultureIncomeSummary,
  } = getDb();

  const orchard = await HorticultureOrchard.findOne({ where: { id: orchardId, is_active: true } });
  if (!orchard) {
    const err = new Error('Orchard not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const harvests = await HorticultureHarvest.findAll({
    where: { orchard_id: orchardId, harvest_date: { [Op.between]: [startDate, endDate] }, is_active: true },
  });

  const totalYield = harvests.reduce((s, h) => s + (parseInt(h.total_yield_kg) || 0), 0);
  const totalSale = harvests.reduce((s, h) => s + parseFloat(h.total_sale_value || 0), 0);
  const totalRejection = harvests.reduce((s, h) => s + (parseInt(h.rejection_kg) || 0), 0);

  const expense = await HorticultureExpenseSummary.findOne({
    where: { orchard_id: orchardId, expense_month: month, expense_year: year, is_active: true },
  });

  const income = await HorticultureIncomeSummary.findOne({
    where: { orchard_id: orchardId, income_month: month, income_year: year, is_active: true },
  });

  return {
    orchardName: orchard.orchard_name,
    cropName: orchard.crop_name,
    month,
    year,
    totalYieldKg: totalYield,
    totalSaleValue: totalSale.toFixed(2),
    totalRejectionKg: totalRejection,
    harvestCount: harvests.length,
    expenses: expense ? expense.total_expense : null,
    income: income ? income.total_income : null,
    profit: expense && income ? (parseFloat(income.total_income) - parseFloat(expense.total_expense)).toFixed(2) : null,
  };
};

module.exports = {
  createOrchard,
  getOrchards,
  getOrchardDetail,
  addPlanting,
  addHarvest,
  addHealthRecord,
  addInputLog,
  addIrrigationLog,
  getProductionSummary,
};
