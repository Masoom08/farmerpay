/**
 * DRISHTI Service — Main Orchestrator
 *
 * Manages the full scenario lifecycle:
 *  1. Build/retrieve farmer snapshot (via snapshotBuilder)
 *  2. Create DrishtiScenarioRun record (status: computing)
 *  3. Fetch benchmarks for the farmer's district
 *  4. Route to the correct engine based on scenario type
 *  5. Save results to DrishtiScenarioResult (one row per sub-scenario)
 *  6. Update DrishtiScenarioRun (status: completed)
 *  7. Return formatted response matching the API contract
 *
 * Also handles: scenario queries, comparisons, templates, portfolio runs.
 */

const logger = require('../../../shared/utils/logger');
const { generateUUID } = require('../../../shared/utils/uuidHelper');
const { getKey, setWithTTL, deleteKeys } = require('../../../config/redis');
const { buildSnapshot } = require('./snapshotBuilder');
const benchmarkService = require('./benchmarkService');

// Engine imports
const preLoanEngine = require('./engines/preLoanEngine');
const householdPortfolioEngine = require('./engines/householdPortfolioEngine');
const climateStressEngine = require('./engines/climateStressEngine');
const insuranceEngine = require('./engines/insuranceEngine');
const marketTimingEngine = require('./engines/marketTimingEngine');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

const RESULT_CACHE_TTL = 3600; // 1 hour

// ─── Main Scenario Runner ───────────────────────────────────────────

/**
 * Run a scenario end-to-end.
 * @param {string} engineType - 'pre_loan' | 'household_portfolio' | ...
 * @param {object} input      - Validated request body
 * @param {number} userId     - Internal user ID (initiator)
 * @param {string} userRole   - 'FARMER' | 'AGENT' | 'BANK_OFFICER' | 'ADMIN'
 * @returns {object} Full result matching the API contract
 */
