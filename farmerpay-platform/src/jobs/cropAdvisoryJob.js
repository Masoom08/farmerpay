/**
 * SAGE Crop Advisory cron — Phase 2A
 *
 * Runs the cropAdvisoryEngine across every active CultivationCycle every
 * 6 hours. **Disabled by default** — set
 *   SAGE_CROP_ADVISORY_CRON_ENABLED=true
 * in the env to turn it on. The job is loaded unconditionally so the
 * `start()` call from app.js never crashes; it just no-ops when the flag
 * is missing.
 *
 * The 7-day session lifetime warning does not apply — this is a regular
 * node-cron task.
 */

const cron = require('node-cron');
const logger = require('../shared/utils/logger');

let task = null;

const start = () => {
  if (task) return task;
  if (process.env.SAGE_CROP_ADVISORY_CRON_ENABLED !== 'true') {
    logger.info('[cropAdvisoryJob] disabled (set SAGE_CROP_ADVISORY_CRON_ENABLED=true to enable)');
    return null;
  }

  // Every 6 hours, slightly off the hour to avoid colliding with other jobs.
  task = cron.schedule('17 */6 * * *', async () => {
    try {
      const cropAdvisoryEngine = require('../modules/sage/services/cropAdvisoryEngine');
      const result = await cropAdvisoryEngine.runForAllActiveCycles();
      logger.info(`[cropAdvisoryJob] processed ${result.totalCycles} cycles`);
    } catch (err) {
      logger.error(`[cropAdvisoryJob] failed: ${err.message}`, { stack: err.stack });
    }
  });

  logger.info('[cropAdvisoryJob] scheduled (17 */6 * * *)');
  return task;
};

const stop = () => {
  if (task) {
    task.stop();
    task = null;
  }
};

module.exports = { start, stop };
