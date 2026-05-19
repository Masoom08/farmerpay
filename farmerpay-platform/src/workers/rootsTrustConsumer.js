/**
 * ROOTS → TRUST Consumer
 *
 * Listens for 'compliance.updated' events from the ROOTS Variance Engine
 * and triggers TRUST score recomputation when compliance changes significantly.
 */

const { getChannel } = require('../config/rabbitmq');
const config = require('../config');
const logger = require('../shared/utils/logger');

const QUEUE = 'roots_trust_recompute';
const ROUTING_KEY = 'compliance.updated';
const EXCHANGE = 'roots_events';
const MAX_RETRIES = 3;
const SIGNIFICANCE_THRESHOLD = 5; // re-score only if ROOTS score changed by >5 points

let consumerTag = null;

const start = async () => {
  try {
    const channel = await getChannel();
    if (!channel) {
      logger.warn('[rootsTrustConsumer] No RabbitMQ channel');
      return;
    }

    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(QUEUE, { durable: true });
    await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

    const { consumerTag: tag } = await channel.consume(QUEUE, async (msg) => {
      if (!msg) return;

      try {
        const data = JSON.parse(msg.content.toString());
        const { farmerId, overallScore } = data;

        if (!farmerId) {
          channel.ack(msg);
          return;
        }

        // Check if score change is significant enough to trigger recompute
        const shouldRecompute = await checkSignificance(farmerId, overallScore);

        if (shouldRecompute) {
          // Trigger TRUST recomputation via existing pipeline
          channel.publish(
            config.rabbitmq.exchange,
            'trust.snapshot.recompute',
            Buffer.from(JSON.stringify({
              farmerId,
              reason: `ROOTS compliance updated (score: ${overallScore})`,
              correlationId: data.correlationId || null,
            })),
            { persistent: true }
          );
          logger.info(`[rootsTrustConsumer] Triggered TRUST recompute for farmer ${farmerId} (ROOTS score: ${overallScore})`);
        }

        channel.ack(msg);
      } catch (err) {
        const headers = msg.properties.headers || {};
        const retryCount = headers['x-retry-count'] || 0;

        if (retryCount >= MAX_RETRIES) {
          logger.error(`[rootsTrustConsumer] Max retries, discarding`, { error: err.message });
          channel.ack(msg);
        } else {
          channel.publish(EXCHANGE, ROUTING_KEY, msg.content, {
            persistent: true,
            headers: { ...headers, 'x-retry-count': retryCount + 1 },
          });
          channel.ack(msg);
        }
      }
    });

    consumerTag = tag;
    logger.info(`[rootsTrustConsumer] Started on queue ${QUEUE}, exchange ${EXCHANGE}`);
  } catch (err) {
    logger.error('[rootsTrustConsumer] Failed to start', { error: err.message });
  }
};

/**
 * Check if the ROOTS score change is significant enough to warrant TRUST recomputation.
 * Avoids noisy re-scoring for minor fluctuations.
 */
const checkSignificance = async (farmerId, newScore) => {
  try {
    const db = require('../shared/models');
    const { TrustEvidence } = db;

    if (!TrustEvidence) return true; // can't check, recompute to be safe

    const lastEvidence = await TrustEvidence.findOne({
      where: {
        farmer_id: farmerId,
        feature_code: 'ROOTS_COMPLIANCE',
        is_active: true,
      },
      order: [['fetched_at', 'DESC']],
    });

    if (!lastEvidence) return true; // first time, always compute

    const lastBand = lastEvidence.band || 0;
    const newBand = Math.ceil((newScore || 0) / 20);

    // Significant if band changed
    if (Math.abs(newBand - lastBand) >= 1) return true;

    // Or if raw_ref shows >5 point change
    try {
      const lastRef = JSON.parse(lastEvidence.raw_ref || '{}');
      if (Math.abs((lastRef.score || 0) - (newScore || 0)) >= SIGNIFICANCE_THRESHOLD) return true;
    } catch {}

    return false;
  } catch {
    return true; // on error, recompute
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
