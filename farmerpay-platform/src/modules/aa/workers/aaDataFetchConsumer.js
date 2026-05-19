/**
 * AA Data Fetch Consumer
 * RabbitMQ worker that processes async data fetch jobs after consent approval.
 * Listens on queue: aa.data.fetch
 */

const logger = require('../../../shared/utils/logger');
const { fetchAndStore } = require('../services/aaDataFetchService');

const QUEUE_NAME = 'aa.data.fetch';

/**
 * Process a data fetch job.
 * @param {Object} message - { consentId, consentUuid, farmerId, provider }
 */
const processMessage = async (message) => {
  const { consentId, consentUuid, farmerId, provider } = message;

  logger.info(`[AAWorker] Processing data fetch: consent=${consentUuid}, farmer=${farmerId}, provider=${provider}`);

  try {
    const result = await fetchAndStore(consentId, farmerId, provider);
    logger.info(`[AAWorker] Fetch complete: ${result.accountsProcessed} accounts, ${result.transactionCount} transactions`);

    // TODO: Send push notification to farmer that AA data is ready
    // await notificationService.send(farmerId, 'aa_data_ready', { ... });

    return result;
  } catch (err) {
    logger.error(`[AAWorker] Fetch failed for consent ${consentUuid}:`, err.message);
    // Don't throw — let the message be acked so it doesn't block the queue
    return { status: 'failed', error: err.message };
  }
};

/**
 * Initialize the consumer.
 * @param {Object} channel - RabbitMQ channel
 */
const initialize = async (channel) => {
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  logger.info(`[AAWorker] Listening on queue: ${QUEUE_NAME}`);

  channel.consume(QUEUE_NAME, async (msg) => {
    if (!msg) return;

    try {
      const message = JSON.parse(msg.content.toString());
      await processMessage(message);
      channel.ack(msg);
    } catch (err) {
      logger.error('[AAWorker] Message processing error:', err.message);
      // Reject and don't requeue — failed messages go to dead letter
      channel.nack(msg, false, false);
    }
  });
};

module.exports = { initialize, processMessage, QUEUE_NAME };
