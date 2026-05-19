/**
 * Red Flag Detection Service — Anomaly detection for ROOTS ERP.
 *
 * Detects data anomalies, fraud indicators, and operational red flags
 * across farmer activity data. Each detection method checks a specific
 * pattern and creates a RootsRedFlag record with evidence JSON.
 *
 * Consumers: Banker dashboard, SENTINEL, TRUST modules.
 * Events: publishes 'roots.redflag.created' to RabbitMQ on each new flag.
 */

const { Op } = require('sequelize');
const logger = require('../../../../shared/utils/logger');
const { generateUUID } = require('../../../../shared/utils/uuidHelper');

let db;
const getDb = () => { if (!db) db = require('../../../../shared/models'); return db; };

const MS_PER_DAY = 86400000;
const diffDays = (a, b) => Math.round((new Date(a) - new Date(b)) / MS_PER_DAY);

/* ── Event emitter ── */

const publishRedFlagEvent = async (flag) => {
  try {
    const { emitRedFlagCreated } = require('./complianceEventEmitter');
    await emitRedFlagCreated(flag);
  } catch (err) {
    logger.warn('Failed to emit red flag event', { error: err.message });
  }
};

/* ── Deduplication helper ── */

const hasOpenFlag = async (farmerId, flagType, activityRefId, transaction) => {
  const { RootsRedFlag } = getDb();
  const existing = await RootsRedFlag.findOne({
    where: {
      farmer_id: farmerId,
      flag_type: flagType,
      activity_reference_id: activityRefId,
      status: { [Op.in]: ['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING'] },
      is_active: true,
    },
    transaction,
  });
  return !!existing;
};

/* ── Flag creation helper ── */

const createFlag = async (data, transaction) => {
  const { RootsRedFlag } = getDb();
  const flag = await RootsRedFlag.create({
    uuid: generateUUID(),
    ...data,
    is_active: true,
  }, { transaction });

  await publishRedFlagEvent(flag);
  logger.info(`Red flag created: ${data.flag_type} for farmer ${data.farmer_id}`, {
    severity: data.severity, activityRefId: data.activity_reference_id,
  });
  return flag;
};

/* ====================================================================
 * 1. detectNoDataEntry
 * ==================================================================== */

const detectNoDataEntry = async (farmerId, activityType, activityRefId) => {
  const { CultivationCycle, WorkbandExecution, TaskExecution, sequelize } = getDb();
  const t = await sequelize.transaction();

  try {
    if (await hasOpenFlag(farmerId, 'NO_DATA_ENTRY', activityRefId, t)) {
      await t.commit();
      return null;
    }

    // Find latest entry date across workband/task executions
    const cycle = await CultivationCycle.findOne({
      where: { id: activityRefId, is_active: true },
      transaction: t,
    });
    if (!cycle) { await t.commit(); return null; }

    const latestWb = await WorkbandExecution.findOne({
      where: { cycle_id: cycle.cycle_uuid, is_active: true },
      order: [['updated_at', 'DESC']],
      attributes: ['updated_at'],
      transaction: t,
    });

    const lastEntryDate = latestWb ? latestWb.updated_at : cycle.created_at;
    const daysSinceLast = diffDays(new Date(), lastEntryDate);

    if (daysSinceLast < 30) {
      await t.commit();
      return null;
    }

    const severity = daysSinceLast > 45 ? 'CRITICAL' : 'HIGH';

    const flag = await createFlag({
      farmer_id: farmerId,
      activity_type: activityType,
      activity_reference_id: activityRefId,
      flag_type: 'NO_DATA_ENTRY',
      severity,
      description: `No data entry for ${daysSinceLast} days on active ${activityType.toLowerCase()} cycle.`,
      evidence_json: {
        last_entry_date: lastEntryDate,
        days_since_last: daysSinceLast,
        cycle_status: cycle.cycle_status,
        loan_linked: !!cycle.linked_loan_id,
      },
    }, t);

    await t.commit();
    return flag;
  } catch (err) {
    await t.rollback();
    logger.error('detectNoDataEntry failed', { farmerId, error: err.message });
    throw err;
  }
};

/* ====================================================================
 * 2. detectCriticalStageMissed
 * ==================================================================== */

const CRITICAL_STAGES = ['sowing', 'fertilization', 'basal', 'harvest', 'harvesting'];

