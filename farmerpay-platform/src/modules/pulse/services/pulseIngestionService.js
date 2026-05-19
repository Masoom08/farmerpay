/**
 * Pulse Ingestion Service — PULSE Phase 3
 *
 * Pulls daily mandi prices from every configured source (Agmarknet today,
 * eNAM stub, more later) and idempotently upserts them into
 * `pulse_price_records`. Then triggers `forecastService.regenerateAll()`
 * so the downstream consumers (sell-or-store wizard, banker distress
 * check, farmer nudge service) see fresh numbers.
 *
 * Two entry points:
 *   - runDailyIngest()           — single-day pull, called by the cron
 *   - runBackfill({ days })      — N-day historical fill, called by the
 *                                  scripts/pulse-backfill.js CLI
 *
 * Idempotency: each price row gets a deterministic record_uuid built
 * from sha1(mandi_id|commodity_id|record_date). Re-running the same
 * day inserts no new rows.
 */

const crypto = require('crypto');
const config = require('../../../config');
const logger = require('../../../shared/utils/logger');

const agmarknetClient = require('../../../integrations/agmarknet/agmarknetClient');
const enamClient = require('../../../integrations/enam/enamClient');

let db = null;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

const SOURCES = [
  { name: 'agmarknet', client: agmarknetClient },
  { name: 'enam', client: enamClient },
];

// Build a deterministic UUID-shaped ID from a stable seed so re-ingesting
// the same day collapses to one row via the unique constraint on
// pulse_price_records.record_uuid.
const recordUuidFor = (mandiId, commodityId, recordDate) => {
  const h = crypto
    .createHash('sha1')
    .update(`pulse|${mandiId}|${commodityId}|${recordDate}`)
    .digest('hex');
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    h.slice(12, 16),
    h.slice(16, 20),
    h.slice(20, 32),
  ].join('-');
};

const trendFor = (modal, prevModal) => {
  if (prevModal == null) return 'stable';
  const delta = (modal - prevModal) / prevModal;
  if (delta > 0.005) return 'rising';
  if (delta < -0.005) return 'falling';
  return 'stable';
};

const formatDate = (d) => {
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
};

const todayIso = () => formatDate(new Date());

const subDays = (dateStr, days) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return formatDate(d);
};

/**
 * Resolve every (commodity × mandi) pair from the seeded reference
 * tables. PULSE only ingests for pairs that already exist — there's no
 * dynamic mandi-discovery in v1.
 */
const resolveMatrix = async () => {
  const { PulseCommodity, PulseMandi } = getDb();
  const [commodities, mandis] = await Promise.all([
    PulseCommodity.findAll({
      where: { is_active: true },
      attributes: ['commodity_id', 'commodity_name', 'commodity_code'],
      raw: true,
    }),
    PulseMandi.findAll({
      where: { is_active: true },
      attributes: ['id', 'mandi_name', 'mandi_code'],
      raw: true,
    }),
  ]);
  const pairs = [];
  for (const c of commodities) {
    for (const m of mandis) {
      pairs.push({
        commodityId: c.commodity_id,
        commodityName: c.commodity_name,
        mandiId: m.id,
        mandiName: m.mandi_name,
      });
    }
  }
  return pairs;
};

/**
 * Fetch from every source for one (commodity × mandi) pair, dedupe by
 * date (Agmarknet wins ties since it's listed first), and return a
 * normalized list of rows ready for upsert.
 */
const fetchAndNormalize = async (pair, dateFrom, dateTo) => {
  const fromAllSources = await Promise.all(
    SOURCES.map((src) =>
      src.client
        .fetchPrices({
          commodityName: pair.commodityName,
          mandiName: pair.mandiName,
          dateFrom,
          dateTo,
        })
        .catch((err) => {
          logger.error(`[pulseIngestionService] ${src.name} fetch failed: ${err.message}`);
          return [];
        }),
    ),
  );
  const seenByDate = new Map();
  for (const rows of fromAllSources) {
    for (const r of rows) {
      if (!seenByDate.has(r.recordDate)) {
        seenByDate.set(r.recordDate, r);
      }
    }
  }
  return Array.from(seenByDate.values()).sort((a, b) => a.recordDate.localeCompare(b.recordDate));
};

/**
 * Upsert a batch of normalized rows into pulse_price_records. Uses the
 * deterministic record_uuid as the dedupe key — re-running is safe.
 * Returns counts so the cron logger can summarize.
 */
