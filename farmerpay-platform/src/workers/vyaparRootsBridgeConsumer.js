/**
 * VYAPAR-ROOTS Bridge Consumer
 *
 * Listens for vyapar.transaction.created events and auto-links
 * vendor purchases to ROOTS cost entries via the bridge service.
 */

const { getChannel } = require('../config/rabbitmq');
const config = require('../config');
const logger = require('../shared/utils/logger');

const QUEUE = 'vyapar_roots_bridge';
const ROUTING_KEY = 'vyapar.transaction.created';
const MAX_RETRIES = 3;

let consumerTag = null;

const start = async () => {
  try {
    const channel = await getChannel();
    if (!channel) {
      logger.warn('[vyaparRootsBridge] No RabbitMQ channel, consumer not started');
      return;
    }

    await channel.assertQueue(QUEUE, { durable: true });
    await channel.bindQueue(QUEUE, config.rabbitmq.exchange, ROUTING_KEY);

    const { consumerTag: tag } = await channel.consume(QUEUE, async (msg) => {
      if (!msg) return;

      try {
        const data = JSON.parse(msg.content.toString());
        const transactionId = data.transactionId;

        if (!transactionId) {
          logger.warn('[vyaparRootsBridge] Missing transactionId in message');
          channel.ack(msg);
          return;
        }

        const bridgeService = require('../modules/roots/crop/services/vyaparRootsBridgeService');
        const result = await bridgeService.processTransaction(transactionId);

        logger.info(`[vyaparRootsBridge] Processed txn ${transactionId}: ${result.mapped_items.length} mapped`);
        channel.ack(msg);
      } catch (err) {
        const headers = msg.properties.headers || {};
        const retryCount = headers['x-retry-count'] || 0;

        if (retryCount >= MAX_RETRIES) {
          logger.error(`[vyaparRootsBridge] Max retries reached, discarding`, { error: err.message });
          channel.ack(msg);
        } else {
          logger.warn(`[vyaparRootsBridge] Retry ${retryCount + 1}/${MAX_RETRIES}`, { error: err.message });
          channel.publish(config.rabbitmq.exchange, ROUTING_KEY, msg.content, {
            persistent: true,
            headers: { ...headers, 'x-retry-count': retryCount + 1 },
          });
          channel.ack(msg);
        }
      }
    });

    consumerTag = tag;
    logger.info(`[vyaparRootsBridge] Consumer started on queue ${QUEUE}`);
  } catch (err) {
    logger.error('[vyaparRootsBridge] Consumer failed to start', { error: err.message });
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
