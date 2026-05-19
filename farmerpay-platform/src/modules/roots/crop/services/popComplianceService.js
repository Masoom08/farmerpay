/**
 * PoP Compliance Service — Scores farmer adherence to Package of Practice.
 *
 * Calculates compliance across 4 dimensions at each workband touchpoint:
 *   1. task_score   — % of non-optional tasks completed
 *   2. input_score  — quantity variance vs PoP norms
 *   3. cost_score   — actual cost vs Scale of Finance allocation
 *   4. timing_score — actual timing vs PoP days_from_sowing
 *
 * Maintains a cumulative PopComplianceSnapshot per cultivation cycle.
 */

const { Op } = require('sequelize');
const logger = require('../../../../shared/utils/logger');
const { generateUUID } = require('../../../../shared/utils/uuidHelper');

let db;
const getDb = () => { if (!db) db = require('../../../../shared/models'); return db; };

/* ──────────────────── Scoring Helpers ──────────────────── */

/**
 * Score input quantity variance vs PoP recommendation.
 * @param {number} actual
 * @param {number} expected
 * @returns {number} 0-100
 */
const scoreInputVariance = (actual, expected) => {
  if (!expected || expected <= 0) return actual > 0 ? 50 : 0;
  if (!actual && actual !== 0) return 0; // missing
  const variance = Math.abs(actual - expected) / expected;
  if (variance <= 0.10) return 100;
  if (variance <= 0.25) return 75;
  if (variance <= 0.50) return 50;
  return 25;
};

/**
 * Score actual cost vs SoF proportional allocation.
 * @param {number} actualCost
 * @param {number} sofAllocation
 * @returns {number} 0-100
 */
const scoreCostVariance = (actualCost, sofAllocation) => {
  if (!sofAllocation || sofAllocation <= 0) return 50;
  if (!actualCost || actualCost <= 0) return 100; // no spend yet
  const overPercent = ((actualCost - sofAllocation) / sofAllocation) * 100;
  if (overPercent <= 0) return 100;       // under budget
  if (overPercent <= 25) return 75;
  if (overPercent <= 50) return 50;
  return 25;
};

/**
 * Score timing deviation from PoP schedule.
 * @param {Date} actualStart
 * @param {Date} sowingDate
 * @param {number} expectedDaysFromSowing
 * @param {number} windowDays — tolerance window from PoP (default 0)
 * @returns {number} 0-100
 */
const scoreTimingDeviation = (actualStart, sowingDate, expectedDaysFromSowing, windowDays = 0) => {
  if (!actualStart || !sowingDate) return 50;
  const actualDays = Math.floor((new Date(actualStart) - new Date(sowingDate)) / (1000 * 60 * 60 * 24));
  const deviation = actualDays - expectedDaysFromSowing;
  const lateDays = Math.max(0, deviation - windowDays);
  if (lateDays <= 0) return 100;
  if (lateDays <= 3) return 90;
  if (lateDays <= 7) return 70;
  if (lateDays <= 14) return 40;
  return 10;
};

/* ──────────────────── Main Functions ──────────────────── */

/**
 * Scores one touchpoint (workband execution) and upserts the compliance snapshot.
 */
