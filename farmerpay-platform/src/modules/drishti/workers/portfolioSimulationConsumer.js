/**
 * DRISHTI Portfolio Simulation Consumer
 *
 * RabbitMQ consumer for asynchronous banker portfolio stress simulations.
 *
 * Queue: drishti.portfolio.simulation
 * Exchange: farmerpay_exchange (topic)
 * Routing key: drishti.portfolio.simulate
 *
 * Process:
 *  1. Receive message with portfolio_run_id, farmer_ids, shock_variables
 *  2. For each farmer (chunked by 50):
 *     - Build/retrieve snapshot
 *     - Run climate stress scenario
 *     - Store individual DrishtiScenarioRun + DrishtiScenarioResult
 *     - Update DrishtiPortfolioRun.progress_pct
 *  3. Aggregate results across all farmers
 *  4. Update DrishtiPortfolioRun (status: completed, all aggregates)
 *  5. Send NotificationV2 to banker
 *
 * Run as separate process: node src/modules/drishti/workers/portfolioSimulationConsumer.js
 */

const config = require('../../../config');
const logger = require('../../../shared/utils/logger');
const { generateUUID } = require('../../../shared/utils/uuidHelper');

const QUEUE_NAME = 'drishti.portfolio.simulation';
const ROUTING_KEY = 'drishti.portfolio.simulate';
const MAX_RETRIES = 3;
const CHUNK_SIZE = 50;

let channel;
let consumerTag;

// ─── Main Consumer Setup ────────────────────────────────────────────

const start = async () => {
  try {
    const { getChannel } = require('../../../config/rabbitmq');
    channel = await getChannel();

    if (!channel) {
      logger.error('DRISHTI portfolioConsumer: failed to get RabbitMQ channel');
      process.exit(1);
    }

    // Assert queue and bind to exchange
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    await channel.bindQueue(QUEUE_NAME, config.rabbitmq.exchange, ROUTING_KEY);

    logger.info(`DRISHTI portfolioConsumer: listening on queue ${QUEUE_NAME}`);

    // Start consuming
    const { consumerTag: tag } = await channel.consume(QUEUE_NAME, async (msg) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString());
        logger.info(`DRISHTI portfolioConsumer: received job portfolio_run_id=${payload.portfolio_run_id}`);

        await processPortfolioJob(payload);

        channel.ack(msg);
        logger.info(`DRISHTI portfolioConsumer: completed portfolio_run_id=${payload.portfolio_run_id}`);
      } catch (err) {
        logger.error(`DRISHTI portfolioConsumer: job failed: ${err.message}`);

        // Retry logic
        const headers = msg.properties.headers || {};
        const retryCount = headers['x-retry-count'] || 0;

        if (retryCount >= MAX_RETRIES) {
          logger.error(`DRISHTI portfolioConsumer: max retries exceeded, discarding message`);
          // Mark the portfolio run as failed
          try {
            await markPortfolioFailed(
              JSON.parse(msg.content.toString()).portfolio_run_id,
              `Failed after ${MAX_RETRIES} retries: ${err.message}`
            );
          } catch (_) { /* best effort */ }
          channel.ack(msg);
        } else {
          // Re-publish with incremented retry count
          channel.publish(
            config.rabbitmq.exchange,
            ROUTING_KEY,
            msg.content,
            {
              persistent: true,
              headers: { ...headers, 'x-retry-count': retryCount + 1 },
            }
          );
          channel.ack(msg); // Ack original to remove from queue
          logger.warn(`DRISHTI portfolioConsumer: retrying (${retryCount + 1}/${MAX_RETRIES})`);
        }
      }
    });

    consumerTag = tag;
  } catch (err) {
    logger.error(`DRISHTI portfolioConsumer: startup failed: ${err.message}`);
    process.exit(1);
  }
};

// ─── Job Processing ─────────────────────────────────────────────────

