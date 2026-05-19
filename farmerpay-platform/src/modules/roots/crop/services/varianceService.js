/**
 * Variance Computation Service — Core engine for ROOTS ERP compliance scoring.
 *
 * Computes per-workband and per-cycle compliance across 4 dimensions:
 *   1. Timing   — actual execution date vs PoP sowing-window schedule
 *   2. Quantity  — actual input usage vs PoP recommended quantities
 *   3. Cost      — actual spend vs PopCostBenchmark / ScaleOfFinance
 *   4. Practice  — task completion, input substitution, skip detection
 *
 * Produces a RootsComplianceSnapshot per cycle, consumed by:
 *   - Banker dashboard (compliance heatmap)
 *   - TRUST module (credit scoring pillar)
 *   - SENTINEL module (red flag generation)
 *
 * All scores are 0-100. Weights are configurable per workband criticality.
 */

const { Op } = require('sequelize');
const logger = require('../../../../shared/utils/logger');
const { generateUUID } = require('../../../../shared/utils/uuidHelper');

let db;
const getDb = () => { if (!db) db = require('../../../../shared/models'); return db; };

const MS_PER_DAY = 86400000;

/* ──────────────────── Workband Criticality Weights ──────────────────── */

const WORKBAND_CRITICALITY = {
  sowing: 3, fertilization: 3, harvest: 3, harvesting: 3,
  pest: 2, 'pest management': 2, irrigation: 2, 'water management': 2,
  weeding: 1, thinning: 1, 'land preparation': 1, nursery: 1,
};

const getWorkbandWeight = (workbandName) => {
  if (!workbandName) return 1;
  const lower = workbandName.toLowerCase();
  for (const [key, weight] of Object.entries(WORKBAND_CRITICALITY)) {
    if (lower.includes(key)) return weight;
  }
  return 1;
};

/* ──────────────────── Dimension Weights ──────────────────── */

const DIMENSION_WEIGHTS = { timing: 0.30, quantity: 0.25, cost: 0.15, practice: 0.30 };

/* ──────────────────── Confidence Thresholds ──────────────────── */

const getConfidenceMultiplier = (dataCompletenessPct) => {
  if (dataCompletenessPct >= 80) return 1.0;
  if (dataCompletenessPct >= 60) return 0.8;
  if (dataCompletenessPct >= 40) return 0.6;
  return 0; // don't score below 40% completeness
};

/* ──────────────────── Date Helpers ──────────────────── */

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const diffDays = (a, b) => {
  const da = new Date(a);
  const db = new Date(b);
  return Math.round((da - db) / MS_PER_DAY);
};

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/* ====================================================================
 * 1. computeTimingVariance
 * ==================================================================== */

/**
 * Compute timing compliance for a single workband execution against its PoP window.
 *
 * @param {Object|null} workbandExecution - WorkbandExecution record (null if not started)
 * @param {Object} popWorkband - PopWorkband with days_from_sowing_start, days_from_sowing_end
 * @param {string|Date} sowingDate - CultivationCycle.cycle_sowing_date
 * @returns {{ type: string, classification: string, score: number, days_off: number, direction: string }}
 */