const detectCriticalStageMissed = async (cycleId) => {
  const { CultivationCycle, PopWorkband, WorkbandExecution, sequelize } = getDb();
  const t = await sequelize.transaction();

  try {
    const cycle = await CultivationCycle.findOne({
      where: typeof cycleId === 'number'
        ? { id: cycleId, is_active: true }
        : { cycle_uuid: cycleId, is_active: true },
      transaction: t,
    });
    if (!cycle || !cycle.cycle_sowing_date || !cycle.pop_id) {
      await t.commit();
      return [];
    }

    const sowingDate = new Date(cycle.cycle_sowing_date);
    const currentDay = diffDays(new Date(), sowingDate);

    const popWorkbands = await PopWorkband.findAll({
      where: { pop_id: cycle.pop_id, is_active: true },
      order: [['workband_order', 'ASC']],
      transaction: t,
    });

    const executions = await WorkbandExecution.findAll({
      where: { cycle_id: cycle.cycle_uuid, is_active: true },
      attributes: ['pop_workband_id', 'workband_status'],
      transaction: t,
    });
    const execByPwId = {};
    executions.forEach((e) => { if (e.pop_workband_id) execByPwId[e.pop_workband_id] = e; });

    const flags = [];

    for (const pw of popWorkbands) {
      const isCritical = CRITICAL_STAGES.some((s) => (pw.workband_name || '').toLowerCase().includes(s));
      if (!isCritical) continue;

      const windowEnd = pw.days_from_sowing_end || pw.days_from_sowing_start || 0;
      if (currentDay <= windowEnd + 7) continue; // still in grace

      const exec = execByPwId[pw.id];
      if (exec && exec.workband_status !== 'planned') continue; // has execution

      if (await hasOpenFlag(cycle.farmer_id, 'CRITICAL_STAGE_MISSED', cycle.id, t)) continue;

      const daysOverdue = currentDay - windowEnd;
      const flag = await createFlag({
        farmer_id: cycle.farmer_id,
        activity_type: 'CROP',
        activity_reference_id: cycle.id,
        flag_type: 'CRITICAL_STAGE_MISSED',
        severity: 'HIGH',
        description: `Critical stage "${pw.workband_name}" missed by ${daysOverdue} days.`,
        evidence_json: {
          stage_name: pw.workband_name,
          window_start: pw.days_from_sowing_start,
          window_end: windowEnd,
          days_overdue: daysOverdue,
        },
      }, t);
      flags.push(flag);
    }

    await t.commit();
    return flags;
  } catch (err) {
    await t.rollback();
    logger.error('detectCriticalStageMissed failed', { cycleId, error: err.message });
    throw err;
  }
};

/* ====================================================================
 * 3. detectCostAnomaly
 * ==================================================================== */

const detectCostAnomaly = async (cycleId) => {
  const varianceService = require('./varianceService');
  const { sequelize } = getDb();
  const t = await sequelize.transaction();

  try {
    const compliance = await varianceService.computeCycleComplianceScore(cycleId);
    if (!compliance || compliance.totalExpectedCost <= 0) {
      await t.commit();
      return null;
    }

    const variancePct = compliance.costVariancePct;
    if (variancePct === null) { await t.commit(); return null; }

    const actual = compliance.totalActualCost;
    const expected = compliance.totalExpectedCost;
    const ratio = actual / expected;

    // Flag if >150% or <30% of benchmark
    if (ratio <= 1.5 && ratio >= 0.3) {
      await t.commit();
      return null;
    }

    if (await hasOpenFlag(compliance.farmerId, 'COST_ANOMALY', compliance.workbands?.[0]?.activity_reference_id || 0, t)) {
      await t.commit();
      return null;
    }

    const severity = (ratio > 2.0 || ratio < 0.3) ? 'HIGH' : 'MEDIUM';

    const stageBreakdown = compliance.workbands.map((wb) => ({
      stage: wb.workband_name,
      cost_score: wb.scores.cost_score,
      cost_classification: wb.cost.classification,
    }));

    const flag = await createFlag({
      farmer_id: compliance.farmerId,
      activity_type: 'CROP',
      activity_reference_id: compliance.workbands?.[0]?.activity_reference_id || 0,
      flag_type: 'COST_ANOMALY',
      severity,
      description: `Cost anomaly: actual ₹${actual} vs expected ₹${expected} (${variancePct}% variance).`,
      evidence_json: {
        actual_cost: actual,
        expected_cost: expected,
        variance_pct: variancePct,
        stage_breakdown: stageBreakdown,
      },
    }, t);

    await t.commit();
    return flag;
  } catch (err) {
    await t.rollback();
    logger.error('detectCostAnomaly failed', { cycleId, error: err.message });
    throw err;
  }
};

/* ====================================================================
 * 4. detectYieldAnomaly
 * ==================================================================== */