const runScenario = async (engineType, input, userId, userRole) => {
  const startTime = Date.now();
  const { DrishtiScenarioRun, DrishtiScenarioResult, DrishtiFarmerSnapshot } = getDb();

  const farmerId = input.farmer_id;
  logger.info(`DRISHTI: runScenario ${engineType} for farmer ${farmerId} by user ${userId} (${userRole})`);

  // ── 1. Build or retrieve snapshot ──
  const snapshotResult = await buildSnapshot(farmerId);
  const snapshotRow = await DrishtiFarmerSnapshot.findByPk(snapshotResult.snapshotId);
  if (!snapshotRow) {
    const err = new Error('Snapshot creation failed');
    err.statusCode = 500;
    err.errorCode = 'DRISHTI_SNAPSHOT_FAILED';
    throw err;
  }

  // ── 2. Create scenario run (status: computing) ──
  const runUuid = generateUUID();
  const run = await DrishtiScenarioRun.create({
    run_uuid: runUuid,
    farmer_id: farmerId,
    snapshot_id: snapshotResult.snapshotId,
    template_id: input.template_id || null,
    engine_type: engineType,
    initiated_by: userId,
    initiator_role: mapRole(userRole),
    loan_application_id: input.loan_application_id || null,
    input_variables: input,
    computation_mode: input.computation_mode || 'deterministic',
    monte_carlo_runs: input.monte_carlo_runs || 0,
    status: 'computing',
  });

  try {
    // ── 3. Fetch benchmarks for farmer's district ──
    const districtId = snapshotRow.district_id;
    let benchmarks = [];
    if (districtId) {
      benchmarks = await benchmarkService.getBenchmarks(districtId);
    }

    // ── 4. Route to engine ──
    let engineResult;
    switch (engineType) {
      case 'pre_loan':
        engineResult = preLoanEngine.compute({
          snapshot: snapshotRow.toJSON(),
          benchmarks: Array.isArray(benchmarks) ? benchmarks.map(b => b.toJSON ? b.toJSON() : b) : [],
          input,
        });
        break;

      case 'household_portfolio':
        engineResult = householdPortfolioEngine.compute({
          snapshot: snapshotRow.toJSON(),
          benchmarks: Array.isArray(benchmarks) ? benchmarks.map(b => b.toJSON ? b.toJSON() : b) : [],
          input,
        });
        break;

      case 'climate_stress':
        engineResult = climateStressEngine.compute({
          snapshot: snapshotRow.toJSON(),
          benchmarks: Array.isArray(benchmarks) ? benchmarks.map(b => b.toJSON ? b.toJSON() : b) : [],
          input,
        });
        break;

      case 'insurance':
        engineResult = insuranceEngine.compute({
          snapshot: snapshotRow.toJSON(),
          benchmarks: Array.isArray(benchmarks) ? benchmarks.map(b => b.toJSON ? b.toJSON() : b) : [],
          input,
        });
        break;

      case 'market_timing':
        engineResult = marketTimingEngine.compute({
          snapshot: snapshotRow.toJSON(),
          benchmarks: Array.isArray(benchmarks) ? benchmarks.map(b => b.toJSON ? b.toJSON() : b) : [],
          input,
        });
        break;

      default: {
        const err = new Error(`Unknown engine type: ${engineType}`);
        err.statusCode = 400;
        err.errorCode = 'DRISHTI_INVALID_ENGINE';
        throw err;
      }
    }

    // ── 5. Save results (one row per sub-scenario) ──
    const savedResults = [];
    const scenarioResults = engineResult.scenarios || [];

    for (const scenario of scenarioResults) {
      const resultRow = await DrishtiScenarioResult.create({
        result_uuid: generateUUID(),
        run_id: run.id,
        scenario_label: scenario.label,
        projected_revenue: scenario.projections.total_revenue,
        projected_cost: scenario.projections.total_cost,
        projected_net_income: scenario.projections.net_farm_income,
        projected_roi_percent: scenario.projections.total_revenue > 0
          ? round2((scenario.projections.net_farm_income / scenario.projections.total_cost) * 100)
          : null,
        emi_to_income_ratio: scenario.projections.emi_to_income_ratio,
        breakeven_yield_kg: scenario.projections.breakeven_yield_kg_per_hectare,
        cash_flow_negative_months: scenario.cash_flow_summary
          ? scenario.cash_flow_summary.deficitMonths
          : 0,
        projected_health_status: scenario.projections.health_status,
        projected_sma_class: scenario.projections.sma_classification,
        income_adequacy_status: scenario.projections.income_adequacy,
        monthly_cashflow: scenario.monthly_cashflow,
        detailed_breakdown: {
          assumptions: scenario.assumptions,
          cash_flow_summary: scenario.cash_flow_summary,
        },
        risk_factors: engineResult.riskFactors,
        recommendations: engineResult.recommendations,
      });

      savedResults.push(resultRow);
    }

    // ── 6. Update run status ──
    const computationTimeMs = Date.now() - startTime;
    await run.update({
      status: 'completed',
      computation_time_ms: computationTimeMs,
    });

    logger.info(`DRISHTI: ${engineType} completed for farmer ${farmerId} in ${computationTimeMs}ms (${scenarioResults.length} scenarios)`);

    // ── 7. Format and return response ──
    const response = {
      run_uuid: runUuid,
      engine_type: engineType,
      snapshot_date: snapshotResult.snapshotDate,
      computation_time_ms: computationTimeMs,
      data_gaps: snapshotResult.dataGaps,
      farmer_summary: engineResult.farmerSummary || null,
      loan_terms: engineResult.loanTerms || null,
      scenarios: scenarioResults.map(s => ({
        label: s.label,
        label_key: s.label_key,
        description: s.description,
        assumptions: s.assumptions,
        projections: s.projections,
        monthly_cashflow: s.monthly_cashflow,
      })),
      insurance_comparison: engineResult.insuranceComparison || null,
      risk_factors: engineResult.riskFactors || [],
      recommendations: engineResult.recommendations || [],
    };

    // Engine-specific response fields
    if (engineType === 'market_timing') {
      response.commodity = engineResult.commodity;
      response.storage_parameters = engineResult.storageParameters;
      response.sell_now = engineResult.sellNow;
      response.storage_scenarios = engineResult.storageScenarios;
      response.price_trajectory = engineResult.priceTrajectory;
      response.monte_carlo = engineResult.monteCarlo;
      response.optimal_window = engineResult.optimalWindow;
      response.topup_loan_simulation = engineResult.topupLoanSimulation;
      response.price_comparison = engineResult.priceComparison;
    }
    if (engineType === 'insurance') {
      response.insurance_terms = engineResult.insuranceTerms;
      response.base_comparison = engineResult.baseComparison;
      response.stress_comparisons = engineResult.stressComparisons;
      response.five_year_analysis = engineResult.fiveYearAnalysis;
      response.break_even = engineResult.breakEven;
      response.monte_carlo = engineResult.monteCarlo;
      response.recommendation = engineResult.recommendation;
    }
    if (engineType === 'climate_stress') {
      response.climate_scenario = engineResult.climateScenario;
      response.impact_cascade = engineResult.impactCascade;
      response.monte_carlo = engineResult.monteCarlo;
    }
    if (engineType === 'household_portfolio') {
      response.household_profile = engineResult.householdProfile;
      response.income_summary = engineResult.incomeSummary;
      response.expense_summary = engineResult.expenseSummary;
      response.net_household_position = engineResult.netPosition;
      response.financial_resilience = engineResult.financialResilience;
      response.stress_scenarios = engineResult.stressScenarios;
      response.comparison_to_current = engineResult.comparisonToCurrent;
    }

    // Cache the formatted response
    try {
      await setWithTTL(`drishti:run:${runUuid}`, JSON.stringify(response), RESULT_CACHE_TTL);
    } catch (cacheErr) {
      logger.warn(`DRISHTI: result cache write failed: ${cacheErr.message}`);
    }

    return response;

  } catch (engineErr) {
    // Mark run as failed
    await run.update({
      status: 'failed',
      error_message: engineErr.message,
      computation_time_ms: Date.now() - startTime,
    });
    throw engineErr;
  }
};