const computeTimingVariance = (workbandExecution, popWorkband, sowingDate) => {
  if (!sowingDate || !popWorkband) {
    return { type: 'timing', classification: 'UNKNOWN', score: 0, days_off: null, direction: 'unknown' };
  }

  const windowStart = addDays(sowingDate, popWorkband.days_from_sowing_start || 0);
  const windowEnd = addDays(sowingDate, popWorkband.days_from_sowing_end || popWorkband.days_from_sowing_start || 0);

  // No execution yet
  if (!workbandExecution || !workbandExecution.workband_start_date) {
    const now = today();
    const missedDeadline = addDays(windowEnd, 14);
    if (now > missedDeadline) {
      return { type: 'timing', classification: 'MISSED', score: 0, days_off: diffDays(now, windowEnd), direction: 'missed' };
    }
    // Still within grace period — not yet scorable
    return { type: 'timing', classification: 'PENDING', score: null, days_off: 0, direction: 'on_time' };
  }

  const actualDate = new Date(workbandExecution.workband_start_date);

  // Within window
  if (actualDate >= windowStart && actualDate <= windowEnd) {
    return { type: 'timing', classification: 'ON_TIME', score: 100, days_off: 0, direction: 'on_time' };
  }

  // Calculate deviation
  const daysOff = actualDate < windowStart
    ? diffDays(windowStart, actualDate)
    : diffDays(actualDate, windowEnd);
  const direction = actualDate < windowStart ? 'early' : 'late';

  let classification, score;
  if (daysOff <= 7) {
    classification = 'SLIGHT'; score = 75;
  } else if (daysOff <= 14) {
    classification = 'MODERATE'; score = 40;
  } else {
    classification = 'SEVERE'; score = 10;
  }

  return { type: 'timing', classification, score, days_off: daysOff, direction };
};

/* ====================================================================
 * 2. computeQuantityVariance
 * ==================================================================== */

/**
 * Compare actual input usage against PoP recommendations.
 *
 * @param {Object[]} taskExecutionInputLogs - TaskExecutionInputLog records with input_item_id, quantity_used
 * @param {Object[]} popTaskInputs - PopTaskInput records with input_item_id, input_quantity
 * @returns {Array<{ type: string, input_item_id: string, input_name: string, variance_pct: number, classification: string, score: number }>}
 */
const computeQuantityVariance = (taskExecutionInputLogs, popTaskInputs) => {
  if (!popTaskInputs || popTaskInputs.length === 0) return [];

  // Aggregate actual usage per input_item_id
  const actualByInput = {};
  (taskExecutionInputLogs || []).forEach((log) => {
    if (!log.input_item_id) return;
    const key = log.input_item_id;
    actualByInput[key] = (actualByInput[key] || 0) + parseFloat(log.quantity_used || 0);
  });

  return popTaskInputs.map((popInput) => {
    const inputItemId = popInput.input_item_id;
    const recommended = parseFloat(popInput.input_quantity || 0);
    const inputName = popInput.inputItem?.item_name || popInput.input_name || inputItemId;
    const actual = actualByInput[inputItemId];

    // No data entered for this input
    if (actual === undefined || actual === null) {
      return {
        type: 'quantity', input_item_id: inputItemId, input_name: inputName,
        variance_pct: null, classification: 'MISSING', score: 0,
      };
    }

    // No recommended quantity to compare
    if (!recommended || recommended <= 0) {
      return {
        type: 'quantity', input_item_id: inputItemId, input_name: inputName,
        variance_pct: null, classification: 'NO_BENCHMARK', score: 50,
      };
    }

    const variancePct = ((actual - recommended) / recommended) * 100;
    const absVariancePct = Math.abs(variancePct);

    let classification, score;
    if (absVariancePct <= 10) {
      classification = 'COMPLIANT'; score = 100;
    } else if (absVariancePct <= 25) {
      classification = 'MILD'; score = 75;
    } else if (absVariancePct <= 50) {
      classification = 'MODERATE'; score = 40;
    } else {
      classification = 'SEVERE'; score = 10;
    }

    return {
      type: 'quantity', input_item_id: inputItemId, input_name: inputName,
      variance_pct: Math.round(variancePct * 100) / 100, classification, score,
    };
  });
};

/* ====================================================================
 * 3. computeCostVariance
 * ==================================================================== */

/**
 * Compare actual costs against PopCostBenchmark for a given area.
 *
 * @param {number} actualCosts - Total actual cost for the workband/cycle
 * @param {Object} popCostBenchmark - PopCostBenchmark record with estimated_cost_per_hectare
 * @param {number} areaHectares - Field area in hectares
 * @returns {{ type: string, variance_pct: number, classification: string, score: number, actual: number, benchmark: number }}
 */
