/**
 * AA Re-Analysis Consumer
 * Consumes from 'aa.reanalysis' (single farmer) and 'aa.analysis.batch' (bulk) queues.
 * Triggers the analysis orchestrator for each farmer.
 */

const logger = require('../../../shared/utils/logger');

const QUEUE_REANALYSIS = 'aa.reanalysis';
const QUEUE_BATCH = 'aa.analysis.batch';
const INTER_FARMER_DELAY_MS = 500;

/**
 * Process a single re-analysis message.
 * @param {{ farmerId: number, consentId?: number, force?: boolean }} message
 */
const processMessage = async (message) => {
  const { farmerId, consentId, force } = message;
  logger.info(`[AAReAnalysis] Processing re-analysis: farmer=${farmerId}, consent=${consentId || 'latest'}`);

  try {
    const { runAnalysis } = require('../services/aaAnalysisOrchestrator');
    const result = await runAnalysis(farmerId, null, { consentId: consentId || null });

    if (result) {
      logger.info(`[AAReAnalysis] Complete: farmer=${farmerId}, score=${result.score}, grade=${result.grade}`);
    } else {
      logger.warn(`[AAReAnalysis] No data available for farmer=${farmerId}`);
    }
    return result;
  } catch (err) {
    logger.error(`[AAReAnalysis] Failed for farmer=${farmerId}: ${err.message}`);
    return { status: 'failed', farmerId, error: err.message };
  }
};

/**
 * Process a batch analysis message.
 * Processes each farmer sequentially with delay to avoid overwhelming the system.
 * @param {{ farmerId: number } | { farmerIds: number[] }} message
 */
const processBatchMessage = async (message) => {
  // Support both single farmerId (from admin endpoint) and farmerIds array
  const farmerIds = message.farmerIds || [message.farmerId];
  logger.info(`[AAReAnalysis] Batch processing ${farmerIds.length} farmers`);

  let processed = 0;
  let failed = 0;

  for (const farmerId of farmerIds) {
    try {
      await processMessage({ farmerId });
      processed++;
    } catch (err) {
      failed++;
      logger.error(`[AAReAnalysis] Batch item failed: farmer=${farmerId}: ${err.message}`);
    }

    // Delay between farmers to avoid overwhelming AA provider / DB
    if (farmerIds.indexOf(farmerId) < farmerIds.length - 1) {
      await sleep(INTER_FARMER_DELAY_MS);
    }
  }

  logger.info(`[AAReAnalysis] Batch complete: ${processed} processed, ${failed} failed out of ${farmerIds.length}`);
  return { processed, failed, total: farmerIds.length };
};

/**
 * Initialize the consumer — bind to both queues.
 * @param {Object} channel - RabbitMQ channel
 */
const initialize = async (channel) => {
  // Assert both queues
  await channel.assertQueue(QUEUE_REANALYSIS, { durable: true });
  await channel.assertQueue(QUEUE_BATCH, { durable: true });

  logger.info(`[AAReAnalysis] Listening on queues: ${QUEUE_REANALYSIS}, ${QUEUE_BATCH}`);

  // Single re-analysis consumer
  channel.consume(QUEUE_REANALYSIS, async (msg) => {
    if (!msg) return;
    try {
      const message = JSON.parse(msg.content.toString());
      await processMessage(message);
      channel.ack(msg);
    } catch (err) {
      logger.error(`[AAReAnalysis] Message error on ${QUEUE_REANALYSIS}: ${err.message}`);
      channel.nack(msg, false, false); // Don't requeue — avoid infinite loop
    }
  });

  // Batch analysis consumer
  channel.consume(QUEUE_BATCH, async (msg) => {
    if (!msg) return;
    try {
      const message = JSON.parse(msg.content.toString());
      await processBatchMessage(message);
      channel.ack(msg);
    } catch (err) {
      logger.error(`[AAReAnalysis] Message error on ${QUEUE_BATCH}: ${err.message}`);
      channel.nack(msg, false, false);
    }
  });
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = { initialize, processMessage, processBatchMessage, QUEUE_REANALYSIS, QUEUE_BATCH };
