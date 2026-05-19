/**
 * Fishery Service
 * Business logic for pond management, stocking, water quality, and production.
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
 * Creates a new pond register for a farmer.
 */
const createPondRegister = async (farmerId, data) => {
  const { FisheryPondRegister } = getDb();

  const register = await FisheryPondRegister.create({
    register_uuid: uuidv4(),
    farmer_id: farmerId,
    register_name: data.registerName,
    total_pond_area_hectares: data.totalPondArea || null,
  });

  logger.info(`Fishery pond register ${register.id} created for farmer ${farmerId}`);
  return { registerId: register.id, registerUuid: register.register_uuid };
};

/**
 * Adds a pond to a register.
 */
const addPond = async (registerId, data) => {
  const { FisheryPondRegister, FisheryPond } = getDb();

  const register = await FisheryPondRegister.findOne({ where: { id: registerId, is_active: true } });
  if (!register) {
    const err = new Error('Pond register not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const pond = await FisheryPond.create({
    pond_uuid: uuidv4(),
    register_id: registerId,
    pond_name: data.pondName,
    pond_area_hectares: data.pondArea || null,
    pond_depth_meters: data.pondDepth || null,
    water_source: data.waterSource || null,
  });

  logger.info(`Pond ${pond.id} added to register ${registerId}`);
  return { pondId: pond.id, pondUuid: pond.pond_uuid };
};

/**
 * Records species stocking for a pond.
 */
const addStocking = async (pondId, data) => {
  const { FisheryPond, FisherySpeciesStocked } = getDb();

  const pond = await FisheryPond.findOne({ where: { id: pondId, is_active: true } });
  if (!pond) {
    const err = new Error('Pond not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const stocking = await FisherySpeciesStocked.create({
    pond_id: pondId,
    species_name: data.speciesName,
    species_type: data.speciesType || null,
    stocking_date: new Date(),
    fingerlings_stocked: data.fingerlings || null,
    fingerling_cost_per_unit: data.fingerlingCostPerUnit || null,
    expected_survival_rate: data.fingerlingSurvivalRate || null,
  });

  return { stockingId: stocking.id };
};

/**
 * Gets water quality logs for a pond in a given month/year.
 */
const getWaterQuality = async (pondId, month, year) => {
  const { FisheryPond, FisheryWaterQualityLog } = getDb();

  const pond = await FisheryPond.findOne({ where: { id: pondId, is_active: true } });
  if (!pond) {
    const err = new Error('Pond not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const logs = await FisheryWaterQualityLog.findAll({
    where: {
      pond_id: pondId,
      test_date: { [Op.between]: [startDate, endDate] },
      is_active: true,
    },
    order: [['test_date', 'ASC']],
  });

  return logs.map((l) => ({
    testDate: l.test_date,
    ph: l.water_ph,
    dissolvedOxygen: l.dissolved_oxygen_ppm,
    ammonia: l.ammonia_ppm,
    temperature: l.temperature_celsius,
    turbidity: l.turbidity_cm,
    actionTaken: l.action_taken,
  }));
};

module.exports = {
  createPondRegister,
  addPond,
  addStocking,
  getWaterQuality,
};