const computeCostVariance = (actualCosts, popCostBenchmark, areaHectares) => {
  const actual = parseFloat(actualCosts || 0);

  if (!popCostBenchmark || !popCostBenchmark.estimated_cost_per_hectare || !areaHectares) {
    return {
      type: 'cost', variance_pct: null, classification: 'NO_BENCHMARK',
      score: 50, actual, benchmark: null,
    };
  }

  const benchmark = parseFloat(popCostBenchmark.estimated_cost_per_hectare) * parseFloat(areaHectares);

  if (benchmark <= 0) {
    return {
      type: 'cost', variance_pct: null, classification: 'NO_BENCHMARK',
      score: 50, actual, benchmark: 0,
    };
  }

  const variancePct = ((actual - benchmark) / benchmark) * 100;
  const absVariancePct = Math.abs(variancePct);

  let classification, score;
  if (absVariancePct <= 10) {
    classification = 'COMPLIANT'; score = 100;
  } else if (absVariancePct <= 25) {
    classification = 'MILD'; score = 75;
  } else if (absVariancePct <= 50) {
    classification = 'MODERATE'; score = 40;
  } else {
    classification = 'SEVERE'; score = 10;
  }

  return {
    type: 'cost',
    variance_pct: Math.round(variancePct * 100) / 100,
    classification, score, actual,
    benchmark: Math.round(benchmark * 100) / 100,
  };
};

/* ====================================================================
 * 4. computePracticeVariance
 * ==================================================================== */

/**
 * Check task execution status and detect input substitutions.
 *
 * @param {Object[]} taskExecutions - TaskExecution records with popTask includes
 * @param {Object[]} popTasks - PopTask records (template)
 * @returns {Array<{ type: string, task_name: string, status: string, score: number, substitutions: Object[] }>}
 */
const computePracticeVariance = (taskExecutions, popTasks) => {
  if (!popTasks || popTasks.length === 0) return [];

  const execByPopTaskId = {};
  (taskExecutions || []).forEach((te) => {
    if (te.pop_task_id) execByPopTaskId[te.pop_task_id] = te;
  });

  return popTasks.map((popTask) => {
    const taskName = popTask.task_name || `Task #${popTask.id}`;
    const exec = execByPopTaskId[popTask.id];

    if (!exec) {
      // Optional tasks are less severe when missed
      const isOptional = popTask.is_optional;
      return {
        type: 'practice', task_name: taskName,
        status: isOptional ? 'SKIPPED' : 'MISSED',
        score: isOptional ? 60 : 0,
        substitutions: [],
      };
    }

    // Check input substitutions
    const substitutions = [];
    const popInputs = popTask.popTaskInputs || [];
    const actualLogs = exec.inputLogs || exec.taskExecutionInputLogs || [];

    popInputs.forEach((popInput) => {
      const matchingLog = actualLogs.find(
        (log) => log.input_item_id === popInput.input_item_id
      );
      if (matchingLog) return; // exact match, no substitution

      // Check if a different input was used instead
      const substitutedLog = actualLogs.find(
        (log) => log.input_item_id && log.input_item_id !== popInput.input_item_id
      );
      if (substitutedLog) {
        substitutions.push({
          expected_input_id: popInput.input_item_id,
          actual_input_id: substitutedLog.input_item_id,
          expected_name: popInput.inputItem?.item_name || popInput.input_item_id,
          actual_name: substitutedLog.input_name || substitutedLog.input_item_id,
        });
      }
    });

    // Determine status
    let status, score;
    if (exec.task_status === 'completed') {
      if (substitutions.length > 0) {
        status = 'SUBSTITUTED'; score = 60;
      } else {
        status = 'COMPLIANT'; score = 100;
      }
    } else if (exec.task_status === 'in_progress' || exec.task_status === 'delayed') {
      status = 'PARTIAL';
      score = Math.max(20, Math.min(80, (exec.task_completion_percentage || 0)));
    } else if (exec.task_status === 'skipped') {
      status = 'SKIPPED'; score = popTask.is_optional ? 60 : 10;
    } else {
      // planned but not started
      status = 'MISSED'; score = 0;
    }

    return { type: 'practice', task_name: taskName, status, score, substitutions };
  });
};

