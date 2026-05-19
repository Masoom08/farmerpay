/**
 * AA Data Purge Job
 * Deletes aa_transactions records older than 24 months.
 * Runs daily at 2:00 AM (server local time).
 */

const cron = require('node-cron');
const logger = require('../shared/utils/logger');

let task = null;

const RETENTION_MONTHS = 24;

const start = () => {
  if (task) return task;

  // Daily at 02:07 — offset from minute 0 to avoid collision with bankNpaRecalcJob (02:13)
  task = cron.schedule('7 2 * * *', async () => {
    try {
      const result = await purgeOldTransactions();
      logger.info(`[aaDataPurgeJob] purged ${result.deleted} transactions older than ${RETENTION_MONTHS} months`);
    } catch (err) {
      logger.error(`[aaDataPurgeJob] failed: ${err.message}`, { stack: err.stack });
    }
  });

  logger.info('[aaDataPurgeJob] scheduled (7 2 * * *)');
  return task;
};

const stop = () => {
  if (task) {
    task.stop();
    task = null;
  }
};

const purgeOldTransactions = async () => {
  const db = require('../shared/models');
  const { Op } = require('sequelize');

  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - RETENTION_MONTHS);

  const deleted = await db.AaTransaction.destroy({
    where: {
      created_at: { [Op.lt]: cutoffDate },
    },
  });

  return { deleted, cutoffDate };
};

const runNow = () => purgeOldTransactions();

module.exports = { start, stop, runNow };
