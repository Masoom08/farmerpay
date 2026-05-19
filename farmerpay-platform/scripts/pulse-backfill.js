/**
 * PULSE backfill — Phase 3
 *
 * Pull N days of mandi prices for every (commodity × mandi) pair, upsert
 * to pulse_price_records, then regenerate pulse_price_forecasts via
 * SMA-SEASONAL-v1. Idempotent — re-run any time.
 *
 * Usage:
 *   node scripts/pulse-backfill.js                  # default 90 days
 *   node scripts/pulse-backfill.js --days=30        # custom range
 *   PULSE_AGMARKNET_LIVE=true PULSE_AGMARKNET_API_KEY=xxx \
 *     node scripts/pulse-backfill.js --days=7      # real feed
 */

/* eslint-disable no-console */
const path = require('path');
process.chdir(path.join(__dirname, '..'));

const pulseIngestionService = require('../src/modules/pulse/services/pulseIngestionService');
const db = require('../src/shared/models');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const out = { days: 90 };
  for (const a of args) {
    const m = /^--days=(\d+)$/.exec(a);
    if (m) out.days = parseInt(m[1], 10);
  }
  return out;
};

(async () => {
  const { days } = parseArgs();
  console.log(`[pulse-backfill] starting — days=${days}`);
  console.log(`[pulse-backfill] mode=${process.env.PULSE_AGMARKNET_LIVE === 'true' ? 'live' : 'mock'}`);
  try {
    const summary = await pulseIngestionService.runBackfill({ days });
    console.log('[pulse-backfill] done:', JSON.stringify(summary, null, 2));
    await db.sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('[pulse-backfill] FAILED:', err.message);
    console.error(err.stack);
    try { await db.sequelize.close(); } catch (_) { /* noop */ }
    process.exit(1);
  }
})();
