/**
 * ROOTS Missed Step Detector — Daily cron job
 *
 * Runs at 6:00 AM IST (00:30 UTC) daily. Scans all active cultivation
 * cycles for missed workband stages, triggers red flags, updates compliance
 * scores, generates SAGE advisories, and notifies farmers + assigned Sathis.
 *
 * Disabled by default — set ROOTS_MISSED_STEP_CRON_ENABLED=true to enable.
 */

const cron = require('node-cron');
const logger = require('../shared/utils/logger');
const { generateUUID } = require('../shared/utils/uuidHelper');
const { Op } = require('sequelize');

let task = null;

const BATCH_SIZE = 100;
const MS_PER_DAY = 86400000;
const ACTIVE_STATUSES = ['sowing', 'growing', 'monitoring', 'harvesting'];
const GRACE_DAYS = 7;

/* ── Lazy-load dependencies ── */

let db;
const getDb = () => { if (!db) db = require('../shared/models'); return db; };

const getRedFlagService = () => require('../modules/roots/crop/services/redFlagService');
const getVarianceService = () => require('../modules/roots/crop/services/varianceService');

/* ── RabbitMQ push notification helper ── */

const sendPushNotification = async (farmerId, title, body, data) => {
  try {
    const { getChannel } = require('../config/rabbitmq');
    const config = require('../config');
    const channel = await getChannel();
    if (channel) {
      channel.publish(
        config.rabbitmq.exchange,
        'notification.push.farmer',
        Buffer.from(JSON.stringify({ farmerId, title, body, data, priority: 'high', deliveredAt: new Date() })),
        { persistent: true }
      );
      return true;
    }
  } catch (err) {
    logger.warn('Push notification failed', { farmerId, error: err.message });
  }
  return false;
};

/* ── Core processing logic ── */

const processCycle = async (cycle, metrics) => {
  const {
    PopWorkband, WorkbandExecution, SageAdvisory,
    SathiTask, ChoiceAssignment,
  } = getDb();

  if (!cycle.cycle_sowing_date || !cycle.pop_id) return;

  const sowingDate = new Date(cycle.cycle_sowing_date);
  const currentDay = Math.round((new Date() - sowingDate) / MS_PER_DAY);

  // Fetch PoP workbands for this cycle's package of practice
  const popWorkbands = await PopWorkband.findAll({
    where: { pop_id: cycle.pop_id, is_active: true },
    order: [['workband_order', 'ASC']],
  });

  // Fetch existing executions
  const executions = await WorkbandExecution.findAll({
    where: { cycle_id: cycle.cycle_uuid, is_active: true },
    attributes: ['pop_workband_id', 'workband_status'],
  });
  const execByPwId = {};
  executions.forEach((e) => { if (e.pop_workband_id) execByPwId[e.pop_workband_id] = e; });

  for (const pw of popWorkbands) {
    const windowEnd = pw.days_from_sowing_end || pw.days_from_sowing_start || 0;
    if (currentDay <= windowEnd + GRACE_DAYS) continue;

    const exec = execByPwId[pw.id];
    if (exec && exec.workband_status !== 'planned') continue;

    // ─── Missed step found ───
    metrics.missedStepsFound++;

    // a0. Emit stage.missed event
    try {
      const { emitStageMissed } = require('../modules/roots/crop/services/complianceEventEmitter');
      await emitStageMissed(cycle.farmer_id, cycle.cycle_uuid, pw.workband_name, windowEnd);
    } catch (err) {
      logger.warn(`Stage missed event failed for cycle ${cycle.cycle_uuid}`, { error: err.message });
    }

    // a. Red flag for critical stages
    try {
      await getRedFlagService().detectCriticalStageMissed(cycle.id);
    } catch (err) {
      logger.warn(`Red flag detection failed for cycle ${cycle.cycle_uuid}`, { error: err.message });
    }

    // b. Update compliance score
    try {
      await getVarianceService().computeCycleComplianceScore(cycle.id);
    } catch (err) {
      logger.warn(`Compliance update failed for cycle ${cycle.cycle_uuid}`, { error: err.message });
    }

    // c. Generate SAGE advisory
    try {
      await SageAdvisory.create({
        advisory_uuid: generateUUID(),
        farmer_id: cycle.farmer_id,
        advisory_content: `You may have missed "${pw.workband_name}" stage in your crop cycle. ` +
          `This was expected around day ${pw.days_from_sowing_start}-${windowEnd} after sowing. ` +
          `Please update your records or consult your Sathi for guidance.`,
        advisory_urgency: 'high',
        delivery_channel: 'in_app',
        source: 'roots_missed_step_detector',
        advisory_metadata: {
          cycle_uuid: cycle.cycle_uuid,
          workband_name: pw.workband_name,
          workband_order: pw.workband_order,
          days_overdue: currentDay - windowEnd,
        },
        delivered_at: new Date(),
      });
      metrics.advisoriesGenerated++;
    } catch (err) {
      logger.warn(`Advisory creation failed for cycle ${cycle.cycle_uuid}`, { error: err.message });
    }

    // d. Push notification
    const sent = await sendPushNotification(
      cycle.farmer_id,
      'Missed Farming Step',
      `You may have missed "${pw.workband_name}". Tap to update your crop records.`,
      { screen: 'cycle-detail', cycleId: cycle.cycle_uuid }
    );
    if (sent) metrics.notificationsSent++;

    // e. Create Sathi task if agent assigned
    try {
      const assignment = await ChoiceAssignment.findOne({
        where: { farmer_id: cycle.farmer_id, is_active: true },
        attributes: ['intermediary_id'],
      });

      if (assignment) {
        await SathiTask.create({
          task_uuid: generateUUID(),
          assigned_to_agent_id: assignment.intermediary_id,
          farmer_id: cycle.farmer_id,
          task_type: 'field_visit',
          task_title: `Follow up: missed "${pw.workband_name}" stage`,
          task_description: `Farmer may have missed the "${pw.workband_name}" stage (${currentDay - windowEnd} days overdue). Verify field status and assist.`,
          task_priority: 'high',
          task_status: 'assigned',
          assigned_at: new Date(),
          due_date: new Date(Date.now() + 3 * MS_PER_DAY).toISOString().slice(0, 10),
          task_entity_type: 'cultivation_cycle',
          task_entity_id: cycle.id,
          is_active: true,
        });
      }
    } catch (err) {
      logger.warn(`Sathi task creation failed for cycle ${cycle.cycle_uuid}`, { error: err.message });
    }

    // Only process one missed step per cycle per run to avoid notification fatigue
    break;
  }
};

