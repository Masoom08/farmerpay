/**
 * IMD station map for the SAGE Phase 2A pilot.
 *
 * Maps a curated list of rice-growing districts to IMD city_weather.php
 * station ids. Station ids come from the dropdown on
 *   http://city.imd.gov.in/citywx/menu.php
 * The list is intentionally short — expand once Phase 2A graduates.
 *
 * lgdDistrictId is optional and resolved at fetch time if not set here.
 * If lgdDistrictId is null the observation is still stored with lat/long
 * and station_id, just unkeyed by district.
 */

module.exports = [
  // North + East rice belt
  { name: 'Lucknow',           imdStationId: '42369', lgdDistrictId: null, latitude: 26.8467, longitude: 80.9462 },
  { name: 'Kanpur',            imdStationId: '42366', lgdDistrictId: null, latitude: 26.4499, longitude: 80.3319 },
  { name: 'Patna',             imdStationId: '42492', lgdDistrictId: null, latitude: 25.5941, longitude: 85.1376 },
  { name: 'Bhubaneswar',       imdStationId: '42971', lgdDistrictId: null, latitude: 20.2961, longitude: 85.8245 },
  { name: 'Cuttack',           imdStationId: '42972', lgdDistrictId: null, latitude: 20.4625, longitude: 85.8828 },
  { name: 'Raipur',            imdStationId: '42891', lgdDistrictId: null, latitude: 21.2514, longitude: 81.6296 },

  // South rice belt
  { name: 'Hyderabad',         imdStationId: '43128', lgdDistrictId: null, latitude: 17.3850, longitude: 78.4867 },
  { name: 'Guntur',            imdStationId: '43185', lgdDistrictId: null, latitude: 16.3067, longitude: 80.4365 },
  { name: 'Thanjavur',         imdStationId: '43339', lgdDistrictId: null, latitude: 10.7870, longitude: 79.1378 },
  { name: 'Bengaluru (rural)', imdStationId: '43295', lgdDistrictId: null, latitude: 12.9716, longitude: 77.5946 },
];
