/**
 * IMD weather fetch cron — Phase 2A
 *
 * Polls the curated list of IMD city stations once per hour and writes the
 * normalized observations into weather_observations. **Disabled by default** —
 * set IMD_WEATHER_CRON_ENABLED=true to turn it on.
 *
 * IMD's free city_weather page is HTML and can occasionally throttle.
 * The fetcher is best-effort: per-station failures are logged and skipped.
 */

const cron = require('node-cron');
const logger = require('../shared/utils/logger');

let task = null;

const start = () => {
  if (task) return task;
  if (process.env.IMD_WEATHER_CRON_ENABLED !== 'true') {
    logger.info('[imdWeatherFetchJob] disabled (set IMD_WEATHER_CRON_ENABLED=true to enable)');
    return null;
  }

  // Top of every hour, +3 minutes jitter so we don't collide with anything.
  task = cron.schedule('3 * * * *', async () => {
    try {
      const fetcher = require('../integrations/imd/imdWeatherFetcher');
      const report = await fetcher.fetchAndStoreAll();
      const ok = report.filter((r) => r.status === 'ok').length;
      logger.info(`[imdWeatherFetchJob] ${ok}/${report.length} stations stored`);
    } catch (err) {
      logger.error(`[imdWeatherFetchJob] failed: ${err.message}`, { stack: err.stack });
    }
  });

  logger.info('[imdWeatherFetchJob] scheduled (3 * * * *)');
  return task;
};

const stop = () => {
  if (task) {
    task.stop();
    task = null;
  }
};

module.exports = { start, stop };
