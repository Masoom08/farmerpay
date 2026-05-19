/**
 * Fishery Trip Service (sea)
 * Trips are the P&L unit for sea fishing (like a pond cycle for inland).
 * One trip record captures the whole voyage + auto-creates cost events for
 * fuel/ice/crew_wages/bait/other and a revenue event for the landing sale.
 * Creates the P&L story end-to-end in a single save.
 */

const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const logger = require('../../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../../shared/models');
  return db;
};

const createTrip = async (farmerId, data) => {
  const { FisheryTripEvent, FisheryCostEvent, FisheryRevenueEvent } = getDb();

  const tripUuid = uuidv4();
  const trip = await FisheryTripEvent.create({
    trip_uuid: tripUuid,
    farmer_id: farmerId,
    vessel_id: data.vesselId,
    depart_date: data.departDate,
    depart_time: data.departTime || null,
    return_date: data.returnDate || null,
    return_time: data.returnTime || null,
    trip_hours: data.tripHours || null,
    fuel_liters: data.fuelLiters || null,
    fuel_cost: data.fuelCost || 0,
    ice_kg: data.iceKg || null,
    ice_cost: data.iceCost || 0,
    bait_cost: data.baitCost || 0,
    crew_count: data.crewCount || null,
    crew_wages_total: data.crewWagesTotal || 0,
    other_cost: data.otherCost || 0,
    catch_total_kg: data.catchTotalKg || null,
    catch_species_mix: data.catchSpeciesMix || null,
    landing_port: data.landingPort || null,
    sale_amount: data.saleAmount || null,
    sale_buyer: data.saleBuyer || null,
    sale_buyer_type: data.saleBuyerType || null,
    auction_commission: data.auctionCommission || 0,
    cost_formal: data.costFormal || 0,
    cost_informal: data.costInformal || 0,
    payment_mode: data.paymentMode || null,
    status: data.status || 'COMPLETED',
    notes: data.notes || null,
  });

  const costBuckets = [
    ['FUEL', data.fuelCost],
    ['ICE', data.iceCost],
    ['BAIT', data.baitCost],
    ['CREW_WAGES', data.crewWagesTotal],
    ['OTHER', data.otherCost],
    ['AUCTION_COMMISSION', data.auctionCommission],
  ];
  for (const [category, amount] of costBuckets) {
    const amt = parseFloat(amount || 0);
    if (amt > 0) {
      await FisheryCostEvent.create({
        event_uuid: uuidv4(),
        farmer_id: farmerId,
        event_date: data.departDate,
        scope: 'TRIP',
        vessel_id: data.vesselId,
        trip_id: tripUuid,
        category,
        amount: amt,
        amount_formal: 0,
        amount_informal: amt,
        payment_mode: data.paymentMode || 'CASH',
        source_table: 'fishery_trip_events',
        source_event_uuid: tripUuid,
        notes: `Trip ${tripUuid.slice(0, 8)} - ${category}`,
      });
    }
  }

  if (data.saleAmount && parseFloat(data.saleAmount) > 0) {
    const buyerTypeToCat = {
      WHOLESALER: 'FISH_SALE_WHOLESALE',
      AUCTION: 'FISH_SALE_AUCTION',
      DIRECT: 'FISH_SALE_DIRECT',
      EXPORTER: 'FISH_SALE_EXPORT',
      COOPERATIVE: 'FISH_SALE_COOPERATIVE',
    };
    const category = buyerTypeToCat[data.saleBuyerType] || 'FISH_SALE_WHOLESALE';
    await FisheryRevenueEvent.create({
      event_uuid: uuidv4(),
      farmer_id: farmerId,
      event_date: data.returnDate || data.departDate,
      scope: 'TRIP',
      vessel_id: data.vesselId,
      trip_id: tripUuid,
      category,
      quantity_kg: data.catchTotalKg || null,
      amount: data.saleAmount,
      buyer_name: data.saleBuyer || null,
      buyer_type: data.saleBuyerType || null,
      landing_port: data.landingPort || null,
      payment_mode: data.paymentMode || null,
      source_table: 'fishery_trip_events',
      source_event_uuid: tripUuid,
      notes: `Landing sale trip ${tripUuid.slice(0, 8)}`,
    });
  }

  logger.info(`Trip ${tripUuid} created (vessel=${data.vesselId}, sale=₹${data.saleAmount || 0})`);
  return trip;
};

const listTrips = async (farmerId, filters = {}) => {
  const { FisheryTripEvent } = getDb();
  const where = { farmer_id: farmerId };
  if (filters.vesselId) where.vessel_id = filters.vesselId;
  if (filters.status) where.status = filters.status;
  if (filters.startDate && filters.endDate) {
    where.depart_date = { [Op.between]: [filters.startDate, filters.endDate] };
  }
  return FisheryTripEvent.findAll({
    where,
    order: [['depart_date', 'DESC']],
    limit: filters.limit || 100,
  });
};

const getTrip = async (farmerId, tripUuid) => {
  const { FisheryTripEvent } = getDb();
  const trip = await FisheryTripEvent.findOne({
    where: { trip_uuid: tripUuid, farmer_id: farmerId },
  });
  if (!trip) {
    const err = new Error('Trip not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }
  return trip;
};

module.exports = { createTrip, listTrips, getTrip };