// ─── Banker Portfolio (async via RabbitMQ — Phase 4) ────────────────

const runBankerPortfolio = async (input, userId) => {
  const { DrishtiPortfolioRun, DrishtiFarmerSnapshot } = getDb();
  const { SYNC_FARMER_LIMIT, computePortfolio } = require('./engines/bankerPortfolioEngine');

  logger.info(`DRISHTI: runBankerPortfolio by banker ${userId}`);

  const { scope, shock_variables, computation_mode, monte_carlo_runs } = input;

  // ── Resolve farmer IDs from scope ──
  let farmerIds = scope.farmer_ids;

  if (!farmerIds || farmerIds.length === 0) {
    // Query farmers matching scope filters
    const { LoanApplication } = getDb();
    const { Op } = require('sequelize');
    const where = { is_active: true, application_status: { [Op.in]: ['approved', 'disbursed', 'active'] } };

    // Join through farmer to address for district filtering
    if (scope.loan_product_id) where.loan_product_id = scope.loan_product_id;

    const loans = await LoanApplication.findAll({ where, attributes: ['farmer_id'], group: ['farmer_id'], limit: 1000 });
    farmerIds = loans.map(l => l.farmer_id);
  }

  if (farmerIds.length === 0) {
    const err = new Error('No farmers found matching the portfolio scope');
    err.statusCode = 400;
    err.errorCode = 'DRISHTI_EMPTY_PORTFOLIO';
    throw err;
  }

  // ── Create portfolio run record ──
  const portfolioRunUuid = generateUUID();
  const portfolioRun = await DrishtiPortfolioRun.create({
    portfolio_run_uuid: portfolioRunUuid,
    banker_id: userId,
    run_label: `Portfolio stress: ${JSON.stringify(shock_variables)}`,
    district_id: scope.district_id || null,
    block_id: scope.block_id || null,
    loan_product_id: scope.loan_product_id || null,
    farmer_count: farmerIds.length,
    farmer_ids: farmerIds,
    shock_variables,
    status: 'queued',
  });

  // ── Decide sync vs async ──
  if (farmerIds.length <= SYNC_FARMER_LIMIT) {
    // Synchronous: build snapshots and run inline
    try {
      await portfolioRun.update({ status: 'processing', started_at: new Date() });

      const farmerSnapshots = [];
      for (const farmerId of farmerIds) {
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
        } catch (snapErr) {
          logger.warn(`DRISHTI: portfolio snapshot failed for farmer ${farmerId}: ${snapErr.message}`);
        }
      }

      const result = computePortfolio({
        farmerSnapshots,
        shockVariables: shock_variables,
        computationMode: computation_mode || 'deterministic',
        monteCarloRuns: monte_carlo_runs || 500,
      });

      // Update portfolio run
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

      return {
        portfolio_run_uuid: portfolioRunUuid,
        status: 'completed',
        farmer_count: farmerIds.length,
        ...result.portfolioSummary,
        stress_impact: result.stressImpact,
        portfolio_var_95: result.portfolioVar95,
        intervention_list: result.interventionList,
        monte_carlo: result.monteCarlo,
        risk_factors: result.riskFactors,
        recommendations: result.recommendations,
      };
    } catch (err) {
      await portfolioRun.update({ status: 'failed', error_message: err.message, completed_at: new Date() });
      throw err;
    }
  } else {
    // Asynchronous: publish to RabbitMQ
    try {
      const { publishPortfolioJob } = require('./workers/portfolioSimulationConsumer');
      await publishPortfolioJob({
        portfolio_run_id: portfolioRun.id,
        banker_id: userId,
        farmer_ids: farmerIds,
        shock_variables,
        computation_mode: computation_mode || 'monte_carlo',
        monte_carlo_runs: monte_carlo_runs || 500,
      });

      return {
        portfolio_run_uuid: portfolioRunUuid,
        status: 'queued',
        farmer_count: farmerIds.length,
        estimated_completion_seconds: Math.round(farmerIds.length * 0.1),
        message: 'Portfolio simulation queued. You will be notified when complete.',
      };
    } catch (queueErr) {
      // Fallback: if RabbitMQ unavailable, mark as failed
      await portfolioRun.update({ status: 'failed', error_message: `Queue unavailable: ${queueErr.message}` });
      const err = new Error('Portfolio simulation could not be queued — RabbitMQ unavailable');
      err.statusCode = 503;
      err.errorCode = 'DRISHTI_QUEUE_UNAVAILABLE';
      throw err;
    }
  }
};

// ─── Scenario Queries ───────────────────────────────────────────────

