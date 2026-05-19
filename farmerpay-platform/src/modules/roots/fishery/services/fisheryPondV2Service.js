/**
 * Fishery Pond v2 Service
 * CRUD for inland fishery ponds. Pairs with fisheryProfileService to keep
 * the tier in sync with total pond area. Auto-creates a POND_CONSTRUCTION
 * cost event when construction_cost is provided.
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../../../shared/utils/logger');
const fisheryProfileService = require('./fisheryProfileService');

let db;
const getDb = () => {
  if (!db) db = require('../../../../shared/models');
  return db;
};

const addPond = async (farmerId, data) => {
  const { FisheryPond, FisheryCostEvent } = getDb();

  const pondUuid = uuidv4();
  const pond = await FisheryPond.create({
    pond_uuid: pondUuid,
    farmer_id: farmerId,
    register_id: data.registerId || null,
    pond_name: data.pondName || null,
    pond_area_hectares: data.pondAreaHectares || null,
    pond_depth_meters: data.pondDepthMeters || null,
    water_source: data.waterSource || null,
    license_type: data.licenseType || null,
    license_number: data.licenseNumber || null,
    license_issuing_authority: data.licenseIssuingAuthority || null,
    license_expiry_date: data.licenseExpiryDate || null,
    status: 'ACTIVE',
    current_cycle_start_date: data.currentCycleStartDate || null,
    current_species: data.currentSpecies || null,
    expected_harvest_date: data.expectedHarvestDate || null,
    construction_date: data.constructionDate || null,
    construction_cost: data.constructionCost || null,
    notes: data.notes || null,
  });

  if (data.constructionCost && parseFloat(data.constructionCost) > 0) {
    await FisheryCostEvent.create({
      event_uuid: uuidv4(),
      farmer_id: farmerId,
      event_date: data.constructionDate || new Date(),
      scope: 'POND',
      pond_id: pondUuid,
      category: 'POND_CONSTRUCTION',
      amount: data.constructionCost,
      amount_formal: data.constructionCostFormal || 0,
      amount_informal: data.constructionCostInformal || 0,
      payment_mode: data.paymentMode || 'CASH',
      source_table: 'fishery_ponds',
      source_event_uuid: pondUuid,
      notes: `Auto-created on pond construction (${data.pondName || pondUuid})`,
    });
  }

  await fisheryProfileService.recomputeTier(farmerId);
  logger.info(`Fishery pond ${pondUuid} added for farmer ${farmerId}`);
  return pond;
};

const listPonds = async (farmerId, filters = {}) => {
  const { FisheryPond } = getDb();
  const where = { farmer_id: farmerId, is_active: true };
  if (filters.status) where.status = filters.status;
  else where.status = 'ACTIVE';
  return FisheryPond.findAll({ where, order: [['created_at', 'DESC']] });
};

const getPond = async (farmerId, pondUuid) => {
  const { FisheryPond } = getDb();
  const pond = await FisheryPond.findOne({
    where: { pond_uuid: pondUuid, farmer_id: farmerId, is_active: true },
  });
  if (!pond) {
    const err = new Error('Pond not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }
  return pond;
};

const updatePond = async (farmerId, pondUuid, data) => {
  const pond = await getPond(farmerId, pondUuid);
  const updatable = [
    'pond_name', 'pond_area_hectares', 'pond_depth_meters', 'water_source',
    'current_cycle_start_date', 'current_species', 'expected_harvest_date',
    'notes',
  ];
  const patch = {};
  updatable.forEach((k) => {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (data[camel] !== undefined) patch[k] = data[camel];
  });
  await pond.update(patch);
  await fisheryProfileService.recomputeTier(farmerId);
  return pond;
};

const exitPond = async (farmerId, pondUuid, data) => {
  const pond = await getPond(farmerId, pondUuid);
  await pond.update({
    status: 'DECOMMISSIONED',
    exit_date: data.exitDate || new Date(),
    exit_reason: data.exitReason || null,
    is_active: false,
  });
  await fisheryProfileService.recomputeTier(farmerId);
  return pond;
};

module.exports = { addPond, listPonds, getPond, updatePond, exitPond };
