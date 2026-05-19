/**
 * ROOTS → SENTINEL Consumer
 *
 * Listens for ROOTS red flag and stage missed events, triggers
 * EWS alert generation and loan health re-scoring.
 *
 * Routing keys:
 *   redflag.created  → create/escalate EWS alert
 *   stage.missed     → update health scoring for linked loans
 */

const { getChannel } = require('../config/rabbitmq');
const config = require('../config');
const logger = require('../shared/utils/logger');

const QUEUE = 'roots_sentinel_ews';
const EXCHANGE = 'roots_events';
const MAX_RETRIES = 3;

let consumerTag = null;

const start = async () => {
  try {
    const channel = await getChannel();
    if (!channel) {
      logger.warn('[rootsSentinelConsumer] No RabbitMQ channel');
      return;
    }

    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(QUEUE, { durable: true });
    await channel.bindQueue(QUEUE, EXCHANGE, 'redflag.created');
    await channel.bindQueue(QUEUE, EXCHANGE, 'stage.missed');

    const { consumerTag: tag } = await channel.consume(QUEUE, async (msg) => {
      if (!msg) return;

      try {
        const data = JSON.parse(msg.content.toString());
        const routingKey = msg.fields.routingKey;

        if (routingKey === 'redflag.created') {
          await handleRedFlagCreated(data);
        } else if (routingKey === 'stage.missed') {
          await handleStageMissed(data);
        }

        channel.ack(msg);
      } catch (err) {
        const headers = msg.properties.headers || {};
        const retryCount = headers['x-retry-count'] || 0;

        if (retryCount >= MAX_RETRIES) {
          logger.error(`[rootsSentinelConsumer] Max retries, discarding`, { error: err.message });
          channel.ack(msg);
        } else {
          const routingKey = msg.fields.routingKey || 'redflag.created';
          channel.publish(EXCHANGE, routingKey, msg.content, {
            persistent: true,
            headers: { ...headers, 'x-retry-count': retryCount + 1 },
          });
          channel.ack(msg);
        }
      }
    });

    consumerTag = tag;
    logger.info(`[rootsSentinelConsumer] Started on queue ${QUEUE}, keys: redflag.created, stage.missed`);
  } catch (err) {
    logger.error('[rootsSentinelConsumer] Failed to start', { error: err.message });
  }
};

/**
 * Handle ROOTS red flag creation → create EWS alert if severity warrants it.
 */
const handleRedFlagCreated = async (data) => {
  const { farmerId, flagType, severity, description } = data;
  if (!farmerId) return;

  // Only generate EWS alerts for HIGH/CRITICAL severity
  if (severity !== 'HIGH' && severity !== 'CRITICAL') return;

  try {
    const ewsService = require('../modules/sentinel/services/ewsService');
    const result = await ewsService.generateEwsSignals(farmerId);

    logger.info(`[rootsSentinelConsumer] Red flag ${flagType} (${severity}) → ${result.alerts.length} EWS alerts for farmer ${farmerId}`);
  } catch (err) {
    logger.error(`[rootsSentinelConsumer] EWS generation failed for farmer ${farmerId}`, { error: err.message });
    throw err; // will be retried
  }
};

/**
 * Handle stage missed → update health scoring for linked loans.
 */
const handleStageMissed = async (data) => {
  const { farmerId } = data;
  if (!farmerId) return;

  try {
    const healthService = require('../modules/sentinel/services/healthScoringService');
    const flags = await healthService.detectRedFlags(farmerId);

    logger.info(`[rootsSentinelConsumer] Stage missed → ${flags.length} red flags detected for farmer ${farmerId}`);
  } catch (err) {
    logger.error(`[rootsSentinelConsumer] Health scoring failed for farmer ${farmerId}`, { error: err.message });
    throw err;
  }
};

const stop = async () => {
  if (consumerTag) {
    try {
      const channel = await getChannel();
      if (channel) await channel.cancel(consumerTag);
    } catch {}
    consumerTag = null;
  }
};

module.exports = { start, stop };