const getScenarioByUuid = async (runUuid) => {
  // Check cache first
  try {
    const cached = await getKey(`drishti:run:${runUuid}`);
    if (cached) return JSON.parse(cached);
  } catch (_) { /* cache miss */ }

  const { DrishtiScenarioRun, DrishtiScenarioResult, DrishtiFarmerSnapshot } = getDb();
  const run = await DrishtiScenarioRun.findOne({
    where: { run_uuid: runUuid, is_active: true },
    include: [
      { model: DrishtiScenarioResult, as: 'results' },
      { model: DrishtiFarmerSnapshot, as: 'snapshot' },
    ],
  });

  if (!run) {
    const err = new Error('Scenario run not found');
    err.statusCode = 404;
    err.errorCode = 'DRISHTI_RUN_NOT_FOUND';
    throw err;
  }

  // Reconstruct response from stored data
  const response = {
    run_uuid: run.run_uuid,
    engine_type: run.engine_type,
    snapshot_date: run.snapshot ? run.snapshot.snapshot_date : null,
    status: run.status,
    computation_time_ms: run.computation_time_ms,
    created_at: run.created_at,
    scenarios: (run.results || []).map(r => ({
      label: r.scenario_label,
      projections: {
        total_revenue: parseFloat(r.projected_revenue) || 0,
        total_cost: parseFloat(r.projected_cost) || 0,
        net_farm_income: parseFloat(r.projected_net_income) || 0,
        emi_to_income_ratio: parseFloat(r.emi_to_income_ratio) || 0,
        breakeven_yield_kg_per_hectare: parseFloat(r.breakeven_yield_kg) || null,
        health_status: r.projected_health_status,
        sma_classification: r.projected_sma_class,
        income_adequacy: r.income_adequacy_status,
      },
      monthly_cashflow: r.monthly_cashflow,
      detailed_breakdown: r.detailed_breakdown,
    })),
    risk_factors: (run.results && run.results[0]) ? run.results[0].risk_factors : [],
    recommendations: (run.results && run.results[0]) ? run.results[0].recommendations : [],
  };

  return response;
};

const getScenariosByFarmer = async (farmerId, query = {}) => {
  const { DrishtiScenarioRun } = getDb();
  const { parsePagination, buildMeta } = require('../../../shared/utils/paginationHelper');
  const { page, limit, offset } = parsePagination(query);

  const where = { farmer_id: farmerId, is_active: true };
  if (query.engine_type) where.engine_type = query.engine_type;
  if (query.status) where.status = query.status;

  const { count, rows } = await DrishtiScenarioRun.findAndCountAll({
    where, limit, offset,
    order: [['created_at', 'DESC']],
    attributes: ['run_uuid', 'engine_type', 'status', 'computation_time_ms', 'initiator_role', 'created_at'],
  });

  const items = rows.map(r => ({
    runUuid: r.run_uuid,
    engineType: r.engine_type,
    status: r.status,
    computationTimeMs: r.computation_time_ms,
    initiatorRole: r.initiator_role,
    createdAt: r.created_at,
  }));

  return { items, meta: buildMeta(page, limit, count) };
};

// ─── Scenario Comparison ────────────────────────────────────────────

