/**
 * Google Crop Identification Fetcher (mock)
 *
 * Phase 2A.1 mock for the Google DeepMind pan-India farm-level in-season
 * crop identification product (paper: arXiv:2507.02972).
 *
 * The real product (Phase 2A.4) returns:
 *   - 1m ALU farm polygon
 *   - one of 12 detected crops with confidence
 *   - sowing date + harvest date (from season detection)
 *   - Sentinel-2 NDVI / NDWI time series for the polygon
 *
 * This mock returns deterministic synthetic data so demos are reproducible:
 *   - polygon = a small square centered on the supplied lat/lng
 *   - crop    = read from the cycle (so the demo "satellite" matches the
 *                farmer's self-declared crop unless `forceCropCode` is set)
 *   - sowing  = read from cycle.cycle_sowing_date but rounded to the nearest
 *                3 days (Sentinel revisit cadence) and offset by deterministic
 *                jitter so it can drift slightly from the self-declared date
 *   - NDVI    = a tillering-stage healthy curve (~0.6–0.75) with light noise
 *
 * The integration contract is small enough that swapping in the real
 * product later is a one-file change — no schema or downstream changes.
 */

const logger = require('../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../shared/models');
  return db;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// 12 crops the Google product supports (paper Tab. 1)
const SUPPORTED_CROPS = ['RICE', 'WHEAT', 'SUGARCANE', 'SOYBEAN', 'COTTON', 'MAIZE', 'MUSTARD', 'CHICKPEA', 'GROUNDNUT', 'SORGHUM', 'CHILLI', 'BAJRA'];