/* ====================================================================
 * 5. computeWorkbandScore
 * ==================================================================== */

/**
 * Compute weighted workband-level compliance score from 4 dimension results.
 *
 * @param {{ score: number|null }} timingVar
 * @param {Array<{ score: number }>} quantityVars
 * @param {{ score: number }} costVar
 * @param {Array<{ score: number }>} practiceVars
 * @returns {{ workband_score: number, timing_score: number, quantity_score: number, cost_score: number, practice_score: number }}
 */
const computeWorkbandScore = (timingVar, quantityVars, costVar, practiceVars) => {
  const timingScore = (timingVar && timingVar.score !== null) ? timingVar.score : null;

  // Average quantity scores, ignoring MISSING entries for average but tracking them
  const scoredQuantity = (quantityVars || []).filter((q) => q.score !== null && q.classification !== 'MISSING');
  const quantityScore = scoredQuantity.length > 0
    ? scoredQuantity.reduce((sum, q) => sum + q.score, 0) / scoredQuantity.length
    : null;

  const costScore = costVar ? costVar.score : null;

  const scoredPractice = (practiceVars || []).filter((p) => p.score !== null);
  const practiceScore = scoredPractice.length > 0
    ? scoredPractice.reduce((sum, p) => sum + p.score, 0) / scoredPractice.length
    : null;

  // Build weighted score, redistributing weight of unavailable dimensions
  const dimensions = [
    { key: 'timing', score: timingScore, weight: DIMENSION_WEIGHTS.timing },
    { key: 'quantity', score: quantityScore, weight: DIMENSION_WEIGHTS.quantity },
    { key: 'cost', score: costScore, weight: DIMENSION_WEIGHTS.cost },
    { key: 'practice', score: practiceScore, weight: DIMENSION_WEIGHTS.practice },
  ];

  const available = dimensions.filter((d) => d.score !== null);
  if (available.length === 0) {
    return { workband_score: null, timing_score: null, quantity_score: null, cost_score: null, practice_score: null };
  }

  const totalAvailableWeight = available.reduce((sum, d) => sum + d.weight, 0);
  const workbandScore = available.reduce(
    (sum, d) => sum + d.score * (d.weight / totalAvailableWeight), 0
  );

  return {
    workband_score: Math.round(workbandScore * 100) / 100,
    timing_score: timingScore !== null ? Math.round(timingScore * 100) / 100 : null,
    quantity_score: quantityScore !== null ? Math.round(quantityScore * 100) / 100 : null,
    cost_score: costScore !== null ? Math.round(costScore * 100) / 100 : null,
    practice_score: practiceScore !== null ? Math.round(practiceScore * 100) / 100 : null,
  };
};

/* ====================================================================
 * 6. computeCycleComplianceScore
 * ==================================================================== */

/**
 * Main orchestration method. Fetches all data for a cycle, computes all variances,
 * applies workband criticality weights, data completeness adjustment, and upserts
 * a RootsComplianceSnapshot.
 *
 * @param {number|string} cycleId - CultivationCycle.id or cycle_uuid
 * @returns {Object} Full compliance snapshot
 */
