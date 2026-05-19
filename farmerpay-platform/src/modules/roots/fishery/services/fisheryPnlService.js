/**
 * Fishery P&L Service — Hybrid Allocation Engine
 *
 * Produces four views:
 *   1. Farm P&L        — totals + category breakdown for a date range
 *   2. Per-pond P&L    — inland: allocates FARM costs across ponds weighted
 *                         by area, adds POND-scope costs directly
 *   3. Per-vessel P&L  — sea: allocates FARM costs across vessels equally,
 *                         adds VESSEL/TRIP scope costs directly
 *   4. Per-trip P&L    — sea: the natural P&L unit, direct cost+revenue on
 *                         trip_id (already fanned out by the trip service)
 *
 * Allocation rules:
 *   - POND/VESSEL/TRIP scope → direct to that asset
 *   - FARM scope → split across active ponds/vessels
 *       - Inland pond weighting: by area (hectares)
 *       - Sea vessel weighting: equal (engine hours would be better but we
 *         don't track them consistently yet)
 *   - For BOTH operation type we split FARM costs 50/50 inland vs sea, then
 *     apply the above inside each side.
 */

const { Op } = require('sequelize');

let db;
const getDb = () => {
  if (!db) db = require('../../../../shared/models');
  return db;
};

const sum = (arr, f = (x) => x) =>
  arr.reduce((acc, x) => acc + parseFloat(f(x) || 0), 0);

const getFarmPnl = async (farmerId, startDate, endDate) => {
  const { FisheryCostEvent, FisheryRevenueEvent } = getDb();

  const costs = await FisheryCostEvent.findAll({
    where: {
      farmer_id: farmerId,
      event_date: { [Op.between]: [startDate, endDate] },
      is_pending: false,
    },
  });
  const revenues = await FisheryRevenueEvent.findAll({
    where: {
      farmer_id: farmerId,
      event_date: { [Op.between]: [startDate, endDate] },
    },
  });

  const totalCost = sum(costs, (c) => c.amount);
  const totalRevenue = sum(revenues, (r) => r.amount);
  const formalCost = sum(costs, (c) => c.amount_formal);
  const informalCost = sum(costs, (c) => c.amount_informal);

  const byCategory = {};
  for (const c of costs) {
    byCategory[c.category] = (byCategory[c.category] || 0) + parseFloat(c.amount || 0);
  }
  const revByCategory = {};
  for (const r of revenues) {
    revByCategory[r.category] = (revByCategory[r.category] || 0) + parseFloat(r.amount || 0);
  }

  // Scope split (inland vs sea)
  const scopeSplit = { FARM: 0, POND: 0, VESSEL: 0, TRIP: 0 };
  for (const c of costs) scopeSplit[c.scope] += parseFloat(c.amount || 0);

  return {
    period: { startDate, endDate },
    totalCost: totalCost.toFixed(2),
    totalRevenue: totalRevenue.toFixed(2),
    netProfit: (totalRevenue - totalCost).toFixed(2),
    formalCost: formalCost.toFixed(2),
    informalCost: informalCost.toFixed(2),
    costByCategory: byCategory,
    revenueByCategory: revByCategory,
    costByScope: scopeSplit,
    eventCounts: { costs: costs.length, revenues: revenues.length },
  };
};

/**
 * Per-pond P&L. Inland ponds receive:
 *   - all POND-scope costs/revenues where pond_id matches (direct)
 *   - a share of FARM-scope inland-ish costs weighted by pond area
 * Sea-only costs (FUEL/ICE/CREW_WAGES/BAIT/etc in FARM scope) are skipped
 * from pond allocation.
 */
