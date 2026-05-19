/**
 * Bank NPA Recalculation cron — May 2026 pilot
 *
 * Runs `npaCalculationService.recalcForAllActiveAccounts()` daily at
 * 02:00 local time. For every active bank_loan_accounts row it:
 *   1. Recomputes DPD from the earliest unpaid LoanRepaymentSchedule
 *   2. Re-classifies SMA per RBI thresholds
 *   3. Writes the result back to the live row
 *   4. Appends a time-series snapshot to bank_loan_account_histories
 *      (the table the cohort report endpoints read from)
 *
 * **Disabled by default** — set `BANK_NPA_RECALC_CRON_ENABLED=true`
 * in the env to turn it on. The job is loaded unconditionally so the
 * `start()` call from app.js never crashes; it just logs "disabled"
 * and no-ops when the flag is missing.
 *
 * Minute 13 is chosen (instead of 00) so this job doesn't collide with
 * other 02:00 jobs on the same server.
 */

const cron = require('node-cron');
const logger = require('../shared/utils/logger');

let task = null;

const start = () => {
  if (task) return task;
  if (process.env.BANK_NPA_RECALC_CRON_ENABLED !== 'true') {
    logger.info('[bankNpaRecalcJob] disabled (set BANK_NPA_RECALC_CRON_ENABLED=true to enable)');
    return null;
  }

  // Daily at 02:13 local. Minute 13 avoids collision with minute-0 jobs.
  task = cron.schedule('13 2 * * *', async () => {
    try {
      const npaCalculationService = require('../modules/bank/services/npaCalculationService');
      const result = await npaCalculationService.recalcForAllActiveAccounts();
      logger.info(
        `[bankNpaRecalcJob] processed=${result.processed} updated=${result.updated} errors=${result.errors} snapshotDate=${result.snapshotDate}`
      );
    } catch (err) {
      logger.error(`[bankNpaRecalcJob] failed: ${err.message}`, { stack: err.stack });
    }
  });

  logger.info('[bankNpaRecalcJob] scheduled (13 2 * * *)');
  return task;
};

const stop = () => {
  if (task) {
    task.stop();
    task = null;
  }
};

module.exports = { start, stop };