const compareScenarios = async (input, userId) => {
  const { DrishtiScenarioRun, DrishtiScenarioResult, DrishtiScenarioComparison } = getDb();
  const { run_uuids, comparison_label } = input;

  // Load all runs with results
  const runs = await DrishtiScenarioRun.findAll({
    where: { run_uuid: run_uuids, is_active: true },
    include: [{ model: DrishtiScenarioResult, as: 'results' }],
    order: [['created_at', 'ASC']],
  });

  if (runs.length < 2) {
    const err = new Error('At least 2 valid scenario runs required for comparison');
    err.statusCode = 400;
    err.errorCode = 'DRISHTI_COMPARISON_INSUFFICIENT';
    throw err;
  }

  // ── Extract key metrics from each run ──
  const scenarioMetrics = runs.map(run => {
    // Prefer 'base' or 'proposed' label, fall back to first result
    const baseResult = (run.results || []).find(r => r.scenario_label === 'base')
      || (run.results || []).find(r => r.scenario_label === 'proposed')
      || (run.results || [])[0];

    const stressResult = (run.results || []).find(r => r.scenario_label === 'stress');

    const metrics = baseResult ? {
      total_revenue: parseFloat(baseResult.projected_revenue) || 0,
      total_cost: parseFloat(baseResult.projected_cost) || 0,
      net_income: parseFloat(baseResult.projected_net_income) || 0,
      roi_pct: parseFloat(baseResult.projected_roi_percent) || 0,
      emi_to_income_ratio: parseFloat(baseResult.emi_to_income_ratio) || 0,
      breakeven_yield_kg: parseFloat(baseResult.breakeven_yield_kg) || null,
      cash_flow_negative_months: baseResult.cash_flow_negative_months || 0,
      health_status: baseResult.projected_health_status || 'unknown',
      sma_class: baseResult.projected_sma_class || 'standard',
      income_adequacy: baseResult.income_adequacy_status || 'unknown',
      risk_score: null,
    } : null;

    // Try to extract risk_score and resilience from detailed_breakdown
    if (baseResult && baseResult.detailed_breakdown) {
      const bd = baseResult.detailed_breakdown;
      if (bd.cash_flow_summary) {
        metrics.deficit_months = bd.cash_flow_summary.deficitMonths || 0;
        metrics.working_capital_gap = bd.cash_flow_summary.workingCapitalGap || 0;
        metrics.farm_income_pct = bd.cash_flow_summary.farmIncomePct || null;
        metrics.non_farm_income_pct = bd.cash_flow_summary.nonFarmIncomePct || null;
      }
    }

    const stressMetrics = stressResult ? {
      stress_net_income: parseFloat(stressResult.projected_net_income) || 0,
      stress_health_status: stressResult.projected_health_status || 'unknown',
    } : null;

    return {
      run_uuid: run.run_uuid,
      engine_type: run.engine_type,
      created_at: run.created_at,
      input_summary: summarizeInput(run.input_variables, run.engine_type),
      metrics,
      stress_metrics: stressMetrics,
    };
  });

  // ── Compute deltas (all scenarios vs first as baseline) ──
  const baseline = scenarioMetrics[0];
  const deltas = scenarioMetrics.slice(1).map(scenario => {
    if (!baseline.metrics || !scenario.metrics) return { run_uuid: scenario.run_uuid, deltas: null };

    const bm = baseline.metrics;
    const sm = scenario.metrics;

    return {
      run_uuid: scenario.run_uuid,
      vs_baseline_uuid: baseline.run_uuid,
      deltas: {
        net_income: { absolute: round2(sm.net_income - bm.net_income), pct: bm.net_income !== 0 ? round2(((sm.net_income - bm.net_income) / Math.abs(bm.net_income)) * 100) : null, direction: sm.net_income > bm.net_income ? 'better' : sm.net_income < bm.net_income ? 'worse' : 'same' },
        total_revenue: { absolute: round2(sm.total_revenue - bm.total_revenue), pct: bm.total_revenue > 0 ? round2(((sm.total_revenue - bm.total_revenue) / bm.total_revenue) * 100) : null },
        total_cost: { absolute: round2(sm.total_cost - bm.total_cost), pct: bm.total_cost > 0 ? round2(((sm.total_cost - bm.total_cost) / bm.total_cost) * 100) : null, direction: sm.total_cost < bm.total_cost ? 'better' : sm.total_cost > bm.total_cost ? 'worse' : 'same' },
        emi_to_income_ratio: { absolute: round2(sm.emi_to_income_ratio - bm.emi_to_income_ratio), direction: sm.emi_to_income_ratio < bm.emi_to_income_ratio ? 'better' : sm.emi_to_income_ratio > bm.emi_to_income_ratio ? 'worse' : 'same' },
        deficit_months: { absolute: (sm.deficit_months || 0) - (bm.deficit_months || 0), direction: (sm.deficit_months || 0) < (bm.deficit_months || 0) ? 'better' : (sm.deficit_months || 0) > (bm.deficit_months || 0) ? 'worse' : 'same' },
        health_status_change: bm.health_status !== sm.health_status ? `${bm.health_status} → ${sm.health_status}` : 'no_change',
      },
    };
  });

  // ── Pairwise trade-off highlights ──
  const tradeoffs = identifyTradeoffs(scenarioMetrics);

  // ── Determine recommendation ──
  let recommendedRunId = null;
  let bestScore = -Infinity;
  for (const run of runs) {
    const sm = scenarioMetrics.find(s => s.run_uuid === run.run_uuid);
    if (!sm || !sm.metrics) continue;
    const m = sm.metrics;
    // Composite: income + health bonus - risk penalty
    const healthBonus = m.health_status === 'good' ? 15000 : m.health_status === 'watch' ? 5000 : 0;
    const emiPenalty = m.emi_to_income_ratio > 0.4 ? 10000 : 0;
    const score = m.net_income + healthBonus - emiPenalty;
    if (score > bestScore) { bestScore = score; recommendedRunId = run.id; }
  }

  const recommendedUuid = recommendedRunId ? runs.find(r => r.id === recommendedRunId)?.run_uuid : null;

  // ── Persist ──
  const comparisonUuid = generateUUID();
  const fullSummary = { scenarios: scenarioMetrics, deltas, tradeoffs, recommended_run_uuid: recommendedUuid };

  const comparison = await DrishtiScenarioComparison.create({
    comparison_uuid: comparisonUuid,
    farmer_id: runs[0].farmer_id,
    comparison_label: comparison_label || `Comparison of ${runs.length} scenarios`,
    run_ids: runs.map(r => r.id),
    comparison_summary: fullSummary,
    recommended_run_id: recommendedRunId,
  });

  return {
    comparison_uuid: comparisonUuid,
    comparison_label: comparison.comparison_label,
    scenarios: scenarioMetrics,
    deltas,
    tradeoffs,
    recommended_run_uuid: recommendedUuid,
    recommendation_reasoning: recommendedUuid
      ? `Scenario ${recommendedUuid} offers the best balance of income, loan safety, and risk`
      : null,
  };
};

