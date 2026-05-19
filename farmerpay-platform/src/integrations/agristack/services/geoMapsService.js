/**
 * AgriStack Geo Maps Service — STUB (P0)
 *
 * #5 Farm geo-boundaries (i16:o21) → Replace manual GPS polygon capture (~15 min saved)
 * #6 Village-level geo maps (i13:o18) → Village boundary context
 *
 * Target tables: farm_registers (GeoJSON), farmer_gps_locations, fields
 */

const logger = require('../../../shared/utils/logger');
const config = require('../config/agristackConfig');
const client = require('./agristackClient');

const getFarmGeoBoundaries = async (farmerId, landParcelId) => {
  if (!config.features.geoMapsEnabled) return null;
  return client.callApi('geoReferencedMaps', { farmer_id: farmerId, parcel_id: landParcelId });
};

const getVillageGeoMap = async (lgdVillageId) => {
  if (!config.features.geoMapsEnabled) return null;
  return client.callApi('villageGeoMaps', { village_id: lgdVillageId });
};

module.exports = { getFarmGeoBoundaries, getVillageGeoMap };