const _hashSeed = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const _seededRandom = (seed) => {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

const _buildSquarePolygon = (lat, lng, halfSideMeters = 60) => {
  // ~1.2-acre square. 1 deg lat ≈ 111000m, 1 deg lng ≈ 111000 * cos(lat).
  const dLat = halfSideMeters / 111000;
  const dLng = halfSideMeters / (111000 * Math.cos(lat * Math.PI / 180));
  return {
    type: 'Polygon',
    coordinates: [[
      [lng - dLng, lat - dLat],
      [lng + dLng, lat - dLat],
      [lng + dLng, lat + dLat],
      [lng - dLng, lat + dLat],
      [lng - dLng, lat - dLat],
    ]],
  };
};

/**
 * Build a synthetic Sentinel-2 NDVI time series for a paddy crop sown
 * `daysSinceSowing` days ago. Returns ~10 weekly observations covering
 * the period from sowing to today, with values that follow the typical
 * tillering → flowering → maturity arc.
 */
const _syntheticNdviTimeSeries = (sowingDate, daysSinceSowing, rng) => {
  const points = [];
  const weeks = Math.max(1, Math.floor(daysSinceSowing / 7));
  for (let w = 0; w <= weeks; w++) {
    const day = w * 7;
    // Healthy paddy NDVI curve: starts low, peaks ~0.78 around flowering,
    // then drops at grain filling. We bias toward tillering for demo.
    let v;
    if (day < 25) v = 0.18 + day * 0.016;        // nursery
    else if (day < 65) v = 0.50 + (day - 25) * 0.006; // tillering → 0.74
    else if (day < 95) v = 0.74 - (day - 65) * 0.002; // PI / flowering
    else if (day < 120) v = 0.68 - (day - 95) * 0.008; // grain fill
    else v = 0.48 - (day - 120) * 0.012;
    v = Math.max(0.1, Math.min(0.92, v + (rng() - 0.5) * 0.04));
    const date = new Date(new Date(sowingDate).getTime() + day * ONE_DAY_MS);
    points.push({ date: date.toISOString().slice(0, 10), value: Math.round(v * 1000) / 1000 });
  }
  return points;
};

const _seasonForDate = (d) => {
  const m = new Date(d).getMonth() + 1; // 1..12
  if (m >= 6 && m <= 10) return 'kharif';
  if (m >= 11 || m <= 3) return 'rabi';
  return 'summer';
};

/**
 * Mock — given a lat/lng and an optional `cycle` for context, returns a
 * synthetic Google ALU observation. Deterministic per (lat, lng, sowing).
 *
 * Real impl (Phase 2A.4) would call Google Earth Engine / a Google API
 * with these args and parse the response.
 */
const fetchForCoordinates = async (lat, lng, opts = {}) => {
  const seedKey = `${lat.toFixed(4)}|${lng.toFixed(4)}|${opts.cycleId || 'x'}`;
  const rng = _seededRandom(_hashSeed(seedKey));

  const cycleSowing = opts.sowingDateHint ? new Date(opts.sowingDateHint) : new Date(Date.now() - 50 * ONE_DAY_MS);
  // Simulate Sentinel-derived sowing date drifting ±2 days from self-report.
  const drift = Math.round((rng() - 0.5) * 4);
  const detectedSowing = new Date(cycleSowing.getTime() + drift * ONE_DAY_MS);

  const cropCode = opts.forceCropCode || opts.cropCodeHint || 'RICE';
  if (!SUPPORTED_CROPS.includes(cropCode)) {
    return null; // outside Google's 12-crop coverage
  }

  const polygon = _buildSquarePolygon(lat, lng);
  const areaHa = Math.round((rng() * 0.6 + 0.9) * 100) / 100; // 0.9–1.5 ha demo

  // Confidence: monsoon (kharif) is 75% per paper; winter (rabi) is 94%.
  const season = _seasonForDate(detectedSowing);
  const baseConf = season === 'kharif' ? 0.75 : 0.94;
  const confidence = Math.round((baseConf + (rng() - 0.5) * 0.06) * 1000) / 1000;

  const daysSinceSowing = Math.max(1, Math.floor((Date.now() - detectedSowing.getTime()) / ONE_DAY_MS));
  const ndviSeries = _syntheticNdviTimeSeries(detectedSowing, daysSinceSowing, rng);
  const latestNdvi = ndviSeries[ndviSeries.length - 1].value;
  const latestNdwi = Math.round((latestNdvi - 0.05 - rng() * 0.05) * 1000) / 1000;

  // Estimated harvest = sowing + crop-typical duration. Hardcoded per crop.
  const durationByCrop = { RICE: 125, WHEAT: 130, SUGARCANE: 330, COTTON: 170, MAIZE: 105, SOYBEAN: 100, MUSTARD: 120, CHICKPEA: 105, GROUNDNUT: 115, SORGHUM: 110, CHILLI: 150, BAJRA: 95 };
  const harvest = new Date(detectedSowing.getTime() + (durationByCrop[cropCode] || 120) * ONE_DAY_MS);

  return {
    latitude: lat,
    longitude: lng,
    polygonGeojson: JSON.stringify(polygon),
    areaHectares: areaHa,
    detectedCropCode: cropCode,
    sowingDate: detectedSowing.toISOString().slice(0, 10),
    harvestDate: harvest.toISOString().slice(0, 10),
    confidence,
    latestNdvi,
    latestNdwi,
    ndviTimeSeries: ndviSeries,
    season,
    seasonYear: detectedSowing.getFullYear(),
    source: 'google_alu_mock',
  };
};

/**
 * Run the mock fetcher for a single CultivationCycle and persist the
 * result in google_field_observations. Resolves the field's lat/lng,
 * looks up the crop_code from crop_masters, calls fetchForCoordinates,
 * and writes the row.
 */
const fetchAndStoreForCycle = async (cycleId) => {
  const { CultivationCycle, Field, FarmRegister, CropMaster, GoogleFieldObservation } = getDb();

  const cycle = await CultivationCycle.findOne({
    where: { id: cycleId, is_active: true },
    include: [{
      model: Field, as: 'field', required: true,
      include: [{ model: FarmRegister, as: 'farmRegister', required: true }],
    }],
  });
  if (!cycle) return { cycleId, status: 'cycle_not_found' };
  const field = cycle.field;
  if (!field || field.latitude == null || field.longitude == null) {
    return { cycleId, status: 'no_field_coordinates' };
  }
  const farmerId = field.farmRegister?.farmer_id;
  if (!farmerId) return { cycleId, status: 'no_farmer' };

  let cropCode = null;
  let cropDbId = null;
  if (cycle.crop_id) {
    const cm = await CropMaster.findOne({ where: { crop_id: cycle.crop_id } });
    if (cm) {
      cropCode = cm.crop_code;
      cropDbId = cm.crop_id;
    }
  }

  const obs = await fetchForCoordinates(
    Number(field.latitude),
    Number(field.longitude),
    {
      cycleId,
      cropCodeHint: cropCode,
      sowingDateHint: cycle.cycle_sowing_date,
    }
  );
  if (!obs) {
    return { cycleId, status: 'crop_not_in_google_coverage' };
  }

  const row = await GoogleFieldObservation.create({
    farmer_id: farmerId,
    cycle_id: cycleId,
    field_id: field.id,
    latitude: obs.latitude,
    longitude: obs.longitude,
    polygon_geojson: obs.polygonGeojson,
    area_hectares: obs.areaHectares,
    detected_crop_code: obs.detectedCropCode,
    detected_crop_id: cropDbId,
    sowing_date: obs.sowingDate,
    harvest_date: obs.harvestDate,
    confidence: obs.confidence,
    latest_ndvi: obs.latestNdvi,
    latest_ndwi: obs.latestNdwi,
    ndvi_time_series: obs.ndviTimeSeries,
    season: obs.season,
    season_year: obs.seasonYear,
    source: 'google_alu_mock',
    last_observed_at: new Date(),
    is_active: true,
  });

  logger.info(`googleCropIdFetcher (mock): stored observation ${row.id} for cycle ${cycleId}`);
  return { cycleId, status: 'ok', observationId: row.id, detectedCropCode: obs.detectedCropCode, sowingDate: obs.sowingDate, confidence: obs.confidence };
};

/**
 * Loop active cycles and fetch for each. Used by future cron once the
 * real Google API is wired (Phase 2A.4).
 */
const fetchAndStoreAll = async () => {
  const { CultivationCycle } = getDb();
  const cycles = await CultivationCycle.findAll({ where: { is_active: true } });
  const reports = [];
  for (const c of cycles) {
    const r = await fetchAndStoreForCycle(c.id);
    reports.push(r);
  }
  return { totalCycles: reports.length, reports };
};

/**
 * Look up the latest active observation for a cycle.
 */
const getLatestForCycle = async (cycleId) => {
  const { GoogleFieldObservation } = getDb();
  return GoogleFieldObservation.findOne({
    where: { cycle_id: cycleId, is_active: true },
    order: [['last_observed_at', 'DESC']],
  });
};

/**
 * Look up the latest active observation across any of a farmer's cycles.
 */
const getLatestForFarmer = async (farmerId) => {
  const { GoogleFieldObservation } = getDb();
  return GoogleFieldObservation.findOne({
    where: { farmer_id: farmerId, is_active: true },
    order: [['last_observed_at', 'DESC']],
  });
};

module.exports = {
  fetchForCoordinates,
  fetchAndStoreForCycle,
  fetchAndStoreAll,
  getLatestForCycle,
  getLatestForFarmer,
  SUPPORTED_CROPS,
};