const getComparison = async (compUuid) => {
  const { DrishtiScenarioComparison } = getDb();
  const comparison = await DrishtiScenarioComparison.findOne({
    where: { comparison_uuid: compUuid, is_active: true },
  });
  if (!comparison) {
    const err = new Error('Comparison not found');
    err.statusCode = 404;
    err.errorCode = 'DRISHTI_COMPARISON_NOT_FOUND';
    throw err;
  }

  const summary = comparison.comparison_summary || {};
  return {
    comparison_uuid: comparison.comparison_uuid,
    comparison_label: comparison.comparison_label,
    scenarios: summary.scenarios || [],
    deltas: summary.deltas || [],
    tradeoffs: summary.tradeoffs || [],
    recommended_run_uuid: summary.recommended_run_uuid || null,
    created_at: comparison.created_at,
  };
};

// ─── Shareable Summary ──────────────────────────────────────────────

/**
 * Generate a shareable text summary of a scenario run.
 * Designed for Sathi → farmer sharing via WhatsApp/SMS.
 */
const getShareableSummary = async (runUuid, options = {}) => {
  const { DrishtiScenarioRun, DrishtiScenarioResult, DrishtiFarmerSnapshot, User } = getDb();
  const { language = 'en', sendSms = false, recipientPhone = null } = options;

  const run = await DrishtiScenarioRun.findOne({
    where: { run_uuid: runUuid, is_active: true },
    include: [
      { model: DrishtiScenarioResult, as: 'results' },
      { model: DrishtiFarmerSnapshot, as: 'snapshot' },
    ],
  });

  if (!run) {
    const err = new Error('Scenario run not found');
    err.statusCode = 404;
    err.errorCode = 'DRISHTI_RUN_NOT_FOUND';
    throw err;
  }

  // Build the summary text
  const summary = buildShareableText(run, language);

  // Optionally send via SMS
  let smsResult = null;
  if (sendSms && recipientPhone) {
    try {
      const { sendSMS } = require('../../../shared/services/smsService');
      smsResult = await sendSMS({ to: recipientPhone, message: summary.smsText });
    } catch (smsErr) {
      logger.warn(`DRISHTI: SMS send failed for run ${runUuid}: ${smsErr.message}`);
      smsResult = { success: false, error: smsErr.message };
    }
  }

  return {
    run_uuid: runUuid,
    engine_type: run.engine_type,
    summary_text: summary.fullText,
    sms_text: summary.smsText,
    whatsapp_text: summary.whatsappText,
    key_metrics: summary.keyMetrics,
    sms_result: smsResult,
    share_url: null, // Future: deep link to app
  };
};

/**
 * Build human-readable summary text from a scenario run.
 */
const buildShareableText = (run, language) => {
  const baseResult = (run.results || []).find(r => r.scenario_label === 'base')
    || (run.results || []).find(r => r.scenario_label === 'proposed')
    || (run.results || [])[0];

  const stressResult = (run.results || []).find(r => r.scenario_label === 'stress');

  const engineLabels = {
    pre_loan: 'Loan Analysis',
    household_portfolio: 'Household Portfolio',
    climate_stress: 'Climate Stress Test',
    insurance: 'Insurance Analysis',
    market_timing: 'Market Timing',
    banker_portfolio: 'Portfolio Stress Test',
  };

  const engineLabel = engineLabels[run.engine_type] || run.engine_type;
  const date = new Date(run.created_at).toLocaleDateString('en-IN');

  // Key metrics for structured sharing
  const keyMetrics = {};

  if (baseResult) {
    keyMetrics.projected_income = formatINR(baseResult.projected_net_income);
    keyMetrics.total_revenue = formatINR(baseResult.projected_revenue);
    keyMetrics.total_cost = formatINR(baseResult.projected_cost);
    keyMetrics.health_status = baseResult.projected_health_status;
    keyMetrics.income_adequacy = baseResult.income_adequacy_status;

    if (baseResult.emi_to_income_ratio) {
      keyMetrics.emi_burden = `${Math.round(parseFloat(baseResult.emi_to_income_ratio) * 100)}%`;
    }
    if (baseResult.breakeven_yield_kg) {
      keyMetrics.breakeven_yield = `${Math.round(parseFloat(baseResult.breakeven_yield_kg))} kg/ha`;
    }
  }

  // SMS text (160 char limit)
  const income = baseResult ? formatINR(baseResult.projected_net_income) : '?';
  const health = baseResult ? baseResult.projected_health_status : '?';
  const smsText = `FarmerPay DRISHTI: ${engineLabel} result — Net income: ${income}, Health: ${health}. Open app for full details.`;

  // WhatsApp text (richer formatting)
  const lines = [
    `🌾 *FarmerPay DRISHTI — ${engineLabel}*`,
    `📅 ${date}`,
    '',
  ];

  if (baseResult) {
    lines.push(`💰 *Projected Net Income:* ${formatINR(baseResult.projected_net_income)}`);
    lines.push(`📊 Revenue: ${formatINR(baseResult.projected_revenue)} | Cost: ${formatINR(baseResult.projected_cost)}`);
    lines.push(`❤️ Health: ${(baseResult.projected_health_status || 'N/A').toUpperCase()}`);

    if (baseResult.emi_to_income_ratio) {
      const emiPct = Math.round(parseFloat(baseResult.emi_to_income_ratio) * 100);
      lines.push(`📋 EMI Burden: ${emiPct}% of income`);
    }

    if (baseResult.cash_flow_negative_months > 0) {
      lines.push(`⚠️ ${baseResult.cash_flow_negative_months} months with negative cash flow`);
    }
  }

  if (stressResult) {
    lines.push('');
    lines.push(`🌧️ *Under Stress:* Income ${formatINR(stressResult.projected_net_income)}, Health: ${(stressResult.projected_health_status || 'N/A').toUpperCase()}`);
  }

  // Recommendations from first result
  if (baseResult && baseResult.recommendations) {
    const recs = Array.isArray(baseResult.recommendations) ? baseResult.recommendations : [];
    const topRecs = recs.filter(r => r.type === 'verdict' || r.type === 'action').slice(0, 2);
    if (topRecs.length > 0) {
      lines.push('');
      lines.push('💡 *Recommendations:*');
      for (const rec of topRecs) {
        lines.push(`• ${rec.message}`);
      }
    }
  }

  lines.push('');
  lines.push('_Generated by FarmerPay DRISHTI_');

  const whatsappText = lines.join('\n');
  const fullText = lines.map(l => l.replace(/\*/g, '').replace(/[🌾📅💰📊❤️📋⚠️🌧️💡_]/g, '')).join('\n').trim();

  return { fullText, smsText, whatsappText, keyMetrics };
};