const detectYieldAnomaly = async (cycleId, harvestRecordId) => {
  const { CultivationCycle, HarvestRecord, Field, FarmRegister, sequelize } = getDb();
  const t = await sequelize.transaction();

  try {
    const harvest = await HarvestRecord.findOne({
      where: { id: harvestRecordId, is_active: true },
      transaction: t,
    });
    if (!harvest || !harvest.yield_per_hectare_kg) {
      await t.commit();
      return null;
    }

    const cycle = await CultivationCycle.findOne({
      where: typeof cycleId === 'number'
        ? { id: cycleId, is_active: true }
        : { cycle_uuid: cycleId, is_active: true },
      transaction: t,
    });
    if (!cycle) { await t.commit(); return null; }

    // Get district for this field
    const field = cycle.field_id ? await Field.findByPk(cycle.field_id, { transaction: t }) : null;
    const farmRegister = field ? await FarmRegister.findByPk(field.farm_register_id, { transaction: t }) : null;
    const districtId = farmRegister ? farmRegister.district_id : null;

    if (!districtId) { await t.commit(); return null; }

    // Compute district average yield for same crop
    const [stats] = await sequelize.query(`
      SELECT
        AVG(hr.yield_per_hectare_kg) AS avg_yield,
        STDDEV(hr.yield_per_hectare_kg) AS std_dev,
        COUNT(*) AS sample_count
      FROM harvest_records hr
      JOIN cultivation_cycles cc ON hr.cycle_id = cc.cycle_uuid
      JOIN fields f ON cc.field_id = f.id
      JOIN farm_registers fr ON f.farm_register_id = fr.id
      WHERE hr.is_active = 1
        AND cc.crop_id = :cropId
        AND fr.district_id = :districtId
        AND hr.yield_per_hectare_kg > 0
        AND hr.id != :currentId
    `, {
      replacements: { cropId: cycle.crop_id, districtId, currentId: harvestRecordId },
      transaction: t,
    });

    const avgYield = parseFloat(stats[0]?.avg_yield || 0);
    const stdDev = parseFloat(stats[0]?.std_dev || 0);
    const sampleCount = parseInt(stats[0]?.sample_count || 0, 10);

    // Need at least 5 data points for meaningful comparison
    if (sampleCount < 5 || stdDev <= 0) {
      await t.commit();
      return null;
    }

    const zScore = (harvest.yield_per_hectare_kg - avgYield) / stdDev;

    if (zScore <= 2.0) {
      await t.commit();
      return null; // within 2 standard deviations
    }

    if (await hasOpenFlag(cycle.farmer_id, 'YIELD_ANOMALY', cycle.id, t)) {
      await t.commit();
      return null;
    }

    const flag = await createFlag({
      farmer_id: cycle.farmer_id,
      activity_type: 'CROP',
      activity_reference_id: cycle.id,
      flag_type: 'YIELD_ANOMALY',
      severity: 'MEDIUM',
      description: `Reported yield ${harvest.yield_per_hectare_kg} kg/ha is ${zScore.toFixed(1)} std devs above district average.`,
      evidence_json: {
        claimed_yield: harvest.yield_per_hectare_kg,
        district_avg: Math.round(avgYield * 100) / 100,
        std_dev: Math.round(stdDev * 100) / 100,
        z_score: Math.round(zScore * 100) / 100,
        sample_count: sampleCount,
      },
    }, t);

    await t.commit();
    return flag;
  } catch (err) {
    await t.rollback();
    logger.error('detectYieldAnomaly failed', { cycleId, harvestRecordId, error: err.message });
    throw err;
  }
};

/* ====================================================================
 * 5. detectBackfillPattern
 * ==================================================================== */