const upsertRows = async (pair, rows) => {
  if (rows.length === 0) return { inserted: 0, updated: 0 };
  const { PulsePriceRecord } = getDb();

  // Pre-load any existing record_uuids for this batch so we can split
  // inserts vs updates and compute price_trend off the prior day.
  const uuids = rows.map((r) => recordUuidFor(pair.mandiId, pair.commodityId, r.recordDate));
  const existing = await PulsePriceRecord.findAll({
    where: { record_uuid: uuids },
    attributes: ['id', 'record_uuid', 'modal_price', 'record_date'],
    raw: true,
  });
  const existingByUuid = new Map(existing.map((e) => [e.record_uuid, e]));

  // For trend calc we need the previous day's modal price — fetch it
  // once for the earliest row in the batch.
  const earliestDate = rows[0].recordDate;
  const priorDay = subDays(earliestDate, 1);
  const prior = await PulsePriceRecord.findOne({
    where: {
      mandi_id: pair.mandiId,
      commodity_id: pair.commodityId,
      record_date: priorDay,
    },
    attributes: ['modal_price'],
    raw: true,
  });

  let prevModal = prior ? Number(prior.modal_price) : null;
  let inserted = 0;
  let updated = 0;

  for (const r of rows) {
    const recordUuid = recordUuidFor(pair.mandiId, pair.commodityId, r.recordDate);
    const payload = {
      record_uuid: recordUuid,
      mandi_id: pair.mandiId,
      commodity_id: pair.commodityId,
      record_date: r.recordDate,
      opening_price: r.minPrice,
      closing_price: r.maxPrice,
      highest_price: r.maxPrice,
      lowest_price: r.minPrice,
      modal_price: r.modalPrice,
      quantity_traded_quintals: null,
      arrivals_tonnes: r.arrivalsTonnes ?? null,
      price_trend: trendFor(r.modalPrice, prevModal),
      quality_flag: 'clean',
      policy_regime: 'open_market',
      is_active: true,
    };
    const existingRow = existingByUuid.get(recordUuid);
    if (existingRow) {
      await PulsePriceRecord.update(payload, { where: { id: existingRow.id } });
      updated += 1;
    } else {
      await PulsePriceRecord.create(payload);
      inserted += 1;
    }
    prevModal = r.modalPrice;
  }
  return { inserted, updated };
};

/**
 * Ingest a single day (or any date range). Default range = today only.
 * Returns a summary suitable for the cron logger.
 */
const runDailyIngest = async ({ dateFrom = todayIso(), dateTo = todayIso() } = {}) => {
  const startedAt = Date.now();
  const pairs = await resolveMatrix();
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  const errors = [];

  for (const pair of pairs) {
    try {
      const rows = await fetchAndNormalize(pair, dateFrom, dateTo);
      if (rows.length === 0) {
        totalSkipped += 1;
        continue;
      }
      const { inserted, updated } = await upsertRows(pair, rows);
      totalInserted += inserted;
      totalUpdated += updated;
    } catch (err) {
      errors.push(`${pair.commodityName}/${pair.mandiName}: ${err.message}`);
      logger.error(`[pulseIngestionService] pair failed: ${err.message}`, { stack: err.stack });
    }
  }

  const summary = {
    pairs: pairs.length,
    inserted: totalInserted,
    updated: totalUpdated,
    skipped: totalSkipped,
    errors: errors.length,
    durationMs: Date.now() - startedAt,
    mode: config.features.pulse.agmarknetLive ? 'live' : 'mock',
  };
  logger.info(`[pulseIngestionService] runDailyIngest finished: ${JSON.stringify(summary)}`);

  // Kick the forecast regeneration after every successful ingest. We
  // require it lazily so there's no circular dep at module load.
  if (config.features.pulse.forecastEnabled) {
    try {
      const forecastService = require('./forecastService');
      const forecastSummary = await forecastService.regenerateAll();
      logger.info(`[pulseIngestionService] forecast regen: ${JSON.stringify(forecastSummary)}`);
      summary.forecastsRegenerated = forecastSummary.total;
    } catch (err) {
      logger.error(`[pulseIngestionService] forecast regen failed: ${err.message}`);
      summary.forecastError = err.message;
    }
  }

  return summary;
};

/**
 * Backfill the past N days. Idempotent. Useful for first-time setup and
 * for refreshing demo data after a DB reset.
 */
const runBackfill = async ({ days = 90 } = {}) => {
  const dateTo = todayIso();
  const dateFrom = subDays(dateTo, days - 1);
  logger.info(`[pulseIngestionService] runBackfill ${dateFrom} → ${dateTo} (${days} days)`);
  return runDailyIngest({ dateFrom, dateTo });
};

module.exports = {
  runDailyIngest,
  runBackfill,
  // Exported for tests
  resolveMatrix,
  recordUuidFor,
};
