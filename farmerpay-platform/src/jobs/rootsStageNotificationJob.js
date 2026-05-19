/**
 * ROOTS Smart Stage Notification Job
 *
 * Daily cron (8:00 AM IST = 02:30 UTC) that sends contextual, stage-aware
 * push notifications to farmers based on their crop lifecycle + livestock data.
 *
 * Notification types:
 *   1. Stage upcoming (3 days before window opens)
 *   2. Stage due (window open, no execution)
 *   3. Stage overdue (window closed 3 days ago, no execution)
 *   4. Stage completed (execution created today)
 *   5. Dairy milk log reminder (no log for yesterday)
 *   6. Poultry daily log reminder (no log for yesterday)
 *
 * Disabled by default — set ROOTS_STAGE_NOTIFICATION_ENABLED=true to enable.
 */

const cron = require('node-cron');
const { Op } = require('sequelize');
const logger = require('../shared/utils/logger');

let task = null;

const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 100;
const MS_PER_DAY = 86400000;
const ACTIVE_STATUSES = ['sowing', 'growing', 'monitoring', 'harvesting'];

let db;
const getDb = () => { if (!db) db = require('../shared/models'); return db; };

/* ── RabbitMQ helper ── */

const sendPush = async (farmerId, type, title, body, data) => {
  try {
    const { getChannel } = require('../config/rabbitmq');
    const config = require('../config');
    const channel = await getChannel();
    if (channel) {
      channel.publish(
        config.rabbitmq.exchange,
        'notification.push.farmer',
        Buffer.from(JSON.stringify({
          farmerId, type, title, body, data,
          priority: 'normal',
          deliveredAt: new Date(),
        })),
        { persistent: true }
      );
      return true;
    }
  } catch (err) {
    logger.warn('Push notification failed', { farmerId, error: err.message });
  }
  return false;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── Crop stage notifications ── */

const processCropCycle = async (cycle, metrics) => {
  const { PopWorkband, WorkbandExecution, RootsComplianceSnapshot } = getDb();

  if (!cycle.cycle_sowing_date || !cycle.pop_id) return;

  const sowingDate = new Date(cycle.cycle_sowing_date);
  const currentDay = Math.round((Date.now() - sowingDate.getTime()) / MS_PER_DAY);
  const todayStr = new Date().toISOString().slice(0, 10);
  const cropName = cycle.self_declared_crop || cycle.crop_id || 'crop';

  const popWbs = await PopWorkband.findAll({
    where: { pop_id: cycle.pop_id, is_active: true },
    order: [['workband_order', 'ASC']],
  });

  const execs = await WorkbandExecution.findAll({
    where: { cycle_id: cycle.cycle_uuid, is_active: true },
    attributes: ['pop_workband_id', 'workband_status', 'created_at'],
  });
  const execByPwId = {};
  execs.forEach((e) => { if (e.pop_workband_id) execByPwId[e.pop_workband_id] = e; });

  let notified = false; // max 1 notification per cycle per run

  for (const pw of popWbs) {
    if (notified) break;

    const exec = execByPwId[pw.id];
    const windowStart = pw.days_from_sowing_start || 0;
    const windowEnd = pw.days_from_sowing_end || windowStart;
    const wbName = pw.workband_name;

    // d. Completed today
    if (exec && exec.created_at) {
      const createdDate = new Date(exec.created_at).toISOString().slice(0, 10);
      if (createdDate === todayStr && (exec.workband_status === 'completed' || exec.workband_status === 'in_progress')) {
        // Fetch compliance score
        let scoreText = '';
        try {
          const snap = await RootsComplianceSnapshot.findOne({
            where: { farmer_id: cycle.farmer_id, activity_reference_id: cycle.id, is_active: true },
            order: [['snapshot_date', 'DESC']],
            attributes: ['overall_compliance_score'],
          });
          if (snap?.overall_compliance_score) {
            scoreText = ` Your compliance score: ${Math.round(snap.overall_compliance_score)}/100`;
          }
        } catch {}

        const sent = await sendPush(
          cycle.farmer_id,
          'roots_stage_completed',
          `✅ ${wbName} logged!`,
          `Great! ${wbName} logged for your ${cropName}.${scoreText}`,
          { screen: 'cycle-detail', cycleId: cycle.id }
        );
        if (sent) { metrics.notificationsSent++; notified = true; }
        continue;
      }
    }

    // Skip stages that already have executions (not planned)
    if (exec && exec.workband_status !== 'planned') continue;

    // a. Upcoming: window starts within next 3 days
    if (currentDay >= windowStart - 3 && currentDay < windowStart) {
      const daysUntil = windowStart - currentDay;
      const sent = await sendPush(
        cycle.farmer_id,
        'roots_stage_upcoming',
        `🌾 ${wbName} coming up`,
        `Your ${cropName} is approaching ${wbName} stage in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}. Tap to prepare.`,
        { screen: 'cycle-detail', cycleId: cycle.id, workbandId: pw.id }
      );
      if (sent) { metrics.notificationsSent++; notified = true; }
      continue;
    }

    // b. Due now: window is open, no execution
    if (currentDay >= windowStart && currentDay <= windowEnd) {
      const sent = await sendPush(
        cycle.farmer_id,
        'roots_stage_due',
        `🌾 ${wbName} is due now`,
        `${wbName} is due for your ${cropName}. Quick tap to confirm you've done it.`,
        { screen: 'cycle-detail', cycleId: cycle.id, workbandId: pw.id }
      );
      if (sent) { metrics.notificationsSent++; notified = true; }
      continue;
    }

    // c. Overdue: window closed 3 days ago, no execution
    if (currentDay >= windowEnd + 1 && currentDay <= windowEnd + 5) {
      const daysOverdue = currentDay - windowEnd;
      if (daysOverdue === 3) { // only on the 3rd day after window close
        const sent = await sendPush(
          cycle.farmer_id,
          'roots_stage_overdue',
          `⚠️ Did you complete ${wbName}?`,
          `${wbName} window has passed for your ${cropName}. It's not too late to log it.`,
          { screen: 'cycle-detail', cycleId: cycle.id, workbandId: pw.id }
        );
        if (sent) { metrics.notificationsSent++; notified = true; }
      }
      continue;
    }
  }
};

/* ── Dairy milk log reminder ── */

const processDairyReminders = async (metrics) => {
  const { FarmerActivitySubscription, DairyMilkProductionLog } = getDb();

  const dairySubs = await FarmerActivitySubscription.findAll({
    where: { activity_code: 'DAIRY', status: 'ACTIVE', is_active: true },
    attributes: ['farmer_id'],
  });

  const yesterday = new Date(Date.now() - MS_PER_DAY).toISOString().slice(0, 10);

  for (let i = 0; i < dairySubs.length; i += BATCH_SIZE) {
    const batch = dairySubs.slice(i, i + BATCH_SIZE);

    for (const sub of batch) {
      try {
        const hasLog = await DairyMilkProductionLog.findOne({
          where: {
            farmer_id: sub.farmer_id,
            is_active: true,
            log_date: yesterday,
          },
          attributes: ['id'],
        });

        if (!hasLog) {
          const sent = await sendPush(
            sub.farmer_id,
            'dairy_milk_reminder',
            "🐄 Log yesterday's milk yield",
            "Quick tap to log milk production — takes 30 seconds",
            { screen: 'dairy-logbook' }
          );
          if (sent) metrics.dairyReminders++;
        }
      } catch (err) {
        logger.warn('Dairy reminder failed', { farmerId: sub.farmer_id, error: err.message });
      }
    }

    if (i + BATCH_SIZE < dairySubs.length) await sleep(BATCH_DELAY_MS);
  }
};

/* ── Poultry daily log reminder ── */

const processPoultryReminders = async (metrics) => {
  const { FarmerActivitySubscription } = getDb();

  // Poultry uses generic PoP — check if any touchpoint was completed yesterday
  const poultrySubs = await FarmerActivitySubscription.findAll({
    where: { activity_code: 'POULTRY', status: 'ACTIVE', is_active: true },
    attributes: ['farmer_id'],
  });

  const yesterday = new Date(Date.now() - MS_PER_DAY);

  for (let i = 0; i < poultrySubs.length; i += BATCH_SIZE) {
    const batch = poultrySubs.slice(i, i + BATCH_SIZE);

    for (const sub of batch) {
      try {
        // Simple heuristic: send daily reminder to all active poultry farmers
        // (no dedicated daily-log model for poultry; generic PoP touchpoints)
        const sent = await sendPush(
          sub.farmer_id,
          'poultry_daily_reminder',
          "🐔 Quick daily check",
          "Log mortality, feed, and egg count — takes 1 minute",
          { screen: 'activity-poultry' }
        );
        if (sent) metrics.poultryReminders++;
      } catch (err) {
        logger.warn('Poultry reminder failed', { farmerId: sub.farmer_id, error: err.message });
      }
    }

    if (i + BATCH_SIZE < poultrySubs.length) await sleep(BATCH_DELAY_MS);
  }
};

/* ── Batch runner ── */

const runNotifications = async () => {
  const { CultivationCycle } = getDb();

  const metrics = {
    cyclesChecked: 0,
    notificationsSent: 0,
    dairyReminders: 0,
    poultryReminders: 0,
    errors: 0,
  };

  // ── Crop stage notifications ──
  let offset = 0;
  let batch;

  do {
    batch = await CultivationCycle.findAll({
      where: {
        is_active: true,
        cycle_status: { [Op.in]: ACTIVE_STATUSES },
        cycle_sowing_date: { [Op.not]: null },
        pop_id: { [Op.not]: null },
      },
      order: [['id', 'ASC']],
      limit: BATCH_SIZE,
      offset,
    });

    for (const cycle of batch) {
      try {
        await processCropCycle(cycle, metrics);
        metrics.cyclesChecked++;
      } catch (err) {
        metrics.errors++;
        logger.error(`[rootsStageNotification] Cycle ${cycle.cycle_uuid} failed`, { error: err.message });
      }
    }

    offset += BATCH_SIZE;
    if (batch.length === BATCH_SIZE) await sleep(BATCH_DELAY_MS);
  } while (batch.length === BATCH_SIZE);

  // ── Livestock reminders ──
  try {
    await processDairyReminders(metrics);
  } catch (err) {
    logger.error('[rootsStageNotification] Dairy reminders failed', { error: err.message });
  }

  try {
    await processPoultryReminders(metrics);
  } catch (err) {
    logger.error('[rootsStageNotification] Poultry reminders failed', { error: err.message });
  }

  logger.info('[rootsStageNotification] Complete', metrics);
  return metrics;
};

/* ── Cron lifecycle ── */

const start = () => {
  if (task) return task;
  if (process.env.ROOTS_STAGE_NOTIFICATION_ENABLED !== 'true') {
    logger.info('[rootsStageNotification] disabled (set ROOTS_STAGE_NOTIFICATION_ENABLED=true to enable)');
    return null;
  }

  // 8:00 AM IST = 02:30 UTC
  task = cron.schedule('30 2 * * *', async () => {
    try {
      await runNotifications();
    } catch (err) {
      logger.error(`[rootsStageNotification] failed: ${err.message}`, { stack: err.stack });
    }
  });

  logger.info('[rootsStageNotification] scheduled (30 2 * * * — 8:00 AM IST)');
  return task;
};

const stop = () => {
  if (task) { task.stop(); task = null; }
};

module.exports = { start, stop, runNotifications };