const detectBackfillPattern = async (farmerId, cycleId) => {
  const { CultivationCycle, WorkbandExecution, sequelize } = getDb();
  const t = await sequelize.transaction();

  try {
    const cycle = await CultivationCycle.findOne({
      where: typeof cycleId === 'number'
        ? { id: cycleId, is_active: true }
        : { cycle_uuid: cycleId, is_active: true },
      transaction: t,
    });
    if (!cycle) { await t.commit(); return null; }

    // Find executions grouped by creation date
    const [rows] = await sequelize.query(`
      SELECT
        DATE(we.created_at) AS entry_date,
        COUNT(*) AS entry_count,
        GROUP_CONCAT(COALESCE(pw.workband_name, 'Unknown') SEPARATOR ', ') AS stages
      FROM workband_executions we
      LEFT JOIN pop_workbands pw ON we.pop_workband_id = pw.id
      WHERE we.cycle_id = :cycleUuid
        AND we.is_active = 1
        AND we.workband_status != 'planned'
      GROUP BY DATE(we.created_at)
      HAVING entry_count >= 3
      ORDER BY entry_date DESC
    `, {
      replacements: { cycleUuid: cycle.cycle_uuid },
      transaction: t,
    });

    if (rows.length === 0) {
      await t.commit();
      return null;
    }

    if (await hasOpenFlag(farmerId, 'BACKFILL_SUSPECTED', cycle.id, t)) {
      await t.commit();
      return null;
    }

    const worstDay = rows[0];
    const flag = await createFlag({
      farmer_id: farmerId,
      activity_type: 'CROP',
      activity_reference_id: cycle.id,
      flag_type: 'BACKFILL_SUSPECTED',
      severity: 'MEDIUM',
      description: `${worstDay.entry_count} workband entries created on ${worstDay.entry_date} — possible backfill.`,
      evidence_json: {
        entries_on_same_day: worstDay.entry_count,
        stages_affected: worstDay.stages,
        entry_date: worstDay.entry_date,
        total_backfill_days: rows.length,
      },
    }, t);

    await t.commit();
    return flag;
  } catch (err) {
    await t.rollback();
    logger.error('detectBackfillPattern failed', { farmerId, cycleId, error: err.message });
    throw err;
  }
};

/* ====================================================================
 * 6. detectLoanUtilizationMismatch
 * ==================================================================== */

const detectLoanUtilizationMismatch = async (farmerId, loanApplicationId) => {
  const {
    LoanApplication, LoanDisbursement, VendorFarmerLink,
    CultivationCycle, TaskExecutionInputLog, WorkbandExecution, TaskExecution,
    RootsLoanUtilizationTracking, sequelize, Sequelize: Sq,
  } = getDb();
  const t = await sequelize.transaction();

  try {
    const loanApp = await LoanApplication.findByPk(loanApplicationId, { transaction: t });
    if (!loanApp) { await t.commit(); return null; }

    // Get latest disbursement
    const disbursement = await LoanDisbursement.findOne({
      where: { application_id: loanApplicationId, is_active: true },
      order: [['transferred_at', 'DESC']],
      transaction: t,
    });
    if (!disbursement || !disbursement.transferred_at) { await t.commit(); return null; }

    const daysSinceDisbursement = diffDays(new Date(), disbursement.transferred_at);
    if (daysSinceDisbursement < 30) { await t.commit(); return null; }

    const loanAmount = parseFloat(disbursement.disbursement_amount || 0);
    if (loanAmount <= 0) { await t.commit(); return null; }

    // Compute ROOTS total input cost for this farmer's active cycles
    const activeCycles = await CultivationCycle.findAll({
      where: {
        farmer_id: farmerId,
        is_active: true,
        cycle_status: { [Op.in]: ['sowing', 'growing', 'monitoring', 'harvesting'] },
      },
      attributes: ['cycle_uuid'],
      transaction: t,
    });

    let rootsCost = 0;
    if (activeCycles.length > 0) {
      const cycleUuids = activeCycles.map((c) => c.cycle_uuid);
      const [costResult] = await sequelize.query(`
        SELECT COALESCE(SUM(til.input_cost), 0) AS total_cost
        FROM task_execution_input_logs til
        JOIN task_executions te ON til.task_execution_id = te.id
        JOIN workband_executions we ON te.workband_execution_id = we.id
        WHERE we.cycle_id IN (:cycleUuids)
          AND til.is_active = 1
          AND te.is_active = 1
          AND we.is_active = 1
      `, { replacements: { cycleUuids }, transaction: t });
      rootsCost = parseFloat(costResult[0]?.total_cost || 0);
    }

    // Compute VYAPAR total purchases
    const vyaparResult = await VendorFarmerLink.findAll({
      where: { farmer_id: farmerId, is_active: true },
      attributes: [[Sq.fn('SUM', Sq.col('total_value')), 'totalPurchases']],
      raw: true,
      transaction: t,
    });
    const vyaparCost = parseFloat(vyaparResult[0]?.totalPurchases || 0);

    const totalVerified = rootsCost + vyaparCost;
    const utilizationPct = (totalVerified / loanAmount) * 100;

    // Upsert loan utilization tracking
    const [tracking] = await RootsLoanUtilizationTracking.findOrCreate({
      where: { farmer_id: farmerId, loan_application_id: loanApplicationId },
      defaults: {
        uuid: generateUUID(),
        farmer_id: farmerId,
        loan_application_id: loanApplicationId,
        sanctioned_amount: loanAmount,
        disbursed_amount: loanAmount,
        roots_total_input_cost: rootsCost,
        vyapar_total_purchase: vyaparCost,
        total_verified_expenditure: totalVerified,
        utilization_ratio: utilizationPct / 100,
        utilization_quality: utilizationPct >= 60 ? 'GOOD' : utilizationPct >= 40 ? 'PARTIAL' : utilizationPct >= 20 ? 'POOR' : 'SUSPICIOUS',
        assessment_date: new Date().toISOString().slice(0, 10),
      },
      transaction: t,
    });

    if (tracking) {
      await tracking.update({
        roots_total_input_cost: rootsCost,
        vyapar_total_purchase: vyaparCost,
        total_verified_expenditure: totalVerified,
        utilization_ratio: utilizationPct / 100,
        utilization_quality: utilizationPct >= 60 ? 'GOOD' : utilizationPct >= 40 ? 'PARTIAL' : utilizationPct >= 20 ? 'POOR' : 'SUSPICIOUS',
        assessment_date: new Date().toISOString().slice(0, 10),
      }, { transaction: t });
    }

    // Flag only if <20%
    if (utilizationPct >= 20) {
      await t.commit();
      return null;
    }

    if (await hasOpenFlag(farmerId, 'LOAN_UTILIZATION_MISMATCH', loanApplicationId, t)) {
      await t.commit();
      return null;
    }

    const flag = await createFlag({
      farmer_id: farmerId,
      loan_application_id: loanApplicationId,
      activity_type: 'CROP',
      activity_reference_id: loanApplicationId,
      flag_type: 'LOAN_UTILIZATION_MISMATCH',
      severity: 'HIGH',
      description: `Loan utilization only ${utilizationPct.toFixed(1)}% after ${daysSinceDisbursement} days since disbursement.`,
      evidence_json: {
        loan_amount: loanAmount,
        disbursed_date: disbursement.transferred_at,
        roots_cost: rootsCost,
        vyapar_cost: vyaparCost,
        utilization_pct: Math.round(utilizationPct * 100) / 100,
        days_since_disbursement: daysSinceDisbursement,
      },
    }, t);

    await t.commit();
    return flag;
  } catch (err) {
    await t.rollback();
    logger.error('detectLoanUtilizationMismatch failed', { farmerId, loanApplicationId, error: err.message });
    throw err;
  }
};

