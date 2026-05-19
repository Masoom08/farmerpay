/**
 * PULSE Sentinel Scan Cron — Phase 3
 *
 * Runs every day at 09:00 server-local time, ~30 minutes after the daily
 * ingest. Walks every active loan with a harvestable cycle, compares the
 * latest mandi modal price to the cost-per-quintal, and emits or clears
 * a SENTINEL EwsSignal of type 'market_risk' so the recovery workflow
 * has a persistent record.
 *
 * Idempotent — uses a deterministic signal_uuid per (application_id, day).
 *
 * Off when PULSE_SENTINEL_SCAN_ENABLED=false.
 */

const cron = require('node-cron');
const logger = require('../shared/utils/logger');
const marketRiskScanService = require('../modules/sentinel/services/marketRiskScanService');

let task = null;

const start = () => {
  if (task) return task;

  // 09:00 every day (server local time)
  task = cron.schedule('0 9 * * *', async () => {
    try {
      const summary = await marketRiskScanService.scanAllActive();
      logger.info(`[pulseSentinelScanJob] complete: ${JSON.stringify(summary)}`);
    } catch (err) {
      logger.error(`[pulseSentinelScanJob] failed: ${err.message}`, { stack: err.stack });
    }
  });

  logger.info('[pulseSentinelScanJob] scheduled (0 9 * * *)');
  return task;
};

const stop = () => {
  if (task) {
    task.stop();
    task = null;
  }
};

const runNow = () => marketRiskScanService.scanAllActive();

module.exports = { start, stop, runNow };
