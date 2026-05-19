/**
 * Audit Log Consumer
 * RabbitMQ consumer that processes audit log messages asynchronously.
 * Run as a separate process: node src/workers/auditConsumer.js
 */

require('dotenv').config();
const { connectRabbitMQ, getChannel } = require('../config/rabbitmq');
const config = require('../config');
const logger = require('../shared/utils/logger');

const QUEUE_NAME = 'audit_log_queue';
const ROUTING_KEY = 'audit.log';
const MAX_RETRIES = 3;

let channel = null;
let connection = null;
let consumerTag = null;

const startConsumer = async () => {
  try {
    connection = await connectRabbitMQ();
    channel = await getChannel();
    if (!channel) {
      logger.error('Failed to get RabbitMQ channel for audit consumer');
      return;
    }

    // Declare queue and bind to exchange
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    await channel.bindQueue(QUEUE_NAME, config.rabbitmq.exchange, ROUTING_KEY);

    logger.info(`Audit consumer started, listening on queue: ${QUEUE_NAME}`);

    const { consumerTag: tag } = await channel.consume(QUEUE_NAME, async (msg) => {
      if (!msg) return;

      try {
        const auditData = JSON.parse(msg.content.toString());
        const db = require('../shared/models');

        // Insert audit log
        const auditLog = await db.AuditLogV2.create(auditData);

        // Create field-level trail if old/new values provided
        if (auditData.old_values && auditData.new_values) {
          const { createAuditTrail } = require('../shared/services/auditService');
          await createAuditTrail(auditLog.id, auditData.old_values, auditData.new_values);
        }

        channel.ack(msg);
      } catch (err) {
        logger.error('Audit consumer error:', err.message);

        const headers = msg.properties.headers || {};
        const retryCount = (headers['x-retry-count'] || 0);

        if (retryCount >= MAX_RETRIES) {
          logger.error(`Message exceeded max retries (${MAX_RETRIES}), discarding:`, msg.content.toString());
          channel.ack(msg);
        } else {
          // Republish with incremented retry count
          channel.publish(
            config.rabbitmq.exchange,
            ROUTING_KEY,
            msg.content,
            {
              persistent: true,
              headers: { ...headers, 'x-retry-count': retryCount + 1 },
            }
          );
          channel.ack(msg);
        }
      }
    });

    consumerTag = tag;
  } catch (err) {
    logger.error('Failed to start audit consumer:', err.message);
    setTimeout(startConsumer, 5000);
  }
};

const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down audit consumer gracefully...`);

  // Force exit after 15 seconds
  const forceExitTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 15000);
  forceExitTimeout.unref();

  try {
    // Cancel consumer to stop receiving new messages
    if (channel && consumerTag) {
      await channel.cancel(consumerTag);
      logger.info('Consumer cancelled, waiting for in-flight messages...');
    }

    // Wait 5 seconds for in-flight messages to complete
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Close channel and connection
    if (channel) {
      await channel.close();
      logger.info('RabbitMQ channel closed');
    }
    if (connection) {
      await connection.close();
      logger.info('RabbitMQ connection closed');
    }

    // Close DB connection
    try {
      const db = require('../shared/models');
      await db.sequelize.close();
      logger.info('Database connection closed');
    } catch (dbErr) {
      logger.error('Error closing database connection:', dbErr.message);
    }

    process.exit(0);
  } catch (err) {
    logger.error('Error during graceful shutdown:', err.message);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startConsumer();
