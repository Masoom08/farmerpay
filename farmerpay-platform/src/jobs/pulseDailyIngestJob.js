/**
 * PULSE Daily Ingest Cron — Phase 3
 *
 * Runs every day at 08:30 server-local time. Pulls one day of mandi
 * prices from every configured source (Agmarknet today, eNAM stub),
 * upserts into pulse_price_records, then regenerates pulse_price_forecasts
 * via the SMA-SEASONAL-v1 model.
 *
 * Defaults to mock mode (deterministic synthetic prices) so demos are
 * reproducible. Set PULSE_AGMARKNET_LIVE=true + PULSE_AGMARKNET_API_KEY
 * to flip to the real data.gov.in feed.
 */

const cron = require('node-cron');
const logger = require('../shared/utils/logger');
const pulseIngestionService = require('../modules/pulse/services/pulseIngestionService');

let task = null;

const start = () => {
  if (task) return task;

  // 08:30 every day (server local time, ~IST since prod is in ap-south-1)
  task = cron.schedule('30 8 * * *', async () => {
    try {
      const summary = await pulseIngestionService.runDailyIngest();
      logger.info(`[pulseDailyIngestJob] complete: ${JSON.stringify(summary)}`);
    } catch (err) {
      logger.error(`[pulseDailyIngestJob] failed: ${err.message}`, { stack: err.stack });
    }
  });

  logger.info('[pulseDailyIngestJob] scheduled (30 8 * * *)');
  return task;
};

const stop = () => {
  if (task) {
    task.stop();
    task = null;
  }
};

const runNow = () => pulseIngestionService.runDailyIngest();

module.exports = { start, stop, runNow };