/* ====================================================================
 * 7. runAllDetections
 * ==================================================================== */

const runAllDetections = async (farmerId) => {
  const { CultivationCycle, LoanApplication } = getDb();
  const flags = [];

  // Get all active cycles for this farmer
  const activeCycles = await CultivationCycle.findAll({
    where: {
      farmer_id: farmerId,
      is_active: true,
      cycle_status: { [Op.in]: ['sowing', 'growing', 'monitoring', 'harvesting'] },
    },
  });

  for (const cycle of activeCycles) {
    try {
      // 1. No data entry
      const noData = await detectNoDataEntry(farmerId, 'CROP', cycle.id);
      if (noData) flags.push(noData);

      // 2. Critical stage missed
      const missed = await detectCriticalStageMissed(cycle.id);
      flags.push(...missed);

      // 3. Cost anomaly
      const cost = await detectCostAnomaly(cycle.id);
      if (cost) flags.push(cost);

      // 4. Backfill pattern
      const backfill = await detectBackfillPattern(farmerId, cycle.id);
      if (backfill) flags.push(backfill);
    } catch (err) {
      logger.error(`runAllDetections: detection failed for cycle ${cycle.cycle_uuid}`, { error: err.message });
      // Continue with other cycles
    }
  }

  // 5. Loan utilization for active loans
  try {
    const loans = await LoanApplication.findAll({
      where: {
        farmer_id: farmerId,
        is_active: true,
        application_status: { [Op.in]: ['disbursed', 'active'] },
      },
      attributes: ['id'],
    });

    for (const loan of loans) {
      try {
        const utilFlag = await detectLoanUtilizationMismatch(farmerId, loan.id);
        if (utilFlag) flags.push(utilFlag);
      } catch (err) {
        logger.error(`runAllDetections: loan utilization check failed for loan ${loan.id}`, { error: err.message });
      }
    }
  } catch (err) {
    logger.error('runAllDetections: loan fetch failed', { farmerId, error: err.message });
  }

  logger.info(`runAllDetections: ${flags.length} new flags for farmer ${farmerId}`);
  return flags;
};

module.exports = {
  detectNoDataEntry,
  detectCriticalStageMissed,
  detectCostAnomaly,
  detectYieldAnomaly,
  detectBackfillPattern,
  detectLoanUtilizationMismatch,
  runAllDetections,
};
