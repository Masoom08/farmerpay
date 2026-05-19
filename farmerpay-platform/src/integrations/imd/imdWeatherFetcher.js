/**
 * IMD weather fetcher (Phase 2A)
 *
 * Pulls current observations from IMD's free public city_weather page:
 *   http://city.imd.gov.in/citywx/city_weather.php?id={stationId}
 *
 * The page is HTML and IMD does not expose JSON without IP whitelisting.
 * We do a small regex-based parse — no cheerio dep — pulling temperature,
 * humidity, wind, and rainfall fields. The page layout is stable but
 * occasionally varies; per-station failures are logged and skipped, never
 * blocking the loop.
 *
 * Writes one row per station per fetch into weather_observations.
 */

const logger = require('../../shared/utils/logger');
const stationMap = require('./imdStationMap');

let db;
const getDb = () => {
  if (!db) db = require('../../shared/models');
  return db;
};

const IMD_BASE = 'http://city.imd.gov.in/citywx/city_weather.php?id=';
const FETCH_TIMEOUT_MS = 12000;

/**
 * Pull a number out of a labeled HTML row. Tolerates `&deg;`, `°`, units, etc.
 */
const _extractNumber = (html, labelRegex) => {
  const m = html.match(labelRegex);
  if (!m) return null;
  const numMatch = m[1].match(/-?\d+(?:\.\d+)?/);
  if (!numMatch) return null;
  const n = parseFloat(numMatch[0]);
  return Number.isFinite(n) ? n : null;
};

/**
 * Parse the IMD city weather HTML into a normalized observation.
 * The exact selectors are best-effort — IMD's page has changed shape over
 * the years. Returns null if the page didn't include any temperature.
 */
const _parseImdHtml = (html) => {
  // Common label patterns IMD uses (case-insensitive):
  //   Temperature ( &deg;C) ............ 32.4
  //   Humidity (%) ..................... 68
  //   Wind ............................. 12 km/h
  //   Past 24 hrs Rainfall (mm) ........ 4.2
  //   Weather .......................... Mainly clear sky
  const tempCelsius = _extractNumber(html,
    /temp(?:erature)?[^<]*?(?:°|&deg;)?\s*c[^<]*?[<>:\s]+([^<]{0,40})/i
  );
  const humidityPercent = _extractNumber(html,
    /humidity[^<]*?\(%\)?[^<]*?[<>:\s]+([^<]{0,40})/i
  ) ?? _extractNumber(html, /humidity[^<]*?[<>:\s]+([^<]{0,40})/i);
  const rainfallMm = _extractNumber(html,
    /rain(?:fall)?[^<]*?mm[^<]*?[<>:\s]+([^<]{0,40})/i
  );
  const windKmh = _extractNumber(html,
    /wind[^<]*?(?:km\s*\/?\s*h|kmph)?[^<]*?[<>:\s]+([^<]{0,40})/i
  );
  const condMatch = html.match(/weather[^<]*?[<>:\s]+([^<]{2,80})/i);
  const conditionText = condMatch ? condMatch[1].trim().slice(0, 120) : null;

  if (tempCelsius == null && humidityPercent == null) return null;

  return {
    tempCelsius,
    humidityPercent,
    rainfallMm,
    windKmh,
    conditionText,
  };
};

/**
 * Fetch and parse a single IMD station. Returns the parsed observation
 * (without persistence) or null on failure.
 */
const fetchStation = async (stationId) => {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is not available — Node 18+ required.');
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${IMD_BASE}${encodeURIComponent(stationId)}`, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'FarmerPay-SAGE/2.0 (+contact: ops@farmerpay.in)',
      },
    });
    clearTimeout(timer);
    if (!res.ok) {
      logger.warn(`IMD station ${stationId} returned ${res.status}`);
      return null;
    }
    const html = await res.text();
    const parsed = _parseImdHtml(html);
    if (!parsed) {
      logger.warn(`IMD station ${stationId} HTML did not parse`);
      return null;
    }
    return parsed;
  } catch (err) {
    clearTimeout(timer);
    logger.warn(`IMD station ${stationId} fetch failed: ${err.message}`);
    return null;
  }
};

/**
 * Loop the station map, fetch each, and persist results into
 * weather_observations. Returns a per-station status report.
 */
const fetchAndStoreAll = async () => {
  const { WeatherObservation } = getDb();
  const report = [];
  for (const station of stationMap) {
    const parsed = await fetchStation(station.imdStationId);
    if (!parsed) {
      report.push({ name: station.name, stationId: station.imdStationId, status: 'failed' });
      continue;
    }
    try {
      const row = await WeatherObservation.create({
        lgd_district_id: station.lgdDistrictId || null,
        latitude: station.latitude,
        longitude: station.longitude,
        observed_at: new Date(),
        temp_celsius: parsed.tempCelsius,
        humidity_percent: parsed.humidityPercent,
        rainfall_mm_24h: parsed.rainfallMm,
        wind_speed_kmh: parsed.windKmh,
        condition_text: parsed.conditionText,
        source: 'imd_scrape',
        source_station_id: station.imdStationId,
        is_active: true,
      });
      report.push({
        name: station.name,
        stationId: station.imdStationId,
        status: 'ok',
        observationId: row.id,
        tempCelsius: parsed.tempCelsius,
        humidityPercent: parsed.humidityPercent,
      });
    } catch (e) {
      logger.warn(`IMD store failed for ${station.name}: ${e.message}`);
      report.push({ name: station.name, stationId: station.imdStationId, status: 'store_failed', error: e.message });
    }
  }
  return report;
};

module.exports = {
  fetchStation,
  fetchAndStoreAll,
  _parseImdHtml, // exposed for unit testing
};
