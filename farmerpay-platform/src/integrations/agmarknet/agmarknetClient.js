/**
 * Agmarknet Client — PULSE Phase 3
 *
 * Wraps the public data.gov.in Agmarknet daily price API behind a stable
 * `fetchPrices()` interface. Two implementations live in this file:
 *
 *   1. mockFetcher  — deterministic synthetic generator. Default mode.
 *                     Reproducible across runs because the random walk is
 *                     seeded by a hash of (commodity, mandi, date).
 *   2. liveFetcher  — real HTTPS call to data.gov.in's resource endpoint
 *                     with exponential backoff (3 retries: 500ms → 2s → 8s).
 *
 * The exported `fetchPrices` switches between the two based on
 * config.features.pulse.agmarknetLive. The shape returned is identical
 * for both so downstream callers (pulseIngestionService) don't care.
 *
 * Why the mock-first default: demos and integration tests need to be
 * reproducible without hitting an external service. The live mode is for
 * staging / production once a data.gov.in API key is provisioned.
 */

const crypto = require('crypto');
const config = require('../../config');
const logger = require('../../shared/utils/logger');

// data.gov.in resource ID for "Daily Price of Various Commodities from
// Various Markets (Mandi)" — this is a stable, public endpoint.
const AGMARKNET_RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const AGMARKNET_BASE_URL = `https://api.data.gov.in/resource/${AGMARKNET_RESOURCE_ID}`;

// Anchor prices (₹/qtl) the mock generator walks around. Roughly aligned
// with FCI / state-MSP order-of-magnitude as of FY 2025-26.
const COMMODITY_ANCHOR_PRICE = {
  Wheat: 2275,
  Rice: 2300,
  Tomato: 1800,
  Onion: 1500,
  Cotton: 7100,
};

// Month-of-year multipliers per commodity. Crude monthly seasonality
// derived from FAO / DGCIS reports — wheat peaks Mar-Apr (procurement
// season pushes prices up post-harvest), drops Aug-Sep (low demand);
// rice peaks Oct-Nov; cotton peaks Nov-Dec.
const SEASONAL_MULTIPLIER = {
  Wheat:  [0.97, 0.98, 1.04, 1.05, 1.02, 1.00, 0.98, 0.95, 0.96, 0.99, 1.00, 0.98],
  Rice:   [0.99, 0.98, 0.97, 0.97, 0.98, 0.99, 1.00, 1.01, 1.02, 1.04, 1.05, 1.02],
  Tomato: [1.10, 1.05, 0.95, 0.85, 0.80, 0.85, 0.95, 1.05, 1.15, 1.20, 1.15, 1.10],
  Onion:  [0.95, 0.95, 0.90, 0.88, 0.92, 0.98, 1.05, 1.10, 1.15, 1.10, 1.05, 1.00],
  Cotton: [0.98, 0.97, 0.96, 0.97, 0.98, 0.99, 1.00, 1.01, 1.02, 1.04, 1.06, 1.05],
};

// ─── Helpers ────────────────────────────────────────────────────────

const seededRandom = (seedString) => {
  // Hash the seed string into a 32-bit int and use it to drive a tiny
  // mulberry32 PRNG so the same (commodity, mandi, date) tuple always
  // produces the same number.
  const h = crypto.createHash('sha256').update(seedString).digest();
  let a = h.readUInt32BE(0);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const formatDate = (d) => {
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
};

const enumerateDates = (dateFrom, dateTo) => {
  const out = [];
  const start = new Date(`${formatDate(dateFrom)}T00:00:00Z`);
  const end = new Date(`${formatDate(dateTo)}T00:00:00Z`);
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(formatDate(d));
  }
  return out;
};

// ─── Mock fetcher ────────────────────────────────────────────────────

