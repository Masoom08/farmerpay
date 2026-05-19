/**
 * Fishery Recurring Cost Cron Job
 * Runs once per day at 05:05 IST (staggered after dairy). For every active
 * fishery recurring template whose next_due_date is <= today, creates a
 * pending FisheryCostEvent and advances the template's next_due_date.
 *
 * Farmer confirms pending events on the home screen — primary fatigue-
 * reduction path for inland daily feed, weekly aeration electricity,
 * monthly crew retainers.
 */

const cron = require('node-cron');
const logger = require('../shared/utils/logger');
const recurringService = require('../modules/roots/fishery/services/fisheryRecurringService');

let task = null;

const start = () => {
  if (task) return task;

  // 05:05 every day — 5 min after dairy job to avoid DB contention
  task = cron.schedule('5 5 * * *', async () => {
    try {
      const { created } = await recurringService.generatePendingEventsForDueTemplates();
      logger.info(`[fisheryRecurringJob] generated ${created} pending cost events`);
    } catch (err) {
      logger.error(`[fisheryRecurringJob] failed: ${err.message}`, { stack: err.stack });
    }
  });

  logger.info('[fisheryRecurringJob] scheduled (5 5 * * *)');
  return task;
};

const stop = () => {
  if (task) {
    task.stop();
    task = null;
  }
};

const runNow = () => recurringService.generatePendingEventsForDueTemplates();

module.exports = { start, stop, runNow };
