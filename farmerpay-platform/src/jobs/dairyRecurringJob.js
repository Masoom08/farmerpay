/**
 * Dairy Recurring Cost Cron Job
 * Runs once per day at 05:00 IST. For every active recurring template whose
 * next_due_date is <= today, creates a pending DairyCostEvent and advances
 * the template's next_due_date based on frequency.
 *
 * Farmer confirms pending events on the home screen (one tap) — this is the
 * primary fatigue-reduction mechanism for recurring costs (labor, utilities,
 * vet retainers, monthly feed bags).
 */

const cron = require('node-cron');
const logger = require('../shared/utils/logger');
const recurringService = require('../modules/roots/dairy/services/dairyRecurringService');

let task = null;

const start = () => {
  if (task) return task;

  // 05:00 every day (server local time)
  task = cron.schedule('0 5 * * *', async () => {
    try {
      const { created } = await recurringService.generatePendingEventsForDueTemplates();
      logger.info(`[dairyRecurringJob] generated ${created} pending cost events`);
    } catch (err) {
      logger.error(`[dairyRecurringJob] failed: ${err.message}`, { stack: err.stack });
    }
  });

  logger.info('[dairyRecurringJob] scheduled (0 5 * * *)');
  return task;
};

const stop = () => {
  if (task) {
    task.stop();
    task = null;
  }
};

// Expose runner for manual trigger / tests
const runNow = () => recurringService.generatePendingEventsForDueTemplates();

module.exports = { start, stop, runNow };
