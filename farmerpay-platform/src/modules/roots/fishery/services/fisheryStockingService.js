/**
 * Fishery Stocking Service (inland)
 * Records fingerling stocking into a pond and auto-creates a matching
 * FINGERLINGS cost event. Also updates the pond's current_cycle_start_date
 * and current_species so the pond card reflects the active cycle.
 */

const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const logger = require('../../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../../shared/models');
  return db;
};

const createStockingEvent = async (farmerId, data) => {
  const { FisheryStockingEventV2, FisheryCostEvent, FisheryPond } = getDb();

  const formal = parseFloat(data.costFormal || 0);
  const informal = parseFloat(data.costInformal || 0);
  let totalCost = data.totalCost != null ? parseFloat(data.totalCost) : formal + informal;
  if (!totalCost && data.costPerFingerling && data.fingerlingsCount) {
    totalCost = parseFloat(data.costPerFingerling) * parseInt(data.fingerlingsCount, 10);
  }

  const eventUuid = uuidv4();
  const costUuid = uuidv4();

  const event = await FisheryStockingEventV2.create({
    event_uuid: eventUuid,
    farmer_id: farmerId,
    pond_id: data.pondId,
    stocking_date: data.stockingDate,
    species_name: data.speciesName,
    species_type: data.speciesType || 'OTHER',
    fingerlings_count: data.fingerlingsCount,
    cost_per_fingerling: data.costPerFingerling || null,
    total_cost: totalCost,
    cost_formal: formal,
    cost_informal: informal,
    payment_mode: data.paymentMode || null,
    supplier_name: data.supplierName || null,
    expected_survival_rate: data.expectedSurvivalRate || null,
    expected_harvest_date: data.expectedHarvestDate || null,
    notes: data.notes || null,
    cost_event_uuid: costUuid,
  });

  if (totalCost > 0) {
    await FisheryCostEvent.create({
      event_uuid: costUuid,
      farmer_id: farmerId,
      event_date: data.stockingDate,
      scope: 'POND',
      pond_id: data.pondId,
      category: 'FINGERLINGS',
      quantity: data.fingerlingsCount,
      unit: 'pcs',
      unit_price: data.costPerFingerling || null,
      amount: totalCost,
      amount_formal: formal,
      amount_informal: informal,
      payment_mode: data.paymentMode || null,
      vendor_name: data.supplierName || null,
      source_table: 'fishery_stocking_events',
      source_event_uuid: eventUuid,
      notes: `Stocking: ${data.speciesName} x ${data.fingerlingsCount}`,
    });
  }

  // Update pond's active cycle
  await FisheryPond.update(
    {
      current_cycle_start_date: data.stockingDate,
      current_species: data.speciesName,
      expected_harvest_date: data.expectedHarvestDate || null,
    },
    { where: { pond_uuid: data.pondId, farmer_id: farmerId } },
  );

  logger.info(`Stocking event ${eventUuid} created (${data.speciesName}, ₹${totalCost})`);
  return event;
};

const listStockingEvents = async (farmerId, filters = {}) => {
  const { FisheryStockingEventV2 } = getDb();
  const where = { farmer_id: farmerId };
  if (filters.pondId) where.pond_id = filters.pondId;
  if (filters.startDate && filters.endDate) {
    where.stocking_date = { [Op.between]: [filters.startDate, filters.endDate] };
  }
  return FisheryStockingEventV2.findAll({
    where,
    order: [['stocking_date', 'DESC']],
    limit: filters.limit || 100,
  });
};

module.exports = { createStockingEvent, listStockingEvents };