const calculateTouchpointCompliance = async (cycleId, workbandExecutionId, farmerId) => {
  const {
    CultivationCycle, CultivationCyclePlanning,
    PackageOfPractice, PopWorkband, PopTask, PopTaskInput,
    WorkbandExecution, TaskExecution, TaskExecutionInputLog, TaskExecutionLaborLog,
    TaskExecutionExpense, ScaleOfFinance,
    PopComplianceSnapshot, SageAlert,
    FarmRegister, Field, CropMaster, CropSeason,
    FarmerAddress, LgdDistrict,
  } = getDb();

  // 1. Load cycle context
  const cycle = await CultivationCycle.findOne({
    where: { cycle_uuid: cycleId, is_active: true },
    include: [
      { model: Field, as: 'field', include: [{ model: FarmRegister, as: 'farmRegister' }] },
    ],
  });
  if (!cycle) throw Object.assign(new Error('Cultivation cycle not found'), { statusCode: 404 });

  const sowingDate = cycle.sowing_date || cycle.created_at;

  // 2. Load the workband execution + tasks
  const wbExecution = await WorkbandExecution.findOne({
    where: { id: workbandExecutionId, is_active: true },
  });
  if (!wbExecution) throw Object.assign(new Error('Workband execution not found'), { statusCode: 404 });

  // 3. Load PoP template for this workband
  const popWorkband = await PopWorkband.findOne({
    where: { id: wbExecution.pop_workband_id, is_active: true },
    include: [{
      model: PopTask, as: 'tasks',
      where: { is_active: true },
      required: false,
      include: [{ model: PopTaskInput, as: 'inputs', where: { is_active: true }, required: false }],
    }],
  });

  // 4. Load actual task executions for this workband execution
  const taskExecutions = await TaskExecution.findAll({
    where: { workband_execution_id: workbandExecutionId, is_active: true },
    include: [
      { model: TaskExecutionInputLog, as: 'inputLogs', where: { is_active: true }, required: false },
      { model: TaskExecutionLaborLog, as: 'laborLogs', where: { is_active: true }, required: false },
    ],
  });

  // 5. Load Scale of Finance for cost benchmarking
  let sofRecord = null;
  try {
    const farmerAddress = await FarmerAddress.findOne({ where: { farmer_id: farmerId, is_active: true } });
    if (farmerAddress) {
      sofRecord = await ScaleOfFinance.findOne({
        where: {
          crop_id: cycle.crop_id,
          district_id: farmerAddress.district_id,
          is_active: true,
        },
        order: [['financial_year', 'DESC']],
      });
    }
  } catch (err) {
    logger.warn(`[POP_COMPLIANCE] SoF lookup failed: ${err.message}`);
  }

  /* ── Dimension 1: Task Score ── */
  const popTasks = popWorkband ? (popWorkband.tasks || []) : [];
  const nonOptionalTasks = popTasks.filter(t => !t.is_optional);
  const completedTaskIds = new Set(taskExecutions.filter(te => te.status === 'completed').map(te => te.pop_task_id));
  const nonOptionalCompleted = nonOptionalTasks.filter(t => completedTaskIds.has(t.id)).length;
  const taskScore = nonOptionalTasks.length > 0
    ? Math.round((nonOptionalCompleted / nonOptionalTasks.length) * 100)
    : 100;

  /* ── Dimension 2: Input Score ── */
  const inputScores = [];
  const inputDeviations = [];
  for (const popTask of popTasks) {
    for (const popInput of (popTask.inputs || [])) {
      const matchingLogs = taskExecutions
        .flatMap(te => te.inputLogs || [])
        .filter(log => log.input_item_id === popInput.input_item_id);

      const actualQty = matchingLogs.reduce((sum, log) => sum + parseFloat(log.quantity_used || 0), 0);
      const expectedQty = parseFloat(popInput.recommended_quantity || 0);
      const score = scoreInputVariance(actualQty, expectedQty);
      inputScores.push(score);

      if (score < 75) {
        inputDeviations.push({
          dimension: 'input',
          item: popInput.input_item_id,
          expected: expectedQty,
          actual: actualQty,
          variance: expectedQty > 0 ? Math.round(((actualQty - expectedQty) / expectedQty) * 100) : null,
          severity: score <= 25 ? 'high' : 'medium',
        });
      }
    }
  }
  const inputScore = inputScores.length > 0
    ? Math.round(inputScores.reduce((a, b) => a + b, 0) / inputScores.length)
    : 100;

  /* ── Dimension 3: Cost Score ── */
  const actualExpenses = await TaskExecutionExpense.findAll({
    where: { workband_execution_id: workbandExecutionId, is_active: true },
  });
  const actualCost = actualExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  let sofAllocation = 0;
  if (sofRecord && popWorkband) {
    const totalSofCost = parseFloat(sofRecord.total_cost_per_hectare || 0);
    const totalWorkbands = await PopWorkband.count({
      where: { pop_id: popWorkband.pop_id, is_active: true },
    });
    sofAllocation = totalWorkbands > 0 ? totalSofCost / totalWorkbands : 0;
  }
  const costScore = scoreCostVariance(actualCost, sofAllocation);

  if (costScore < 75 && sofAllocation > 0) {
    inputDeviations.push({
      dimension: 'cost',
      item: 'workband_cost',
      expected: sofAllocation,
      actual: actualCost,
      variance: Math.round(((actualCost - sofAllocation) / sofAllocation) * 100),
      severity: costScore <= 25 ? 'high' : 'medium',
    });
  }

  /* ── Dimension 4: Timing Score ── */
  const expectedDaysFromSowing = popWorkband ? (popWorkband.days_from_sowing_start || 0) : 0;
  const windowDays = popWorkband ? (popWorkband.window_days || 0) : 0;
  const timingScore = scoreTimingDeviation(wbExecution.started_at || wbExecution.created_at, sowingDate, expectedDaysFromSowing, windowDays);

  if (timingScore < 70) {
    const actualDays = Math.floor((new Date(wbExecution.started_at || wbExecution.created_at) - new Date(sowingDate)) / (1000 * 60 * 60 * 24));
    inputDeviations.push({
      dimension: 'timing',
      item: 'workband_timing',
      expected: expectedDaysFromSowing,
      actual: actualDays,
      variance: actualDays - expectedDaysFromSowing,
      severity: timingScore <= 40 ? 'high' : 'medium',
    });
  }

  /* ── Touchpoint Score ── */
  const touchpointScore = Math.round((taskScore + inputScore + costScore + timingScore) / 4);

  /* ── Upsert Snapshot ── */
  let snapshot = await PopComplianceSnapshot.findOne({
    where: { cycle_id: cycleId, farmer_id: farmerId, is_active: true },
  });

  const touchpointEntry = {
    workband_order: popWorkband ? popWorkband.workband_order : wbExecution.workband_order,
    workband_name: popWorkband ? popWorkband.workband_name : `Workband ${wbExecution.id}`,
    task_score: taskScore,
    input_score: inputScore,
    cost_score: costScore,
    timing_score: timingScore,
    touchpoint_score: touchpointScore,
    completed_at: new Date().toISOString(),
    status: touchpointScore >= 70 ? 'on_track' : touchpointScore >= 40 ? 'at_risk' : 'off_track',
  };

  if (!snapshot) {
    snapshot = await PopComplianceSnapshot.create({
      snapshot_uuid: generateUUID(),
      cycle_id: cycleId,
      farmer_id: farmerId,
      pop_id: popWorkband ? popWorkband.pop_id : null,
      sof_id: sofRecord ? sofRecord.id : null,
      touchpoint_scores: [touchpointEntry],
      timeliness_score: timingScore,
      task_completion_score: taskScore,
      input_compliance_score: inputScore,
      cost_vs_sof_score: costScore,
      overall_compliance_score: touchpointScore,
      compliance_status: touchpointScore >= 70 ? 'on_track' : touchpointScore >= 40 ? 'at_risk' : 'off_track',
      touchpoints_completed: 1,
      sof_cost_per_hectare: sofRecord ? sofRecord.total_cost_per_hectare : null,
      actual_cost_per_hectare: actualCost || null,
      cost_deviation_percent: sofAllocation > 0 ? Math.round(((actualCost - sofAllocation) / sofAllocation) * 100 * 100) / 100 : null,
      deviations: inputDeviations.length > 0 ? inputDeviations : null,
      calculated_at: new Date(),
    });
  } else {
    // Append touchpoint and recalculate cumulative
    const existingScores = Array.isArray(snapshot.touchpoint_scores) ? [...snapshot.touchpoint_scores] : [];
    existingScores.push(touchpointEntry);

    const completedCount = existingScores.length;
    const avgTask = Math.round(existingScores.reduce((s, t) => s + t.task_score, 0) / completedCount);
    const avgInput = Math.round(existingScores.reduce((s, t) => s + t.input_score, 0) / completedCount);
    const avgCost = Math.round(existingScores.reduce((s, t) => s + t.cost_score, 0) / completedCount);
    const avgTiming = Math.round(existingScores.reduce((s, t) => s + t.timing_score, 0) / completedCount);
    const cumulativeScore = Math.round((avgTask + avgInput + avgCost + avgTiming) / 4);

    const existingDeviations = Array.isArray(snapshot.deviations) ? [...snapshot.deviations] : [];
    const allDeviations = [...existingDeviations, ...inputDeviations];

    // Recalculate total actual cost
    const totalActualCost = parseFloat(snapshot.actual_cost_per_hectare || 0) + actualCost;
    const totalSofCost = sofRecord ? parseFloat(sofRecord.total_cost_per_hectare || 0) : 0;

    const complianceStatus = cumulativeScore >= 70 ? 'on_track' : cumulativeScore >= 40 ? 'at_risk' : 'off_track';

    await snapshot.update({
      touchpoint_scores: existingScores,
      timeliness_score: avgTiming,
      task_completion_score: avgTask,
      input_compliance_score: avgInput,
      cost_vs_sof_score: avgCost,
      overall_compliance_score: cumulativeScore,
      compliance_status: complianceStatus,
      touchpoints_completed: completedCount,
      actual_cost_per_hectare: totalActualCost || null,
      cost_deviation_percent: totalSofCost > 0 ? Math.round(((totalActualCost - totalSofCost) / totalSofCost) * 100 * 100) / 100 : null,
      deviations: allDeviations.length > 0 ? allDeviations : null,
      calculated_at: new Date(),
    });
  }

  /* ── SAGE Alert (non-blocking) ── */
  const finalStatus = snapshot.compliance_status;
  if (finalStatus === 'at_risk' || finalStatus === 'off_track') {
    try {
      await SageAlert.create({
        alert_uuid: generateUUID(),
        farmer_id: farmerId,
        alert_type: 'pop_compliance',
        alert_message: `PoP compliance is ${finalStatus.replace('_', ' ')} (score: ${snapshot.overall_compliance_score}). Review deviations in ${inputDeviations.map(d => d.dimension).join(', ') || 'multiple dimensions'}.`,
        alert_urgency: finalStatus === 'off_track' ? 'high' : 'medium',
        is_active: true,
      });
    } catch (alertErr) {
      logger.warn(`[POP_COMPLIANCE] SAGE alert creation failed (non-blocking): ${alertErr.message}`);
    }
  }

  const feedback = [];
  if (taskScore < 70) feedback.push('Some non-optional tasks were skipped. Complete all required tasks for full compliance.');
  if (inputScore < 70) feedback.push('Input usage deviates significantly from PoP recommendations. Review input quantities.');
  if (costScore < 70) feedback.push('Costs exceed Scale of Finance norms. Review spending to stay within budget.');
  if (timingScore < 70) feedback.push('Workband timing is behind schedule. Try to align activities with the PoP calendar.');

  return {
    touchpointScore,
    cumulativeScore: snapshot.overall_compliance_score,
    status: snapshot.compliance_status,
    deviations: inputDeviations,
    feedback,
    dimensions: { taskScore, inputScore, costScore, timingScore },
  };
};