/**
 * Process a single portfolio simulation job.
 *
 * @param {object} payload
 * @param {number} payload.portfolio_run_id
 * @param {number} payload.banker_id
 * @param {number[]} payload.farmer_ids
 * @param {object} payload.shock_variables
 * @param {string} payload.computation_mode
 * @param {number} payload.monte_carlo_runs
 */
const processPortfolioJob = async (payload) => {
  const {
    portfolio_run_id,
    banker_id,
    farmer_ids,
    shock_variables,
    computation_mode = 'deterministic',
    monte_carlo_runs = 500,
  } = payload;

  const db = require('../../../shared/models');
  const { DrishtiPortfolioRun, DrishtiScenarioRun, DrishtiScenarioResult, DrishtiFarmerSnapshot } = db;
  const { buildSnapshot } = require('../services/snapshotBuilder');
  const benchmarkService = require('../services/benchmarkService');
  const { computePortfolio } = require('../services/engines/bankerPortfolioEngine');

  // Mark as processing
  const portfolioRun = await DrishtiPortfolioRun.findByPk(portfolio_run_id);
  if (!portfolioRun) throw new Error(`Portfolio run ${portfolio_run_id} not found`);

  await portfolioRun.update({ status: 'processing', started_at: new Date() });

  const startTime = Date.now();
  const farmerSnapshots = [];

  // ── Build snapshots in chunks ──
  for (let i = 0; i < farmer_ids.length; i += CHUNK_SIZE) {
    const chunk = farmer_ids.slice(i, i + CHUNK_SIZE);

    for (const farmerId of chunk) {
      try {
        const snapshotResult = await buildSnapshot(farmerId);
        const snapshotRow = await DrishtiFarmerSnapshot.findByPk(snapshotResult.snapshotId);
        if (!snapshotRow) continue;

        const districtId = snapshotRow.district_id;
        const benchmarks = districtId ? await benchmarkService.getBenchmarks(districtId) : [];

        farmerSnapshots.push({
          snapshot: snapshotRow.toJSON(),
          benchmarks: Array.isArray(benchmarks) ? benchmarks.map(b => b.toJSON ? b.toJSON() : b) : [],
        });
      } catch (err) {
        logger.warn(`DRISHTI portfolioConsumer: snapshot failed for farmer ${farmerId}: ${err.message}`);
      }
    }

    // Update progress
    const progressPct = Math.round(((i + chunk.length) / farmer_ids.length) * 50); // Snapshot phase = 0-50%
    await portfolioRun.update({ progress_pct: progressPct });
  }

  // ── Run portfolio engine ──
  const onProgress = async (pct) => {
    const totalPct = 50 + Math.round(pct * 0.5); // Engine phase = 50-100%
    await portfolioRun.update({ progress_pct: totalPct });
  };

  const result = computePortfolio({
    farmerSnapshots,
    shockVariables: shock_variables,
    computationMode: computation_mode,
    monteCarloRuns: monte_carlo_runs,
    onProgress,
  });

  // ── Store individual scenario runs ──
  for (const scenario of (result.scenarios || [])) {
    const run = await DrishtiScenarioRun.create({
      run_uuid: generateUUID(),
      farmer_id: banker_id, // Banker is the initiator
      snapshot_id: farmerSnapshots[0]?.snapshot?.id || 1,
      engine_type: 'banker_portfolio',
      initiated_by: banker_id,
      initiator_role: 'banker',
      portfolio_run_id: portfolio_run_id,
      input_variables: shock_variables,
      computation_mode,
      monte_carlo_runs: computation_mode === 'monte_carlo' ? monte_carlo_runs : 0,
      status: 'completed',
      computation_time_ms: Date.now() - startTime,
    });

    await DrishtiScenarioResult.create({
      result_uuid: generateUUID(),
      run_id: run.id,
      scenario_label: scenario.label,
      projected_revenue: scenario.projections.total_revenue,
      projected_cost: scenario.projections.total_cost,
      projected_net_income: scenario.projections.net_farm_income,
      projected_health_status: scenario.projections.health_status,
      projected_sma_class: scenario.projections.sma_classification,
      monthly_cashflow: scenario.monthly_cashflow,
      detailed_breakdown: scenario.projections,
      risk_factors: result.riskFactors,
      recommendations: result.recommendations,
    });
  }

  // ── Update portfolio run with aggregated results ──
  await portfolioRun.update({
    status: 'completed',
    progress_pct: 100,
    completed_at: new Date(),
    total_portfolio_outstanding: result.portfolioSummary.total_outstanding,
    projected_npa_count: result.stressImpact.projected_npa_count,
    projected_npa_amount: result.stressImpact.projected_npa_amount,
    projected_sma_migration: result.stressImpact.sma_migration,
    farmers_needing_intervention: result.interventionList,
    portfolio_var_95: result.portfolioVar95,
  });

  // ── Send notification to banker ──
  try {
    const { sendTemplateNotification } = require('../../../shared/services/notificationService');
    await sendTemplateNotification({
      recipientUserId: banker_id,
      templateCode: 'DRISHTI_PORTFOLIO_COMPLETE',
      variables: {
        farmer_count: farmer_ids.length,
        npa_projected: result.stressImpact.projected_npa_count,
        portfolio_run_id: portfolio_run_id,
      },
      notificationType: 'info',
    });
  } catch (notifErr) {
    logger.warn(`DRISHTI portfolioConsumer: notification failed: ${notifErr.message}`);
  }

  const elapsed = Date.now() - startTime;
  logger.info(`DRISHTI portfolioConsumer: portfolio_run_id=${portfolio_run_id} completed in ${elapsed}ms (${farmer_ids.length} farmers)`);
};

