/**
 * Fishery Revenue Event Service
 * Logs fish sales (wholesale/auction/direct/export), byproducts, pond lease,
 * vessel sale, insurance payout, subsidy. Supports polymorphic scope so
 * direct-scope revenue flows to the right P&L bucket.
 */

const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const logger = require('../../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../../shared/models');
  return db;
};

const createRevenueEvent = async (farmerId, data) => {
  const { FisheryRevenueEvent } = getDb();

  let amount = data.amount;
  if (amount == null && data.quantityKg && data.ratePerKg) {
    amount = parseFloat(data.quantityKg) * parseFloat(data.ratePerKg);
  }
  const formal = parseFloat(data.amountFormal || 0);
  const informal = parseFloat(data.amountInformal || 0);
  if (amount == null) amount = formal + informal;

  const event = await FisheryRevenueEvent.create({
    event_uuid: uuidv4(),
    farmer_id: farmerId,
    event_date: data.eventDate || new Date(),
    scope: data.scope || 'FARM',
    pond_id: data.pondId || null,
    vessel_id: data.vesselId || null,
    trip_id: data.tripId || null,
    category: data.category,
    species: data.species || null,
    quantity_kg: data.quantityKg || null,
    avg_weight_grams: data.avgWeightGrams || null,
    rate_per_kg: data.ratePerKg || null,
    amount,
    amount_formal: formal,
    amount_informal: informal,
    buyer_name: data.buyerName || null,
    buyer_type: data.buyerType || null,
    payment_mode: data.paymentMode || null,
    landing_port: data.landingPort || null,
    notes: data.notes || null,
    source_table: data.sourceTable || null,
    source_event_uuid: data.sourceEventUuid || null,
    is_estimated: !!data.isEstimated,
    is_correction: !!data.isCorrection,
    corrects_event_uuid: data.correctsEventUuid || null,
  });

  logger.info(`Fishery revenue event ${event.event_uuid} created (${data.category}, ₹${amount})`);
  return event;
};

const listRevenueEvents = async (farmerId, filters = {}) => {
  const { FisheryRevenueEvent } = getDb();
  const where = { farmer_id: farmerId };
  if (filters.category) where.category = filters.category;
  if (filters.scope) where.scope = filters.scope;
  if (filters.pondId) where.pond_id = filters.pondId;
  if (filters.vesselId) where.vessel_id = filters.vesselId;
  if (filters.tripId) where.trip_id = filters.tripId;
  if (filters.startDate && filters.endDate) {
    where.event_date = { [Op.between]: [filters.startDate, filters.endDate] };
  }
  return FisheryRevenueEvent.findAll({
    where,
    order: [['event_date', 'DESC'], ['id', 'DESC']],
    limit: filters.limit || 100,
  });
};

module.exports = { createRevenueEvent, listRevenueEvents };