/**
 * Get the full compliance snapshot for a cycle + farmer.
 */
const getComplianceSnapshot = async (cycleId, farmerId) => {
  const { PopComplianceSnapshot } = getDb();
  const snapshot = await PopComplianceSnapshot.findOne({
    where: { cycle_id: cycleId, farmer_id: farmerId, is_active: true },
  });
  if (!snapshot) throw Object.assign(new Error('Compliance snapshot not found'), { statusCode: 404 });
  return snapshot;
};

/**
 * Get deviations only for a cycle + farmer.
 */
const getComplianceDeviations = async (cycleId, farmerId) => {
  const { PopComplianceSnapshot } = getDb();
  const snapshot = await PopComplianceSnapshot.findOne({
    where: { cycle_id: cycleId, farmer_id: farmerId, is_active: true },
    attributes: ['cycle_id', 'farmer_id', 'compliance_status', 'overall_compliance_score', 'deviations', 'touchpoints_completed'],
  });
  if (!snapshot) throw Object.assign(new Error('Compliance snapshot not found'), { statusCode: 404 });
  return {
    cycleId: snapshot.cycle_id,
    farmerId: snapshot.farmer_id,
    complianceStatus: snapshot.compliance_status,
    overallScore: snapshot.overall_compliance_score,
    touchpointsCompleted: snapshot.touchpoints_completed,
    deviations: snapshot.deviations || [],
  };
};

/**
 * Get all compliance snapshots across cycles for a farmer.
 */
const getFarmerComplianceHistory = async (farmerId) => {
  const { PopComplianceSnapshot } = getDb();
  const snapshots = await PopComplianceSnapshot.findAll({
    where: { farmer_id: farmerId, is_active: true },
    order: [['calculated_at', 'DESC']],
  });
  return snapshots;
};

module.exports = {
  calculateTouchpointCompliance,
  getComplianceSnapshot,
  getComplianceDeviations,
  getFarmerComplianceHistory,
};
