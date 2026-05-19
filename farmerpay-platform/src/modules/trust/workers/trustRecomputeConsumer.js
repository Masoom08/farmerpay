/**
 * TRUST v2 Recompute Consumer
 *
 * RabbitMQ consumer for asynchronous TRUST snapshot recomputation.
 * The farmer-app overlay (§3.5) triggers this via HTTP → publish; this worker
 * runs the heavy computation out-of-band.
 *
 * Queue:       trust.snapshot.recompute
 * DLQ:         trust.snapshot.recompute.dlq
 * Exchange:    farmerpay_exchange (topic)
 * Prefetch:    4
 * Max retries: 3 with exponential backoff (2s, 10s, 60s)
 *
 * On success → publish trust.snapshot.ready { farmerId, snapshotUuid, score, decision }
 * On INCOMPLETE → publish trust.snapshot.incomplete { farmerId, missingPillars[] }
 * On permanent failure → DLQ + audit event
 *
 * Run as: node src/modules/trust/workers/trustRecomputeConsumer.js
 */

const config = require('../../../config');
const logger = require('../../../shared/utils/logger');

// ─── Queue Configuration ────────────────────────────────────────

const QUEUE_NAME = 'trust.snapshot.recompute';
const DLQ_NAME = 'trust.snapshot.recompute.dlq';
const ROUTING_KEY = 'trust.snapshot.recompute';
const READY_ROUTING_KEY = 'trust.snapshot.ready';
const INCOMPLETE_ROUTING_KEY = 'trust.snapshot.incomplete';
const MAX_RETRIES = 3;
const PREFETCH = 4;
const BACKOFF_DELAYS = [2000, 10000, 60000]; // ms: 2s, 10s, 60s

let channel;
let consumerTag;

// ─── Consumer Setup ─────────────────────────────────────────────

const start = async () => {
  try {
    const { getChannel } = require('../../../config/rabbitmq');
    channel = await getChannel();

    if (!channel) {
      logger.error('[TRUST/worker] Failed to get RabbitMQ channel');
      process.exit(1);
    }

    await channel.prefetch(PREFETCH);

    // Assert DLQ first (so main queue can reference it)
    await channel.assertQueue(DLQ_NAME, { durable: true });
    await channel.bindQueue(DLQ_NAME, config.rabbitmq.exchange, `${ROUTING_KEY}.dlq`);

    // Assert main queue with DLQ policy
    await channel.assertQueue(QUEUE_NAME, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': config.rabbitmq.exchange,
        'x-dead-letter-routing-key': `${ROUTING_KEY}.dlq`,
      },
    });
    await channel.bindQueue(QUEUE_NAME, config.rabbitmq.exchange, ROUTING_KEY);

    logger.info(`[TRUST/worker] Listening on queue ${QUEUE_NAME} (prefetch=${PREFETCH})`);

    const { consumerTag: tag } = await channel.consume(QUEUE_NAME, handleMessage);
    consumerTag = tag;
  } catch (err) {
    logger.error(`[TRUST/worker] Startup failed: ${err.message}`);
    process.exit(1);
  }
};

// ─── Message Handler ────────────────────────────────────────────

const handleMessage = async (msg) => {
  if (!msg) return;

  let payload;
  try {
    payload = JSON.parse(msg.content.toString());
  } catch (parseErr) {
    logger.error(`[TRUST/worker] Invalid JSON, sending to DLQ: ${parseErr.message}`);
    channel.nack(msg, false, false); // DLQ via dead-letter policy
    return;
  }

  const { farmerId, reason, correlationId } = payload;

  try {
    logger.info(`[TRUST/worker] Processing farmerId=${farmerId} correlationId=${correlationId}`);

    const trustService = require('../services/trustService');
    const result = await trustService.computeSnapshot(farmerId, { reason });

    if (result && result.status === 'INCOMPLETE') {
      // Missing mandatory pillar data — no snapshot persisted
      publishEvent(INCOMPLETE_ROUTING_KEY, {
        farmerId,
        missingPillars: result.missingPillars,
        correlationId,
      });

      // Audit event
      try {
        const auditLogger = require('../services/auditLogger');
        await auditLogger.logEvent({
          farmerId,
          actorType: 'SYSTEM',
          actorId: null,
          action: 'SNAPSHOT_INCOMPLETE',
          payload: { missingPillars: result.missingPillars, correlationId },
        });
      } catch (auditErr) {
        logger.warn(`[TRUST/worker] Audit log failed: ${auditErr.message}`);
      }

      channel.ack(msg);
      logger.info(`[TRUST/worker] INCOMPLETE farmerId=${farmerId} missing=${result.missingPillars.join(',')}`);
      return;
    }

    // Success — publish ready event
    publishEvent(READY_ROUTING_KEY, {
      farmerId,
      snapshotUuid: result.snapshotUuid,
      score: result.score,
      decision: result.decision,
      correlationId,
    });

    channel.ack(msg);
    logger.info(`[TRUST/worker] Completed farmerId=${farmerId} score=${result.score} decision=${result.decision}`);
  } catch (err) {
    logger.error(`[TRUST/worker] Processing failed farmerId=${farmerId}: ${err.message}`);
    await handleRetry(msg, payload, err);
  }
};