/* ── Batch runner ── */

const runDetection = async () => {
  const { CultivationCycle } = getDb();

  const metrics = {
    cyclesChecked: 0,
    missedStepsFound: 0,
    advisoriesGenerated: 0,
    notificationsSent: 0,
    errors: 0,
  };

  let offset = 0;
  let batch = [];
  let batchNum = 0;

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

    batchNum++;
    const totalEstimate = offset + batch.length + (batch.length === BATCH_SIZE ? '+' : '');
    logger.info(`[rootsMissedStepDetector] Processing batch ${batchNum} (${batch.length} cycles, offset ${offset})`);

    for (const cycle of batch) {
      try {
        await processCycle(cycle, metrics);
        metrics.cyclesChecked++;
      } catch (err) {
        metrics.errors++;
        logger.error(`[rootsMissedStepDetector] Cycle ${cycle.cycle_uuid} failed`, { error: err.message });
      }
    }

    offset += BATCH_SIZE;
  } while (batch.length === BATCH_SIZE);

  logger.info('[rootsMissedStepDetector] Complete', metrics);
  return metrics;
};

/* ── Cron lifecycle ── */

const start = () => {
  if (task) return task;
  if (process.env.ROOTS_MISSED_STEP_CRON_ENABLED !== 'true') {
    logger.info('[rootsMissedStepDetector] disabled (set ROOTS_MISSED_STEP_CRON_ENABLED=true to enable)');
    return null;
  }

  // 6:00 AM IST = 00:30 UTC
  task = cron.schedule('30 0 * * *', async () => {
    try {
      await runDetection();
    } catch (err) {
      logger.error(`[rootsMissedStepDetector] failed: ${err.message}`, { stack: err.stack });
    }
  });

  logger.info('[rootsMissedStepDetector] scheduled (30 0 * * * — 6:00 AM IST)');
  return task;
};

const stop = () => {
  if (task) {
    task.stop();
    task = null;
  }
};

module.exports = { start, stop, runDetection };
