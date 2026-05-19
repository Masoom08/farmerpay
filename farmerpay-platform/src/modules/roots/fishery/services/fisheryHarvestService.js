/**
 * Fishery Harvest Service (inland)
 * Records pond harvest details. Closes the stocking->harvest cycle. Optionally
 * auto-creates a HARVEST_LABOR cost event and a pond-scope revenue event if
 * sale details are provided. Subsequent deferred sales can still reference
 * this harvest via source_event_uuid.
 */

const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const logger = require('../../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../../shared/models');
  return db;
};

const createHarvestEvent = async (farmerId, data) => {
  const { FisheryHarvestEventV2, FisheryCostEvent, FisheryRevenueEvent, FisheryPond } = getDb();

  const eventUuid = uuidv4();
  const event = await FisheryHarvestEventV2.create({
    event_uuid: eventUuid,
    farmer_id: farmerId,
    pond_id: data.pondId,
    stocking_event_uuid: data.stockingEventUuid || null,
    harvest_date: data.harvestDate,
    total_kg: data.totalKg,
    avg_weight_grams: data.avgWeightGrams || null,
    survival_pct: data.survivalPct || null,
    loss_pct: data.lossPct || null,
    loss_reason: data.lossReason || null,
    harvest_method: data.harvestMethod || 'FULL_HARVEST',
    labor_cost: data.laborCost || null,
    notes: data.notes || null,
  });

  if (data.laborCost && parseFloat(data.laborCost) > 0) {
    await FisheryCostEvent.create({
      event_uuid: uuidv4(),
      farmer_id: farmerId,
      event_date: data.harvestDate,
      scope: 'POND',
      pond_id: data.pondId,
      category: 'HARVEST_LABOR',
      amount: data.laborCost,
      amount_formal: 0,
      amount_informal: parseFloat(data.laborCost),
      payment_mode: 'CASH',
      source_table: 'fishery_harvest_events',
      source_event_uuid: eventUuid,
      notes: `Harvest labor for ${data.totalKg} kg`,
    });
  }

  if (data.saleAmount && parseFloat(data.saleAmount) > 0) {
    await FisheryRevenueEvent.create({
      event_uuid: uuidv4(),
      farmer_id: farmerId,
      event_date: data.harvestDate,
      scope: 'POND',
      pond_id: data.pondId,
      category: data.saleCategory || 'FISH_SALE_WHOLESALE',
      species: data.species || null,
      quantity_kg: data.totalKg,
      rate_per_kg: data.ratePerKg || null,
      amount: data.saleAmount,
      buyer_name: data.buyerName || null,
      buyer_type: data.buyerType || null,
      payment_mode: data.paymentMode || null,
      source_table: 'fishery_harvest_events',
      source_event_uuid: eventUuid,
      notes: `Harvest sale (${data.harvestMethod || 'FULL_HARVEST'})`,
    });
  }

  // If full harvest, clear the pond's active cycle markers
  if ((data.harvestMethod || 'FULL_HARVEST') === 'FULL_HARVEST') {
    await FisheryPond.update(
      { current_cycle_start_date: null, current_species: null, expected_harvest_date: null },
      { where: { pond_uuid: data.pondId, farmer_id: farmerId } },
    );
  }

  logger.info(`Harvest event ${eventUuid} created (${data.totalKg} kg)`);
  return event;
};

const listHarvestEvents = async (farmerId, filters = {}) => {
  const { FisheryHarvestEventV2 } = getDb();
  const where = { farmer_id: farmerId };
  if (filters.pondId) where.pond_id = filters.pondId;
  if (filters.startDate && filters.endDate) {
    where.harvest_date = { [Op.between]: [filters.startDate, filters.endDate] };
  }
  return FisheryHarvestEventV2.findAll({
    where,
    order: [['harvest_date', 'DESC']],
    limit: filters.limit || 100,
  });
};

module.exports = { createHarvestEvent, listHarvestEvents };