const computeCycleComplianceScore = async (cycleId) => {
  const {
    CultivationCycle, WorkbandExecution, TaskExecution, PopWorkband, PopTask,
    PopTaskInput, PopCostBenchmark, TaskExecutionInputLog, InputItem, InputUnit,
    Field, SoilHealthRecord, RootsComplianceSnapshot, sequelize,
  } = getDb();

  const t = await sequelize.transaction();

  try {
    // ── 1. Load cultivation cycle ──
    const cycle = await CultivationCycle.findOne({
      where: typeof cycleId === 'number'
        ? { id: cycleId, is_active: true }
        : { cycle_uuid: cycleId, is_active: true },
      transaction: t,
    });

    if (!cycle) {
      await t.rollback();
      const err = new Error('Cultivation cycle not found');
      err.statusCode = 404; err.errorCode = 'CYCLE_NOT_FOUND';
      throw err;
    }

    const sowingDate = cycle.cycle_sowing_date;
    const farmerId = cycle.farmer_id;
    const fieldId = cycle.field_id;
    const popId = cycle.pop_id;

    // ── 2. Load workband executions with full join chain ──
    const workbandExecutions = await WorkbandExecution.findAll({
      where: { cycle_id: cycle.cycle_uuid, is_active: true },
      include: [
        {
          model: TaskExecution, as: 'taskExecutions', required: false,
          where: { is_active: true },
          include: [
            {
              model: PopTask, as: 'popTask', required: false,
              include: [{
                model: PopTaskInput, as: 'popTaskInputs', required: false,
                include: [
                  { model: InputItem, as: 'inputItem', required: false },
                  { model: InputUnit, as: 'inputUnit', required: false },
                ],
              }],
            },
            {
              model: TaskExecutionInputLog, as: 'taskExecutionInputLogs', required: false,
              where: { is_active: true },
            },
          ],
        },
        { model: PopWorkband, as: 'popWorkband', required: false },
      ],
      order: [['id', 'ASC']],
      transaction: t,
    });

    // ── 3. Load PoP cost benchmarks ──
    const costBenchmarks = popId
      ? await PopCostBenchmark.findAll({ where: { pop_id: popId, is_active: true }, transaction: t })
      : [];
    const totalBenchmarkPerHectare = costBenchmarks.reduce(
      (sum, cb) => sum + parseFloat(cb.estimated_cost_per_hectare || 0), 0
    );

    // ── 4. Load field area ──
    let areaHectares = null;
    if (fieldId) {
      const field = await Field.findByPk(fieldId, { attributes: ['field_size_hectares'], transaction: t });
      areaHectares = field ? parseFloat(field.field_size_hectares || 0) : null;
    }

    // ── 5. Load soil health record for adjustment ──
    let soilRecord = null;
    if (fieldId) {
      soilRecord = await SoilHealthRecord.findOne({
        where: { field_id: fieldId, is_active: true },
        order: [['test_date', 'DESC']],
        transaction: t,
      });
    }

    // ── 6. Load all expected workbands from PoP template ──
    const popWorkbands = popId
      ? await PopWorkband.findAll({
        where: { pop_id: popId, is_active: true },
        include: [{
          model: PopTask, as: 'popTasks', required: false,
          where: { is_active: true },
          include: [{
            model: PopTaskInput, as: 'popTaskInputs', required: false,
            include: [
              { model: InputItem, as: 'inputItem', required: false },
            ],
          }],
        }],
        order: [['workband_order', 'ASC']],
        transaction: t,
      })
      : [];

    // Map executions by pop_workband_id for lookup
    const execByPopWbId = {};
    workbandExecutions.forEach((we) => {
      if (we.pop_workband_id) execByPopWbId[we.pop_workband_id] = we;
    });

    // ── 7. Compute per-workband variances ──
    let totalWeightedScore = 0;
    let totalWeight = 0;
    let completedStages = 0;
    let missedStages = 0;
    let delayedStages = 0;
    let totalActualCost = 0;
    let totalExpectedCost = 0;
    let stagesWithData = 0;
    let photoEvidenceCount = 0;
    const workbandResults = [];

    for (const popWb of popWorkbands) {
      const exec = execByPopWbId[popWb.id];
      const wbWeight = getWorkbandWeight(popWb.workband_name);
      const popTasks = popWb.popTasks || [];

      // Gather all pop task inputs for this workband (potentially soil-adjusted)
      let allPopInputs = popTasks.flatMap((pt) => pt.popTaskInputs || []);
      if (soilRecord && allPopInputs.length > 0) {
        allPopInputs = applySoilAdjustment(allPopInputs, soilRecord);
      }

      // Gather actual input logs and task executions
      const taskExecs = exec ? (exec.taskExecutions || []) : [];
      const allInputLogs = taskExecs.flatMap((te) => te.taskExecutionInputLogs || []);

      // Compute actual costs from input logs
      const wbActualCost = allInputLogs.reduce(
        (sum, log) => sum + parseFloat(log.input_cost || 0), 0
      );
      totalActualCost += wbActualCost;

      // Compute expected cost for this workband (proportional)
      const wbBenchmark = popWorkbands.length > 0 && totalBenchmarkPerHectare > 0 && areaHectares
        ? { estimated_cost_per_hectare: totalBenchmarkPerHectare / popWorkbands.length }
        : null;
      if (wbBenchmark && areaHectares) {
        totalExpectedCost += parseFloat(wbBenchmark.estimated_cost_per_hectare) * areaHectares;
      }

      // Photo evidence
      taskExecs.forEach((te) => { photoEvidenceCount += (te.execution_photo_count || 0); });

      // ── Dimension computations ──
      const timingVar = computeTimingVariance(exec, popWb, sowingDate);
      const quantityVars = computeQuantityVariance(allInputLogs, allPopInputs);
      const costVar = computeCostVariance(wbActualCost, wbBenchmark, areaHectares);
      const practiceVars = computePracticeVariance(taskExecs, popTasks);
      const wbScore = computeWorkbandScore(timingVar, quantityVars, costVar, practiceVars);

      // Track stage status
      if (exec && exec.workband_status === 'completed') completedStages++;
      else if (exec && exec.workband_status === 'delayed') delayedStages++;
      else if (timingVar.classification === 'MISSED') missedStages++;

      if (exec && exec.workband_status !== 'planned') stagesWithData++;

      if (wbScore.workband_score !== null) {
        totalWeightedScore += wbScore.workband_score * wbWeight;
        totalWeight += wbWeight;
      }

      workbandResults.push({
        workband_name: popWb.workband_name,
        workband_order: popWb.workband_order,
        criticality_weight: wbWeight,
        timing: timingVar,
        quantity: quantityVars,
        cost: costVar,
        practice: practiceVars,
        scores: wbScore,
      });
    }

    // ── 8. Aggregate cycle-level scores ──
    const totalStages = popWorkbands.length;
    const dataCompletenessPct = totalStages > 0
      ? Math.round((stagesWithData / totalStages) * 100)
      : 0;

    const confidenceMultiplier = getConfidenceMultiplier(dataCompletenessPct);
    const rawOverallScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    const overallScore = confidenceMultiplier > 0
      ? Math.round(rawOverallScore * confidenceMultiplier * 100) / 100
      : null;

    // Per-dimension cycle averages
    const dimScores = { timing: [], quantity: [], cost: [], practice: [] };
    workbandResults.forEach((wb) => {
      if (wb.scores.timing_score !== null) dimScores.timing.push(wb.scores.timing_score);
      if (wb.scores.quantity_score !== null) dimScores.quantity.push(wb.scores.quantity_score);
      if (wb.scores.cost_score !== null) dimScores.cost.push(wb.scores.cost_score);
      if (wb.scores.practice_score !== null) dimScores.practice.push(wb.scores.practice_score);
    });

    const avg = (arr) => arr.length > 0 ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 100) / 100 : null;

    const costVariancePct = totalExpectedCost > 0
      ? Math.round(((totalActualCost - totalExpectedCost) / totalExpectedCost) * 10000) / 100
      : null;

    const season = cycle.cycle_season && cycle.cycle_year
      ? `${cycle.cycle_season}_${cycle.cycle_year}`
      : null;

    // ── 9. Upsert RootsComplianceSnapshot ──
    const snapshotDate = new Date().toISOString().slice(0, 10);

    const [snapshot, created] = await RootsComplianceSnapshot.findOrCreate({
      where: {
        farmer_id: farmerId,
        activity_type: 'CROP',
        activity_reference_id: cycle.id,
        snapshot_date: snapshotDate,
      },
      defaults: {
        uuid: generateUUID(),
        farmer_id: farmerId,
        activity_type: 'CROP',
        activity_reference_id: cycle.id,
        overall_compliance_score: overallScore,
        timing_compliance_score: avg(dimScores.timing),
        quantity_compliance_score: avg(dimScores.quantity),
        cost_compliance_score: avg(dimScores.cost),
        practice_compliance_score: avg(dimScores.practice),
        total_stages: totalStages,
        completed_stages: completedStages,
        missed_stages: missedStages,
        delayed_stages: delayedStages,
        total_expected_cost: Math.round(totalExpectedCost * 100) / 100,
        total_actual_cost: Math.round(totalActualCost * 100) / 100,
        cost_variance_pct: costVariancePct,
        data_completeness_pct: dataCompletenessPct,
        photo_evidence_count: photoEvidenceCount,
        snapshot_date: snapshotDate,
        season,
      },
      transaction: t,
    });

    if (!created) {
      await snapshot.update({
        overall_compliance_score: overallScore,
        timing_compliance_score: avg(dimScores.timing),
        quantity_compliance_score: avg(dimScores.quantity),
        cost_compliance_score: avg(dimScores.cost),
        practice_compliance_score: avg(dimScores.practice),
        total_stages: totalStages,
        completed_stages: completedStages,
        missed_stages: missedStages,
        delayed_stages: delayedStages,
        total_expected_cost: Math.round(totalExpectedCost * 100) / 100,
        total_actual_cost: Math.round(totalActualCost * 100) / 100,
        cost_variance_pct: costVariancePct,
        data_completeness_pct: dataCompletenessPct,
        photo_evidence_count: photoEvidenceCount,
        season,
      }, { transaction: t });
    }

    await t.commit();

    logger.info(`Variance engine: cycle ${cycle.cycle_uuid} scored ${overallScore} (${dataCompletenessPct}% complete)`);

    // Emit compliance update event (non-blocking)
    const result = {
      cycleId: cycle.cycle_uuid,
      farmerId,
      activityType: 'CROP',
      snapshotDate,
      season,
      overallComplianceScore: overallScore,
      timingComplianceScore: avg(dimScores.timing),
      quantityComplianceScore: avg(dimScores.quantity),
      costComplianceScore: avg(dimScores.cost),
      practiceComplianceScore: avg(dimScores.practice),
      totalStages: totalStages,
      completedStages,
      missedStages,
      delayedStages,
      totalExpectedCost: Math.round(totalExpectedCost * 100) / 100,
      totalActualCost: Math.round(totalActualCost * 100) / 100,
      costVariancePct: costVariancePct,
      dataCompletenessPct,
      confidenceMultiplier,
      photoEvidenceCount,
      workbands: workbandResults,
      snapshotId: snapshot.uuid,
    };

    try {
      const { emitComplianceUpdate } = require('./complianceEventEmitter');
      await emitComplianceUpdate(farmerId, 'CROP', cycle.id, result);
    } catch (emitErr) {
      logger.warn('Failed to emit compliance update event', { error: emitErr.message });
    }

    return result;
  } catch (err) {
    await t.rollback();
    logger.error('Variance engine computation failed', { cycleId, error: err.message, stack: err.stack });
    throw err;
  }
};