// ─── Retry with Exponential Backoff ─────────────────────────────

const handleRetry = async (msg, payload, err) => {
  const headers = msg.properties.headers || {};
  const retryCount = headers['x-retry-count'] || 0;

  if (retryCount >= MAX_RETRIES) {
    logger.error(`[TRUST/worker] Max retries (${MAX_RETRIES}) exceeded for farmerId=${payload.farmerId}, sending to DLQ`);

    // Audit the permanent failure
    try {
      const auditLogger = require('../services/auditLogger');
      await auditLogger.logEvent({
        farmerId: payload.farmerId,
        actorType: 'SYSTEM',
        actorId: null,
        action: 'SNAPSHOT_RECOMPUTE_FAILED',
        payload: {
          error: err.message,
          retries: retryCount,
          correlationId: payload.correlationId,
        },
      });
    } catch (auditErr) {
      logger.warn(`[TRUST/worker] Audit log on failure failed: ${auditErr.message}`);
    }

    // nack without requeue → DLQ via dead-letter policy
    channel.nack(msg, false, false);
    return;
  }

  // Exponential backoff: delay before re-publishing
  const delay = BACKOFF_DELAYS[retryCount] || BACKOFF_DELAYS[BACKOFF_DELAYS.length - 1];

  logger.warn(`[TRUST/worker] Retrying farmerId=${payload.farmerId} (${retryCount + 1}/${MAX_RETRIES}) in ${delay}ms`);

  setTimeout(() => {
    try {
      channel.publish(
        config.rabbitmq.exchange,
        ROUTING_KEY,
        Buffer.from(JSON.stringify(payload)),
        {
          persistent: true,
          headers: { ...headers, 'x-retry-count': retryCount + 1 },
        },
      );
    } catch (pubErr) {
      logger.error(`[TRUST/worker] Retry publish failed: ${pubErr.message}`);
    }
  }, delay);

  // Ack the original to remove from queue (retry is the new message)
  channel.ack(msg);
};

// ─── Publish Helper ─────────────────────────────────────────────

const publishEvent = (routingKey, payload) => {
  try {
    channel.publish(
      config.rabbitmq.exchange,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true },
    );
  } catch (err) {
    logger.error(`[TRUST/worker] Publish to ${routingKey} failed: ${err.message}`);
  }
};

/**
 * Publishes a recompute job to the queue.
 * Called by trustService or controllers to enqueue async recomputation.
 *
 * @param {{ farmerId: number, reason?: string, correlationId?: string }} payload
 */
const publishRecomputeJob = async (payload) => {
  const { getChannel } = require('../../../config/rabbitmq');
  const { generateUUID } = require('../../../shared/utils/uuidHelper');
  const ch = await getChannel();
  if (!ch) {
    logger.error('[TRUST/worker] Cannot publish: no RabbitMQ channel');
    return;
  }

  const message = {
    farmerId: payload.farmerId,
    reason: payload.reason || null,
    correlationId: payload.correlationId || generateUUID(),
  };

  ch.publish(
    config.rabbitmq.exchange,
    ROUTING_KEY,
    Buffer.from(JSON.stringify(message)),
    { persistent: true },
  );

  logger.info(`[TRUST/worker] Published recompute job farmerId=${message.farmerId} correlationId=${message.correlationId}`);
  return message.correlationId;
};

// ─── Graceful Shutdown ──────────────────────────────────────────

const shutdown = async () => {
  logger.info('[TRUST/worker] Shutting down...');
  try {
    if (consumerTag && channel) {
      await channel.cancel(consumerTag);
    }
    // Wait for in-flight messages
    await new Promise((r) => setTimeout(r, 5000));
    const { closeRabbitMQ } = require('../../../config/rabbitmq');
    await closeRabbitMQ();
  } catch (err) {
    logger.error(`[TRUST/worker] Shutdown error: ${err.message}`);
  }
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ─── Exports ────────────────────────────────────────────────────

module.exports = {
  start,
  publishRecomputeJob,
  // Exported for testing
  handleMessage,
  handleRetry,
  publishEvent,
  QUEUE_NAME,
  DLQ_NAME,
  ROUTING_KEY,
  READY_ROUTING_KEY,
  INCOMPLETE_ROUTING_KEY,
  MAX_RETRIES,
  BACKOFF_DELAYS,
};

// Auto-start if run directly
if (require.main === module) {
  start();
}