// ─── Comparison Helpers ─────────────────────────────────────────────

const identifyTradeoffs = (scenarioMetrics) => {
  const tradeoffs = [];
  if (scenarioMetrics.length < 2) return tradeoffs;

  for (let i = 0; i < scenarioMetrics.length; i++) {
    for (let j = i + 1; j < scenarioMetrics.length; j++) {
      const a = scenarioMetrics[i];
      const b = scenarioMetrics[j];
      if (!a.metrics || !b.metrics) continue;

      const pair = { run_a: a.run_uuid, run_b: b.run_uuid, tradeoffs: [] };

      // Higher income but higher risk
      if (a.metrics.net_income > b.metrics.net_income && (a.metrics.emi_to_income_ratio || 0) > (b.metrics.emi_to_income_ratio || 0)) {
        pair.tradeoffs.push({ type: 'income_vs_risk', description: `${a.run_uuid.slice(0, 8)} has higher income but higher EMI burden` });
      }
      if (b.metrics.net_income > a.metrics.net_income && (b.metrics.emi_to_income_ratio || 0) > (a.metrics.emi_to_income_ratio || 0)) {
        pair.tradeoffs.push({ type: 'income_vs_risk', description: `${b.run_uuid.slice(0, 8)} has higher income but higher EMI burden` });
      }

      // Better health but lower income
      const healthOrder = { good: 3, watch: 2, stressed: 1, npa: 0 };
      const aHealth = healthOrder[a.metrics.health_status] ?? 1;
      const bHealth = healthOrder[b.metrics.health_status] ?? 1;
      if (aHealth > bHealth && a.metrics.net_income < b.metrics.net_income) {
        pair.tradeoffs.push({ type: 'safety_vs_income', description: `${a.run_uuid.slice(0, 8)} is safer but earns less` });
      }
      if (bHealth > aHealth && b.metrics.net_income < a.metrics.net_income) {
        pair.tradeoffs.push({ type: 'safety_vs_income', description: `${b.run_uuid.slice(0, 8)} is safer but earns less` });
      }

      // More deficit months but higher income
      if ((a.metrics.deficit_months || 0) > (b.metrics.deficit_months || 0) && a.metrics.net_income > b.metrics.net_income) {
        pair.tradeoffs.push({ type: 'cash_flow_vs_income', description: `${a.run_uuid.slice(0, 8)} earns more but has more cash flow gaps` });
      }

      if (pair.tradeoffs.length > 0) tradeoffs.push(pair);
    }
  }

  return tradeoffs;
};