// ─── Failure Handler ────────────────────────────────────────────────

const markPortfolioFailed = async (portfolioRunId, errorMessage) => {
  try {
    const db = require('../../../shared/models');
    const run = await db.DrishtiPortfolioRun.findByPk(portfolioRunId);
    if (run) {
      await run.update({ status: 'failed', error_message: errorMessage, completed_at: new Date() });
    }
  } catch (_) { /* best effort */ }
};

// ─── Publishing Helper (used by drishtiService) ─────────────────────

/**
 * Publish a portfolio simulation job to the RabbitMQ queue.
 * Called by drishtiService.runBankerPortfolio() for async jobs.
 */
const publishPortfolioJob = async (payload) => {
  try {
    const { getChannel } = require('../../../config/rabbitmq');
    const ch = await getChannel();

    if (!ch) {
      throw new Error('RabbitMQ channel not available');
    }

    ch.publish(
      config.rabbitmq.exchange,
      ROUTING_KEY,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true }
    );

    logger.info(`DRISHTI: portfolio job published for run_id=${payload.portfolio_run_id}`);
    return true;
  } catch (err) {
    logger.error(`DRISHTI: failed to publish portfolio job: ${err.message}`);
    throw err;
  }
};

// ─── Graceful Shutdown ──────────────────────────────────────────────

const gracefulShutdown = async (signal) => {
  logger.info(`DRISHTI portfolioConsumer: received ${signal}, shutting down...`);

  const forceExit = setTimeout(() => {
    logger.error('DRISHTI portfolioConsumer: graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 15000);

  try {
    if (channel && consumerTag) {
      await channel.cancel(consumerTag);
      logger.info('DRISHTI portfolioConsumer: consumer cancelled');
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const db = require('../../../shared/models');
    if (db.sequelize) await db.sequelize.close();

    clearTimeout(forceExit);
    process.exit(0);
  } catch (err) {
    logger.error(`DRISHTI portfolioConsumer: shutdown error: ${err.message}`);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ─── Start if run directly ──────────────────────────────────────────

if (require.main === module) {
  start().catch((err) => {
    logger.error(`DRISHTI portfolioConsumer: fatal error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { start, publishPortfolioJob, processPortfolioJob };