/* ====================================================================
 * 7. applySoilAdjustment
 * ==================================================================== */

/**
 * Adjust PoP recommended input quantities based on soil health data.
 * Returns a new array — does not mutate originals.
 *
 * Soil-based adjustment rules:
 *   N low  (<250 kg/ha)  → +20% nitrogen fertilizer
 *   N high (>500 kg/ha)  → -15% nitrogen
 *   P low  (<11 kg/ha)   → +25% phosphatic fertilizer
 *   K high (>280 kg/ha)  → -15% potassic fertilizer
 *   pH acidic (<5.5)     → add lime recommendation
 *   pH alkaline (>8.5)   → add gypsum recommendation
 *   OC low (<0.5%)       → increase FYM
 *   Zinc deficient       → add ZnSO4
 *
 * @param {Object[]} popTaskInputs - Original PoP inputs
 * @param {Object} soilHealthRecord - SoilHealthRecord with individual nutrient columns
 * @returns {Object[]} Adjusted copies of popTaskInputs
 */
const applySoilAdjustment = (popTaskInputs, soilHealthRecord) => {
  if (!soilHealthRecord || !popTaskInputs || popTaskInputs.length === 0) {
    return popTaskInputs || [];
  }

  const nitrogen = soilHealthRecord.nitrogen_kg_per_hectare;
  const phosphorus = soilHealthRecord.phosphorus_kg_per_hectare;
  const potassium = soilHealthRecord.potassium_kg_per_hectare;
  const ph = soilHealthRecord.ph;
  const oc = soilHealthRecord.organic_carbon_percent;
  const zinc = soilHealthRecord.zinc_ppm;

  return popTaskInputs.map((popInput) => {
    const adjusted = { ...popInput };
    const inputQty = parseFloat(popInput.input_quantity || 0);
    if (inputQty <= 0) return adjusted;

    // Determine input category from associated inputItem
    const itemName = (popInput.inputItem?.item_name || '').toLowerCase();
    const categoryName = (popInput.inputItem?.category_name || '').toLowerCase();

    let multiplier = 1.0;

    // Nitrogen-based inputs (urea, DAP nitrogen component, CAN)
    if (itemName.includes('urea') || itemName.includes('nitrogen') || itemName.includes('can ')) {
      if (nitrogen !== null && nitrogen !== undefined) {
        if (nitrogen < 250) multiplier *= 1.20;
        else if (nitrogen > 500) multiplier *= 0.85;
      }
    }

    // Phosphatic inputs (SSP, DAP, TSP)
    if (itemName.includes('ssp') || itemName.includes('phosph') || itemName.includes('dap') || itemName.includes('tsp')) {
      if (phosphorus !== null && phosphorus !== undefined) {
        if (phosphorus < 11) multiplier *= 1.25;
      }
    }

    // Potassic inputs (MOP, SOP)
    if (itemName.includes('mop') || itemName.includes('potash') || itemName.includes('sop') || itemName.includes('potassic')) {
      if (potassium !== null && potassium !== undefined) {
        if (potassium > 280) multiplier *= 0.85;
      }
    }

    // FYM / organic manure — boost when OC is low
    if (itemName.includes('fym') || itemName.includes('manure') || itemName.includes('compost') || categoryName.includes('organic')) {
      if (oc !== null && oc !== undefined && oc < 0.5) {
        multiplier *= 1.30;
      }
    }

    // Lime — acidic soils
    if (itemName.includes('lime') || itemName.includes('dolomite')) {
      if (ph !== null && ph !== undefined && ph < 5.5) {
        multiplier *= 1.20;
      }
    }

    // Gypsum — alkaline soils
    if (itemName.includes('gypsum')) {
      if (ph !== null && ph !== undefined && ph > 8.5) {
        multiplier *= 1.20;
      }
    }

    // Zinc sulphate
    if (itemName.includes('zinc') || itemName.includes('znso4')) {
      if (zinc !== null && zinc !== undefined && zinc < 0.6) {
        multiplier *= 1.25;
      }
    }

    if (multiplier !== 1.0) {
      adjusted.input_quantity = Math.round(inputQty * multiplier * 1000) / 1000;
      adjusted._soil_adjusted = true;
      adjusted._soil_multiplier = multiplier;
    }

    return adjusted;
  });
};

/* ──────────────────── Module Exports ──────────────────── */

module.exports = {
  computeTimingVariance,
  computeQuantityVariance,
  computeCostVariance,
  computePracticeVariance,
  computeWorkbandScore,
  computeCycleComplianceScore,
  applySoilAdjustment,
};
