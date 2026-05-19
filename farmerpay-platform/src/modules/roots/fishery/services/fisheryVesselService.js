/**
 * Fishery Vessel Service
 * CRUD for sea fishing vessels — first-class assets that own trips. Mirrors
 * dairyAnimalV2Service in structure: add, list, get, update, exit.
 * Auto-creates a VESSEL_PURCHASE cost event when purchase_cost is provided.
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../../../shared/utils/logger');
const fisheryProfileService = require('./fisheryProfileService');

let db;
const getDb = () => {
  if (!db) db = require('../../../../shared/models');
  return db;
};

const addVessel = async (farmerId, data) => {
  const { FisheryVessel, FisheryCostEvent } = getDb();

  const vesselUuid = uuidv4();
  const vessel = await FisheryVessel.create({
    vessel_uuid: vesselUuid,
    farmer_id: farmerId,
    vessel_name: data.vesselName || null,
    registration_number: data.registrationNumber || null,
    vessel_type: data.vesselType || 'MECHANIZED_BOAT',
    length_meters: data.lengthMeters || null,
    engine_hp: data.engineHp || null,
    fuel_type: data.fuelType || null,
    crew_size: data.crewSize || null,
    license_type: data.licenseType || null,
    license_number: data.licenseNumber || null,
    license_expiry: data.licenseExpiry || null,
    home_port: data.homePort || null,
    purchase_date: data.purchaseDate || null,
    purchase_cost: data.purchaseCost || null,
    purchase_cost_formal: data.purchaseCostFormal || null,
    purchase_cost_informal: data.purchaseCostInformal || null,
    acquisition_mode: data.acquisitionMode || 'PURCHASED',
    status: 'ACTIVE',
    primary_photo_url: data.primaryPhotoUrl || null,
    notes: data.notes || null,
  });

  if (data.purchaseCost && parseFloat(data.purchaseCost) > 0) {
    await FisheryCostEvent.create({
      event_uuid: uuidv4(),
      farmer_id: farmerId,
      event_date: data.purchaseDate || new Date(),
      scope: 'VESSEL',
      vessel_id: vesselUuid,
      category: 'VESSEL_PURCHASE',
      amount: data.purchaseCost,
      amount_formal: data.purchaseCostFormal || 0,
      amount_informal: data.purchaseCostInformal || 0,
      payment_mode: data.paymentMode || 'CASH',
      source_table: 'fishery_vessels',
      source_event_uuid: vesselUuid,
      notes: `Auto-created on vessel purchase (${data.vesselName || vesselUuid})`,
    });
  }

  await fisheryProfileService.recomputeTier(farmerId);
  logger.info(`Fishery vessel ${vesselUuid} added for farmer ${farmerId}`);
  return vessel;
};

const listVessels = async (farmerId, filters = {}) => {
  const { FisheryVessel } = getDb();
  const where = { farmer_id: farmerId, is_active: true };
  if (filters.status) where.status = filters.status;
  else where.status = 'ACTIVE';
  return FisheryVessel.findAll({ where, order: [['created_at', 'DESC']] });
};

const getVessel = async (farmerId, vesselUuid) => {
  const { FisheryVessel } = getDb();
  const vessel = await FisheryVessel.findOne({
    where: { vessel_uuid: vesselUuid, farmer_id: farmerId, is_active: true },
  });
  if (!vessel) {
    const err = new Error('Vessel not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }
  return vessel;
};

const updateVessel = async (farmerId, vesselUuid, data) => {
  const vessel = await getVessel(farmerId, vesselUuid);
  const updatable = [
    'vessel_name', 'registration_number', 'vessel_type', 'length_meters',
    'engine_hp', 'fuel_type', 'crew_size', 'home_port',
    'license_type', 'license_number', 'license_expiry',
    'primary_photo_url', 'notes',
  ];
  const patch = {};
  updatable.forEach((k) => {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (data[camel] !== undefined) patch[k] = data[camel];
  });
  await vessel.update(patch);
  return vessel;
};

const exitVessel = async (farmerId, vesselUuid, data) => {
  const { FisheryRevenueEvent } = getDb();
  const vessel = await getVessel(farmerId, vesselUuid);

  const exitReason = data.exitReason;
  if (!['SOLD', 'LOST', 'SCRAPPED'].includes(exitReason)) {
    const err = new Error('Invalid exit reason');
    err.statusCode = 400;
    err.errorCode = 'VAL_001';
    throw err;
  }

  await vessel.update({
    status: exitReason,
    exit_date: data.exitDate || new Date(),
    exit_reason: exitReason,
    exit_value: data.exitValue || 0,
    is_active: false,
  });

  if (exitReason === 'SOLD' && data.exitValue && parseFloat(data.exitValue) > 0) {
    await FisheryRevenueEvent.create({
      event_uuid: uuidv4(),
      farmer_id: farmerId,
      event_date: data.exitDate || new Date(),
      scope: 'VESSEL',
      vessel_id: vesselUuid,
      category: 'VESSEL_SALE',
      amount: data.exitValue,
      buyer_name: data.buyerName || null,
      source_table: 'fishery_vessels',
      source_event_uuid: vesselUuid,
      notes: `Auto-created on vessel sale (${vessel.vessel_name || vesselUuid})`,
    });
  }

  await fisheryProfileService.recomputeTier(farmerId);
  logger.info(`Fishery vessel ${vesselUuid} exited (${exitReason}) for farmer ${farmerId}`);
  return vessel;
};

module.exports = { addVessel, listVessels, getVessel, updateVessel, exitVessel };