const mockFetcher = ({ commodityName, mandiName, dateFrom, dateTo }) => {
  const anchor = COMMODITY_ANCHOR_PRICE[commodityName] || 2000;
  const seasonal = SEASONAL_MULTIPLIER[commodityName] || Array(12).fill(1);
  const rand = seededRandom(`${commodityName}|${mandiName}|${dateFrom}`);

  const dates = enumerateDates(dateFrom, dateTo);
  let runningPrice = anchor;
  const out = [];

  for (const dateStr of dates) {
    const month = new Date(`${dateStr}T00:00:00Z`).getUTCMonth();
    const seasonalMul = seasonal[month];
    // ±3% daily walk
    const walk = 1 + (rand() - 0.5) * 0.06;
    runningPrice = runningPrice * walk * (0.98 + 0.04 * seasonalMul) / seasonalMul + anchor * seasonalMul * 0.02;
    // Pull back toward the seasonal anchor so the walk doesn't drift
    runningPrice = 0.85 * runningPrice + 0.15 * (anchor * seasonalMul);

    const modal = Math.round(runningPrice);
    const spread = Math.round(modal * 0.04);
    out.push({
      recordDate: dateStr,
      mandiName,
      commodityName,
      modalPrice: modal,
      minPrice: modal - spread,
      maxPrice: modal + spread,
      arrivalsTonnes: Math.round((100 + rand() * 200) * 10) / 10,
    });
  }
  return out;
};

// ─── Live fetcher ────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const liveFetcher = async ({ commodityName, mandiName, dateFrom, dateTo }) => {
  const apiKey = config.features.pulse.agmarknetApiKey;
  if (!apiKey) {
    logger.warn('[agmarknetClient] live mode requested but PULSE_AGMARKNET_API_KEY is empty — returning []');
    return [];
  }

  // data.gov.in supports filters via filters[<field>]=<value>. We pull a
  // big batch and filter client-side rather than fight their query DSL.
  const url = new URL(AGMARKNET_BASE_URL);
  url.searchParams.set('api-key', apiKey);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '500');
  url.searchParams.set('filters[commodity]', commodityName);
  url.searchParams.set('filters[market]', mandiName);

  const backoffs = [500, 2000, 8000];
  let lastErr = null;

  for (let attempt = 0; attempt <= backoffs.length; attempt += 1) {
    try {
      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        lastErr = new Error(`Agmarknet HTTP ${res.status}`);
        if (res.status >= 500 && attempt < backoffs.length) {
          await sleep(backoffs[attempt]);
          continue;
        }
        throw lastErr;
      }
      const body = await res.json();
      const records = Array.isArray(body.records) ? body.records : [];
      return records
        .filter((r) => r.arrival_date && r.modal_price)
        .map((r) => ({
          // Agmarknet ships dd/MM/yyyy strings — normalize to ISO
          recordDate: parseAgmarknetDate(r.arrival_date),
          mandiName,
          commodityName,
          modalPrice: Number(r.modal_price),
          minPrice: Number(r.min_price),
          maxPrice: Number(r.max_price),
          arrivalsTonnes: r.arrivals ? Number(r.arrivals) : null,
        }))
        .filter((r) => r.recordDate >= formatDate(dateFrom) && r.recordDate <= formatDate(dateTo));
    } catch (err) {
      lastErr = err;
      if (attempt < backoffs.length) {
        logger.warn(`[agmarknetClient] attempt ${attempt + 1} failed: ${err.message} — backing off ${backoffs[attempt]}ms`);
        await sleep(backoffs[attempt]);
        continue;
      }
    }
  }

  logger.error(`[agmarknetClient] all retries failed for ${commodityName}/${mandiName}: ${lastErr && lastErr.message}`);
  return [];
};

const parseAgmarknetDate = (s) => {
  // dd/MM/yyyy → yyyy-MM-dd
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) return s;
  return `${m[3]}-${m[2]}-${m[1]}`;
};

// ─── Public interface ───────────────────────────────────────────────

const fetchPrices = async (params) => {
  if (config.features.pulse.agmarknetLive) {
    return liveFetcher(params);
  }
  return mockFetcher(params);
};

module.exports = {
  fetchPrices,
  // Exported for tests so we can pin behaviour without env-flag dance
  mockFetcher,
  liveFetcher,
};
