/**
 * ROOTS Compliance Event Emitter
 *
 * Centralized RabbitMQ event producer for the ROOTS variance engine.
 * Publishes to 'roots_events' topic exchange so that TRUST, SENTINEL,
 * and BANKER modules can bind queues to the routing keys they care about.
 *
 * Routing keys:
 *   compliance.updated  — score snapshot changed
 *   redflag.created     — new anomaly flag
 *   stage.completed     — workband execution finished
 *   stage.missed        — workband window closed with no execution
 */

const logger = require('../../../../shared/utils/logger');
const { generateUUID } = require('../../../../shared/utils/uuidHelper');

const EXCHANGE = 'roots_events';

/* ── Channel helper ── */

let channelReady = false;

const getPublishChannel = async () => {
  const { getChannel } = require('../../../../config/rabbitmq');
  const channel = await getChannel();
  if (!channel) return null;

  // Assert exchange once per process lifetime
  if (!channelReady) {
    try {
      await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
      channelReady = true;
    } catch (err) {
      logger.warn('Failed to assert roots_events exchange', { error: err.message });
    }
  }

  return channel;
};

const publish = async (routingKey, payload) => {
  try {
    const channel = await getPublishChannel();
    if (!channel) {
      logger.warn(`Cannot publish ${routingKey}: no RabbitMQ channel`);
      return false;
    }

    channel.publish(
      EXCHANGE,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      {
        persistent: true,
        contentType: 'application/json',
        timestamp: Math.floor(Date.now() / 1000),
        correlationId: generateUUID(),
      }
    );

    logger.debug(`Event published: ${EXCHANGE}/${routingKey}`, { farmerId: payload.farmerId });
    return true;
  } catch (err) {
    logger.warn(`Failed to publish ${routingKey}`, { error: err.message });
    return false;
  }
};

/* ====================================================================
 * 1. emitComplianceUpdate
 * ==================================================================== */

/**
 * Emitted after a compliance score snapshot is created or updated.
 * Consumed by TRUST (credit pillar), SENTINEL (risk monitoring), BANKER (dashboard).
 */
const emitComplianceUpdate = async (farmerId, activityType, activityRefId, complianceSnapshot) => {
  return publish('compliance.updated', {
    farmerId,
    activityType,
    activityRefId,
    overallScore: complianceSnapshot.overallComplianceScore ?? complianceSnapshot.overall_compliance_score ?? null,
    timingScore: complianceSnapshot.timingComplianceScore ?? complianceSnapshot.timing_compliance_score ?? null,
    quantityScore: complianceSnapshot.quantityComplianceScore ?? complianceSnapshot.quantity_compliance_score ?? null,
    costScore: complianceSnapshot.costComplianceScore ?? complianceSnapshot.cost_compliance_score ?? null,
    practiceScore: complianceSnapshot.practiceComplianceScore ?? complianceSnapshot.practice_compliance_score ?? null,
    dataCompleteness: complianceSnapshot.dataCompletenessPct ?? complianceSnapshot.data_completeness_pct ?? null,
    snapshotDate: complianceSnapshot.snapshotDate ?? complianceSnapshot.snapshot_date ?? new Date().toISOString().slice(0, 10),
    season: complianceSnapshot.season ?? null,
    emittedAt: new Date().toISOString(),
  });
};

/* ====================================================================
 * 2. emitRedFlagCreated
 * ==================================================================== */

/**
 * Emitted when a new red flag is created by the detection engine.
 * Consumed by SENTINEL (alerts), BANKER (dashboard notifications).
 */
const emitRedFlagCreated = async (redFlag) => {
  const published = await publish('redflag.created', {
    flagId: redFlag.uuid,
    farmerId: redFlag.farmer_id,
    flagType: redFlag.flag_type,
    severity: redFlag.severity,
    activityType: redFlag.activity_type,
    description: redFlag.description,
    loanApplicationId: redFlag.loan_application_id || null,
    emittedAt: new Date().toISOString(),
  });

  // Auto-create Sathi verification task for HIGH/CRITICAL flags
  if (redFlag.severity === 'HIGH' || redFlag.severity === 'CRITICAL') {
    try {
      const { createRootsVerificationTask } = require('../../../../modules/sathi/services/rootsVerificationService');
      await createRootsVerificationTask(
        redFlag.farmer_id,
        redFlag.severity,
        [redFlag.flag_type, redFlag.description].filter(Boolean)
      );
    } catch (err) {
      logger.warn('Auto Sathi task creation failed for red flag', { flagId: redFlag.uuid, error: err.message });
    }
  }

  return published;
};

/* ====================================================================
 * 3. emitStageCompleted
 * ==================================================================== */

/**
 * Emitted when a workband execution is marked as completed.
 * Consumed by TRUST (evidence), compliance recalculation triggers.
 */
const emitStageCompleted = async (farmerId, cycleId, workbandName, stageScore) => {
  return publish('stage.completed', {
    farmerId,
    cycleId,
    workbandName,
    stageScore,
    completedAt: new Date().toISOString(),
  });
};

/* ====================================================================
 * 4. emitStageMissed
 * ==================================================================== */

/**
 * Emitted when the missed step detector identifies a missed workband.
 * Consumed by SENTINEL (early warning), TRUST (negative signal).
 */
const emitStageMissed = async (farmerId, cycleId, workbandName, windowEnd) => {
  return publish('stage.missed', {
    farmerId,
    cycleId,
    workbandName,
    windowEnd: windowEnd ?? null,
    missedAt: new Date().toISOString(),
  });
};

module.exports = {
  emitComplianceUpdate,
  emitRedFlagCreated,
  emitStageCompleted,
  emitStageMissed,
  // Exposed for testing
  EXCHANGE,
};