const getPerPondPnl = async (farmerId, startDate, endDate) => {
  const {
    FisheryPond, FisheryCostEvent, FisheryRevenueEvent,
  } = getDb();

  const ponds = await FisheryPond.findAll({
    where: { farmer_id: farmerId, status: 'ACTIVE', is_active: true },
  });
  if (ponds.length === 0) return [];

  const totalArea = ponds.reduce((s, p) => s + parseFloat(p.pond_area_hectares || 0), 0);
  const equalWeight = 1 / ponds.length;

  const costs = await FisheryCostEvent.findAll({
    where: {
      farmer_id: farmerId,
      event_date: { [Op.between]: [startDate, endDate] },
      is_pending: false,
    },
  });
  const revenues = await FisheryRevenueEvent.findAll({
    where: {
      farmer_id: farmerId,
      event_date: { [Op.between]: [startDate, endDate] },
    },
  });

  const SEA_ONLY_CATEGORIES = new Set([
    'FUEL', 'ICE', 'NETS_GEAR', 'BAIT', 'CREW_WAGES',
    'BOAT_MAINTENANCE', 'AUCTION_COMMISSION', 'LANDING_FEES', 'VESSEL_PURCHASE',
  ]);

  const pnl = {};
  for (const p of ponds) {
    pnl[p.pond_uuid] = {
      pondUuid: p.pond_uuid,
      pondName: p.pond_name,
      areaHectares: p.pond_area_hectares,
      currentSpecies: p.current_species,
      allocatedCost: 0,
      directCost: 0,
      allocatedRevenue: 0,
      directRevenue: 0,
    };
  }

  const pondWeight = (pondUuid) => {
    const p = ponds.find((x) => x.pond_uuid === pondUuid);
    if (totalArea > 0 && p && p.pond_area_hectares) {
      return parseFloat(p.pond_area_hectares) / totalArea;
    }
    return equalWeight;
  };

  for (const c of costs) {
    const amt = parseFloat(c.amount || 0);
    if (c.scope === 'POND' && c.pond_id && pnl[c.pond_id]) {
      pnl[c.pond_id].directCost += amt;
    } else if (c.scope === 'FARM' && !SEA_ONLY_CATEGORIES.has(c.category)) {
      for (const p of ponds) {
        pnl[p.pond_uuid].allocatedCost += amt * pondWeight(p.pond_uuid);
      }
    }
  }

  for (const r of revenues) {
    const amt = parseFloat(r.amount || 0);
    if (r.scope === 'POND' && r.pond_id && pnl[r.pond_id]) {
      pnl[r.pond_id].directRevenue += amt;
    } else if (r.scope === 'FARM' && r.category !== 'VESSEL_SALE') {
      for (const p of ponds) {
        pnl[p.pond_uuid].allocatedRevenue += amt * pondWeight(p.pond_uuid);
      }
    }
  }

  return Object.values(pnl).map((p) => ({
    ...p,
    allocatedCost: p.allocatedCost.toFixed(2),
    directCost: p.directCost.toFixed(2),
    totalCost: (p.allocatedCost + p.directCost).toFixed(2),
    allocatedRevenue: p.allocatedRevenue.toFixed(2),
    directRevenue: p.directRevenue.toFixed(2),
    totalRevenue: (p.allocatedRevenue + p.directRevenue).toFixed(2),
    netProfit: (
      p.allocatedRevenue + p.directRevenue - p.allocatedCost - p.directCost
    ).toFixed(2),
  }));
};

/**
 * Per-vessel P&L. Vessels receive:
 *   - all VESSEL/TRIP-scope costs/revenues where vessel_id matches (direct)
 *   - a share of FARM-scope sea-ish costs split equally
 */
