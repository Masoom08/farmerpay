/**
 * ROOTS → SAGE Consumer
 *
 * Listens for ROOTS events and generates personalized advisories:
 *   compliance.updated → check for new variances, generate advisories
 *   stage.missed       → generate corrective advisory immediately
 *   redflag.created    → generate alert advisory for critical flags
 */

const { getChannel } = require('../config/rabbitmq');
const config = require('../config');
const logger = require('../shared/utils/logger');

const QUEUE = 'roots_sage_advisories';
const EXCHANGE = 'roots_events';
const MAX_RETRIES = 3;

let consumerTag = null;

const start = async () => {
  try {
    const channel = await getChannel();
    if (!channel) {
      logger.warn('[rootsSageConsumer] No RabbitMQ channel');
      return;
    }

    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(QUEUE, { durable: true });
    await channel.bindQueue(QUEUE, EXCHANGE, 'compliance.updated');
    await channel.bindQueue(QUEUE, EXCHANGE, 'stage.missed');
    await channel.bindQueue(QUEUE, EXCHANGE, 'redflag.created');

    const { consumerTag: tag } = await channel.consume(QUEUE, async (msg) => {
      if (!msg) return;

      try {
        const data = JSON.parse(msg.content.toString());
        const routingKey = msg.fields.routingKey;
        const farmerId = data.farmerId;

        if (!farmerId) { channel.ack(msg); return; }

        const cropAdvisoryEngine = require('../modules/sage/services/cropAdvisoryEngine');

        if (routingKey === 'compliance.updated') {
          const result = await cropAdvisoryEngine.generateVarianceBasedAdvisories(farmerId);
          logger.info(`[rootsSageConsumer] compliance.updated → ${result.emitted} advisories for farmer ${farmerId}`);
        } else if (routingKey === 'stage.missed') {
          // Generate immediate corrective advisory
          const result = await cropAdvisoryEngine.generateVarianceBasedAdvisories(farmerId);
          logger.info(`[rootsSageConsumer] stage.missed → ${result.emitted} advisories for farmer ${farmerId}`);
        } else if (routingKey === 'redflag.created') {
          // Only generate advisory for critical/high severity
          if (data.severity === 'HIGH' || data.severity === 'CRITICAL') {
            const result = await cropAdvisoryEngine.generateVarianceBasedAdvisories(farmerId);
            logger.info(`[rootsSageConsumer] redflag.created (${data.severity}) → ${result.emitted} advisories for farmer ${farmerId}`);
          }
        }

        channel.ack(msg);
      } catch (err) {
        const headers = msg.properties.headers || {};
        const retryCount = headers['x-retry-count'] || 0;

        if (retryCount >= MAX_RETRIES) {
          logger.error(`[rootsSageConsumer] Max retries, discarding`, { error: err.message });
          channel.ack(msg);
        } else {
          const routingKey = msg.fields.routingKey || 'compliance.updated';
          channel.publish(EXCHANGE, routingKey, msg.content, {
            persistent: true,
            headers: { ...headers, 'x-retry-count': retryCount + 1 },
          });
          channel.ack(msg);
        }
      }
    });

    consumerTag = tag;
    logger.info(`[rootsSageConsumer] Started on queue ${QUEUE}`);
  } catch (err) {
    logger.error('[rootsSageConsumer] Failed to start', { error: err.message });
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