const summarizeInput = (inputVars, engineType) => {
  if (!inputVars) return null;
  const s = {};
  if (engineType === 'pre_loan') {
    s.loan_amount = inputVars.loan_amount;
    s.activity_type = inputVars.activity?.type;
    s.crop_id = inputVars.activity?.crop_id;
  } else if (engineType === 'household_portfolio') {
    const fa = inputVars.proposed_farm_activities || {};
    s.crops = fa.crops?.length || 0;
    s.has_dairy = !!fa.dairy;
    s.has_fishery = !!fa.fishery;
  } else if (engineType === 'climate_stress') {
    s.rainfall_deviation = inputVars.climate_scenario?.rainfall_deviation_pct;
    s.temperature_deviation = inputVars.climate_scenario?.temperature_deviation_celsius;
  } else if (engineType === 'insurance') {
    s.insurance_type = inputVars.insurance_type;
    s.sum_insured = inputVars.sum_insured;
  } else if (engineType === 'market_timing') {
    s.commodity_id = inputVars.commodity_id;
    s.quantity_quintals = inputVars.quantity_quintals;
  }
  return s;
};

const formatINR = (amount) => {
  const num = parseFloat(amount) || 0;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${Math.round(num)}`;
};

// ─── Templates ──────────────────────────────────────────────────────

const getTemplates = async (query = {}) => {
  const { DrishtiScenarioTemplate } = getDb();
  const { parsePagination, buildMeta } = require('../../../shared/utils/paginationHelper');
  const { page, limit, offset } = parsePagination(query);

  const where = { is_active: true };
  const { count, rows } = await DrishtiScenarioTemplate.findAndCountAll({
    where, limit, offset,
    order: [['display_order', 'ASC']],
  });

  return { items: rows, meta: buildMeta(page, limit, count) };
};

const getTemplatesByEngine = async (engineType) => {
  const { DrishtiScenarioTemplate } = getDb();
  const templates = await DrishtiScenarioTemplate.findAll({
    where: { engine_type: engineType, is_active: true },
    order: [['display_order', 'ASC']],
  });
  return templates;
};

// ─── Portfolio Runs ─────────────────────────────────────────────────

const getPortfolioRun = async (runUuid) => {
  const { DrishtiPortfolioRun } = getDb();
  const run = await DrishtiPortfolioRun.findOne({
    where: { portfolio_run_uuid: runUuid, is_active: true },
  });
  if (!run) {
    const err = new Error('Portfolio run not found');
    err.statusCode = 404;
    err.errorCode = 'DRISHTI_PORTFOLIO_NOT_FOUND';
    throw err;
  }
  return {
    portfolio_run_uuid: run.portfolio_run_uuid,
    status: run.status,
    farmer_count: run.farmer_count,
    progress_pct: run.progress_pct,
    started_at: run.started_at,
    completed_at: run.completed_at,
    total_portfolio_outstanding: parseFloat(run.total_portfolio_outstanding) || 0,
    projected_npa_count: run.projected_npa_count,
    projected_npa_amount: parseFloat(run.projected_npa_amount) || 0,
    projected_sma_migration: run.projected_sma_migration,
    farmers_needing_intervention: run.farmers_needing_intervention,
    portfolio_var_95: parseFloat(run.portfolio_var_95) || 0,
  };
};

const getPortfolioRunFarmers = async (runUuid, query = {}) => {
  const { DrishtiPortfolioRun, DrishtiScenarioRun, DrishtiScenarioResult } = getDb();
  const { parsePagination, buildMeta } = require('../../../shared/utils/paginationHelper');
  const { page, limit, offset } = parsePagination(query);

  const portfolioRun = await DrishtiPortfolioRun.findOne({
    where: { portfolio_run_uuid: runUuid, is_active: true },
  });
  if (!portfolioRun) {
    const err = new Error('Portfolio run not found');
    err.statusCode = 404;
    err.errorCode = 'DRISHTI_PORTFOLIO_NOT_FOUND';
    throw err;
  }

  const { count, rows } = await DrishtiScenarioRun.findAndCountAll({
    where: { portfolio_run_id: portfolioRun.id, is_active: true },
    include: [{ model: DrishtiScenarioResult, as: 'results' }],
    limit, offset,
    order: [['created_at', 'ASC']],
  });

  const items = rows.map(run => ({
    run_uuid: run.run_uuid,
    farmer_id: run.farmer_id,
    status: run.status,
    results: (run.results || []).map(r => ({
      label: r.scenario_label,
      projected_net_income: parseFloat(r.projected_net_income) || 0,
      health_status: r.projected_health_status,
      sma_class: r.projected_sma_class,
    })),
  }));

  return { items, meta: buildMeta(page, limit, count) };
};

// ─── Helpers ────────────────────────────────────────────────────────

const mapRole = (role) => {
  const roleMap = {
    FARMER: 'farmer',
    AGENT: 'sathi',
    BANK_OFFICER: 'banker',
    ADMIN: 'admin',
  };
  return roleMap[role] || 'farmer';
};

const round2 = (n) => Math.round((n || 0) * 100) / 100;

module.exports = {
  runScenario,
  runBankerPortfolio,
  getScenarioByUuid,
  getScenariosByFarmer,
  compareScenarios,
  getComparison,
  getShareableSummary,
  getTemplates,
  getTemplatesByEngine,
  getPortfolioRun,
  getPortfolioRunFarmers,
};