const getPerVesselPnl = async (farmerId, startDate, endDate) => {
  const { FisheryVessel, FisheryCostEvent, FisheryRevenueEvent } = getDb();

  const vessels = await FisheryVessel.findAll({
    where: { farmer_id: farmerId, status: 'ACTIVE', is_active: true },
  });
  if (vessels.length === 0) return [];

  const equalWeight = 1 / vessels.length;
  const costs = await FisheryCostEvent.findAll({
    where: {
      farmer_id: farmerId,
      event_date: { [Op.between]: [startDate, endDate] },
      is_pending: false,
    },
  });
  const revenues = await FisheryRevenueEvent.findAll({
    where: {
      farmer_id: farmerId,
      event_date: { [Op.between]: [startDate, endDate] },
    },
  });

  const INLAND_ONLY_CATEGORIES = new Set([
    'FINGERLINGS', 'FEED', 'POND_PREP', 'AERATION_ELECTRICITY',
    'WATER_MGMT', 'HARVEST_LABOR', 'HEALTH_TREATMENT', 'POND_CONSTRUCTION',
  ]);

  const pnl = {};
  for (const v of vessels) {
    pnl[v.vessel_uuid] = {
      vesselUuid: v.vessel_uuid,
      vesselName: v.vessel_name,
      vesselType: v.vessel_type,
      allocatedCost: 0,
      directCost: 0,
      allocatedRevenue: 0,
      directRevenue: 0,
    };
  }

  for (const c of costs) {
    const amt = parseFloat(c.amount || 0);
    if ((c.scope === 'VESSEL' || c.scope === 'TRIP') && c.vessel_id && pnl[c.vessel_id]) {
      pnl[c.vessel_id].directCost += amt;
    } else if (c.scope === 'FARM' && !INLAND_ONLY_CATEGORIES.has(c.category)) {
      for (const v of vessels) {
        pnl[v.vessel_uuid].allocatedCost += amt * equalWeight;
      }
    }
  }

  for (const r of revenues) {
    const amt = parseFloat(r.amount || 0);
    if ((r.scope === 'VESSEL' || r.scope === 'TRIP') && r.vessel_id && pnl[r.vessel_id]) {
      pnl[r.vessel_id].directRevenue += amt;
    } else if (r.scope === 'FARM' && r.category !== 'POND_LEASE_INCOME') {
      for (const v of vessels) {
        pnl[v.vessel_uuid].allocatedRevenue += amt * equalWeight;
      }
    }
  }

  return Object.values(pnl).map((v) => ({
    ...v,
    allocatedCost: v.allocatedCost.toFixed(2),
    directCost: v.directCost.toFixed(2),
    totalCost: (v.allocatedCost + v.directCost).toFixed(2),
    allocatedRevenue: v.allocatedRevenue.toFixed(2),
    directRevenue: v.directRevenue.toFixed(2),
    totalRevenue: (v.allocatedRevenue + v.directRevenue).toFixed(2),
    netProfit: (
      v.allocatedRevenue + v.directRevenue - v.allocatedCost - v.directCost
    ).toFixed(2),
  }));
};

/**
 * Per-trip P&L. Trips are the natural P&L unit for sea — the trip service
 * already writes TRIP-scope cost + revenue events with trip_id, so this is a
 * direct aggregation (no allocation needed).
 */
const getPerTripPnl = async (farmerId, startDate, endDate) => {
  const { FisheryTripEvent, FisheryCostEvent, FisheryRevenueEvent } = getDb();

  const trips = await FisheryTripEvent.findAll({
    where: {
      farmer_id: farmerId,
      depart_date: { [Op.between]: [startDate, endDate] },
    },
    order: [['depart_date', 'DESC']],
  });
  if (trips.length === 0) return [];

  const tripIds = trips.map((t) => t.trip_uuid);
  const costs = await FisheryCostEvent.findAll({
    where: {
      farmer_id: farmerId,
      scope: 'TRIP',
      trip_id: { [Op.in]: tripIds },
    },
  });
  const revenues = await FisheryRevenueEvent.findAll({
    where: {
      farmer_id: farmerId,
      scope: 'TRIP',
      trip_id: { [Op.in]: tripIds },
    },
  });

  const byTrip = {};
  for (const t of trips) {
    byTrip[t.trip_uuid] = {
      tripUuid: t.trip_uuid,
      vesselId: t.vessel_id,
      departDate: t.depart_date,
      returnDate: t.return_date,
      catchTotalKg: t.catch_total_kg,
      totalCost: 0,
      totalRevenue: 0,
    };
  }
  for (const c of costs) {
    if (byTrip[c.trip_id]) byTrip[c.trip_id].totalCost += parseFloat(c.amount || 0);
  }
  for (const r of revenues) {
    if (byTrip[r.trip_id]) byTrip[r.trip_id].totalRevenue += parseFloat(r.amount || 0);
  }

  return Object.values(byTrip).map((t) => ({
    ...t,
    totalCost: t.totalCost.toFixed(2),
    totalRevenue: t.totalRevenue.toFixed(2),
    netProfit: (t.totalRevenue - t.totalCost).toFixed(2),
  }));
};

module.exports = {
  getFarmPnl, getPerPondPnl, getPerVesselPnl, getPerTripPnl,
};
