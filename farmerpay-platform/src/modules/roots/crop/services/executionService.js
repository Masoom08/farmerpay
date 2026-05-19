/**
 * Execution Service
 * Business logic for farm registration, field management, cultivation cycle tracking,
 * task execution, harvest, sales, and profitability calculation.
 */

const logger = require('../../../../shared/utils/logger');
const { generateUUID } = require('../../../../shared/utils/uuidHelper');

let db;
const getDb = () => { if (!db) db = require('../../../../shared/models'); return db; };

// ─── Farm & Fields ────────────────────────────────────────────────

const registerFarm = async (farmerId, data) => {
  const { FarmRegister } = getDb();
  const farm = await FarmRegister.create({
    register_uuid: generateUUID(), farmer_id: farmerId,
    register_name: data.farmName,
    total_hectares_owned: data.totalHectares,
    total_hectares_cultivable: data.totalCultivableHectares,
    total_hectares_cultivated: 0,
  });
  logger.info(`Farm registered: ${farm.register_uuid}, farmer: ${farmerId}`);
  return { registerId: farm.id, registerUuid: farm.register_uuid };
};

const addField = async (farmerId, registerId, data) => {
  const d = getDb();
  const { FarmRegister, Field } = d;
  const farm = await FarmRegister.findOne({ where: { id: registerId, farmer_id: farmerId, is_active: true } });
  if (!farm) { const err = new Error('Farm register not found'); err.statusCode = 404; throw err; }

  const transaction = await d.sequelize.transaction();
  try {
    const field = await Field.create({
      field_uuid: generateUUID(), farm_register_id: registerId,
      field_name: data.fieldName, field_code: `F${Date.now().toString(36).toUpperCase()}`,
      field_size_hectares: data.fieldSize,
      lgd_village_id: data.villageId || null,
      latitude: data.latitude || null, longitude: data.longitude || null,
    }, { transaction });

    // Update cultivated area
    const totalCultivated = parseFloat(farm.total_hectares_cultivated || 0) + parseFloat(data.fieldSize);
    await farm.update({ total_hectares_cultivated: totalCultivated }, { transaction });

    await transaction.commit();
    logger.info(`Field added: ${field.field_uuid}, farm: ${farm.register_uuid}`);
    return { fieldId: field.id, fieldUuid: field.field_uuid };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

// ─── Cultivation Cycles ───────────────────────────────────────────

const createCycle = async (farmerId, data) => {
  const { CultivationCycle, Field, FarmRegister, FarmerSoilHealthCard } = getDb();

  // Field is optional in v1 — the farmer-app crop card screen lets the
  // farmer create a cycle without first registering a farm + field.
  // When fieldId is supplied, verify ownership; otherwise skip the check.
  let resolvedFieldId = data.fieldId || null;
  if (resolvedFieldId) {
    const field = await Field.findOne({
      where: { id: resolvedFieldId, is_active: true },
      include: [{ model: FarmRegister, as: 'farmRegister', where: { farmer_id: farmerId }, required: true }],
    });
    if (!field) { const err = new Error('Field not found'); err.statusCode = 404; throw err; }
  }

  // Phase 2A: auto-resolve a PoP from (variety + soil) if the caller didn't pick one.
  // When no field is attached, fall back to the farmer's SHC soil_type so
  // the engine still gets a stage-aware PoP wired in.
  let resolvedPopId = data.popId || null;
  if (!resolvedPopId && data.varietyId) {
    const { PackageOfPractice, FieldSoilDetail } = getDb();
    let soilTypeId = data.soilTypeId || null;
    if (!soilTypeId && FieldSoilDetail && resolvedFieldId) {
      const fsd = await FieldSoilDetail.findOne({ where: { field_id: resolvedFieldId, is_active: true } });
      if (fsd) soilTypeId = fsd.soil_type_id;
    }
    if (!soilTypeId && FarmerSoilHealthCard) {
      const shc = await FarmerSoilHealthCard.findOne({ where: { farmer_id: farmerId } });
      if (shc && shc.soil_type) {
        // Resolve the soil_type enum string back to the soil_types.id
        const { SoilType } = getDb();
        const st = await SoilType.findOne({ where: { soil_type_code: shc.soil_type } });
        if (st) soilTypeId = st.id;
      }
    }
    const popWhere = { variety_id: data.varietyId, is_active: true };
    if (soilTypeId) popWhere.soil_type_id = soilTypeId;
    const pop = await PackageOfPractice.findOne({ where: popWhere });
    if (pop) resolvedPopId = pop.pop_uuid;
  }

  const cycle = await CultivationCycle.create({
    cycle_uuid: generateUUID(), field_id: resolvedFieldId,
    farmer_id: farmerId,
    crop_id: data.cropId, variety_id: data.varietyId || null, pop_id: resolvedPopId,
    cycle_season: data.season, cycle_year: new Date(data.sowingDate).getFullYear(),
    cycle_sowing_date: data.sowingDate,
    cycle_expected_harvest_date: data.expectedHarvestDate || null,
    cycle_status: 'planning',
    // Phase 1: capture self-declared crop + insurance (drives Phase 2 cross-check)
    self_declared_crop: data.selfDeclaredCrop || null,
    self_declared_at: data.selfDeclaredCrop ? new Date() : null,
    self_declared_insurance_status: data.selfDeclaredInsuranceStatus || 'unknown',
    self_declared_policy_no: data.selfDeclaredPolicyNo || null,
  });

  logger.info(`Cultivation cycle created: ${cycle.cycle_uuid}`);

  // Persona phase — flip setup_complete on the farmer's activity subscription.
  //
  // We distinguish between CROP and HORTI cycles by reading the cycle's crop
  // group (Fruits/Vegetables/Flowers ⇒ HORTI, everything else ⇒ CROP). Before
  // this fix, every cycle hardcoded 'CROP' as the target activity which meant
  // a farmer completing the horticulture setup flow would create a mango /
  // tomato / marigold cycle successfully, but her HORTI subscription stayed
  // unset — the resume-setup wizard looped back to the same screen forever.
  //
  // Errors are logged but never block cycle creation.
  try {
    const activitySubscriptionService = require('../../../farmer/services/activitySubscriptionService');
    const { CropMaster } = getDb();
    let activityCode = 'CROP';
    if (data.cropId) {
      const crop = await CropMaster.findOne({
        where: { crop_id: data.cropId },
        attributes: ['crop_group'],
      });
      const group = (crop?.crop_group || '').toLowerCase();
      if (group === 'fruits' || group === 'vegetables' || group === 'flowers') {
        activityCode = 'HORTI';
      }
    }
    await activitySubscriptionService.markActivitySetupComplete(farmerId, activityCode);
  } catch (err) {
    logger.warn(`markActivitySetupComplete failed for farmer ${farmerId}: ${err.message}`);
  }

  // Phase 2A — fire-and-forget the SAGE crop advisory engine for the new
  // cycle so the farmer sees stage-aware advisories immediately on /sage
  // without waiting for the (off-by-default) cron. Engine errors are
  // logged but never block cycle creation — the cycle row is the source
  // of truth and the engine can always be re-run later.
  if (resolvedPopId) {
    setImmediate(async () => {
      try {
        const cropAdvisoryEngine = require('../../../sage/services/cropAdvisoryEngine');
        const r = await cropAdvisoryEngine.runForCycle(cycle.id);
        logger.info(`auto-engine for cycle ${cycle.id}: emitted=${r.emitted ?? 0} skipped=${r.skipped ?? 0} reason=${r.reason || 'ok'}`);
      } catch (err) {
        logger.warn(`auto-engine for cycle ${cycle.id} failed: ${err.message}`);
      }
    });
  }

  return { cycleId: cycle.id, cycleUuid: cycle.cycle_uuid, status: cycle.cycle_status };
};

const getCycleWorkbands = async (farmerId, cycleId) => {
  const { CultivationCycle, WorkbandExecution, TaskExecution, Field, FarmRegister, PopWorkband, PopTask, PopTaskInput, InputItem, InputUnit } = getDb();

  const cycle = await CultivationCycle.findOne({
    where: { id: cycleId, is_active: true },
    include: [{ model: Field, as: 'field', include: [{ model: FarmRegister, as: 'farmRegister', where: { farmer_id: farmerId } }] }],
  });
  if (!cycle) { const err = new Error('Cycle not found'); err.statusCode = 404; throw err; }

  // Build the enriched include tree — join PoP template data for names/inputs
  const enrichedInclude = [
    {
      model: TaskExecution, as: 'taskExecutions', where: { is_active: true }, required: false,
      include: [
        {
          model: PopTask, as: 'popTask', required: false,
          include: [
            {
              model: PopTaskInput, as: 'popTaskInputs', required: false,
              include: [
                { model: InputItem, as: 'inputItem', required: false },
                { model: InputUnit, as: 'inputUnit', required: false },
              ],
            },
          ],
        },
      ],
    },
    { model: PopWorkband, as: 'popWorkband', required: false },
  ];

  // Get workband executions or create from PoP template
  let workbands = await WorkbandExecution.findAll({
    where: { cycle_id: cycle.cycle_uuid, is_active: true },
    include: enrichedInclude,
    order: [['id', 'ASC']],
  });

  // If no executions exist and PoP is linked, initialize from template
  if (workbands.length === 0 && cycle.pop_id) {
    const popWorkbands = await PopWorkband.findAll({
      where: { pop_id: cycle.pop_id, is_active: true },
      include: [{ model: PopTask, as: 'popTasks', where: { is_active: true }, required: false }],
      order: [['workband_order', 'ASC']],
    });

    const initTransaction = await getDb().sequelize.transaction();
    try {
      for (const wb of popWorkbands) {
        const wbExec = await WorkbandExecution.create({
          execution_uuid: generateUUID(), cycle_id: cycle.cycle_uuid,
          pop_workband_id: wb.id, workband_status: 'planned',
        }, { transaction: initTransaction });

        for (const task of (wb.popTasks || [])) {
          await TaskExecution.create({
            execution_uuid: generateUUID(), workband_execution_id: wbExec.id,
            pop_task_id: task.id, task_status: 'planned',
          }, { transaction: initTransaction });
        }
      }
      await initTransaction.commit();
    } catch (err) {
      await initTransaction.rollback();
      throw err;
    }

    // Re-fetch with enriched includes after initialization
    workbands = await WorkbandExecution.findAll({
      where: { cycle_id: cycle.cycle_uuid, is_active: true },
      include: enrichedInclude,
      order: [['id', 'ASC']],
    });
  }

  // Map to enriched DTO with template names + recommended inputs
  const mapped = workbands.map((wb) => {
    const popWb = wb.popWorkband;
    return {
      id: wb.id,
      execution_uuid: wb.execution_uuid,
      pop_workband_id: wb.pop_workband_id,
      workband_name: popWb?.workband_name || `Stage ${wb.id}`,
      workband_order: popWb?.workband_order || 0,
      days_from_sowing_start: popWb?.days_from_sowing_start || null,
      days_from_sowing_end: popWb?.days_from_sowing_end || null,
      description: popWb?.workband_description || null,
      workband_status: wb.workband_status,
      workband_start_date: wb.workband_start_date,
      workband_end_date: wb.workband_end_date,
      workband_completion_percentage: wb.workband_completion_percentage,
      workband_notes: wb.workband_notes,
      taskExecutions: (wb.taskExecutions || []).map((te) => {
        const popTask = te.popTask;
        const inputs = (popTask?.popTaskInputs || []).map((inp) => ({
          input_item_id: inp.input_item_id,
          input_name: inp.inputItem?.item_name || inp.inputItem?.item_common_name || `Input #${inp.input_item_id}`,
          recommended_qty: parseFloat(inp.input_quantity) || 0,
          unit: inp.inputUnit?.unit_name || inp.inputUnit?.unit_abbreviation || 'units',
        }));
        return {
          id: te.id,
          execution_uuid: te.execution_uuid,
          pop_task_id: te.pop_task_id,
          task_name: popTask?.task_name || `Task ${te.id}`,
          task_description: popTask?.task_description || null,
          task_status: te.task_status,
          task_completion_percentage: te.task_completion_percentage,
          is_optional: popTask?.is_optional || false,
          estimated_labor_hours: popTask?.estimated_labor_hours || null,
          task_start_date: te.task_start_date,
          task_end_date: te.task_end_date,
          task_notes: te.task_notes,
          recommended_inputs: inputs,
        };
      }),
    };
  });

  return { workbands: mapped };
};

// ─── Workband & Task Execution ────────────────────────────────────

const executeWorkband = async (workbandId, data) => {
  const { WorkbandExecution } = getDb();
  const wb = await WorkbandExecution.findByPk(workbandId);
  if (!wb) { const err = new Error('Workband not found'); err.statusCode = 404; throw err; }

  await wb.update({
    workband_start_date: data.startDate,
    workband_end_date: data.endDate || null,
    workband_status: data.endDate ? 'completed' : 'in_progress',
    workband_notes: data.notes || null,
  });

  // Emit stage event if completed
  if (data.endDate) {
    try {
      const { CultivationCycle } = getDb();
      const cycle = await CultivationCycle.findOne({ where: { cycle_uuid: wb.cycle_id, is_active: true } });
      if (cycle) {
        const { emitStageCompleted } = require('./complianceEventEmitter');
        await emitStageCompleted(cycle.farmer_id, cycle.cycle_uuid, data.workbandName || 'unknown', null);
      }
    } catch (emitErr) {
      logger.warn('Failed to emit stage.completed event', { error: emitErr.message });
    }
  }

  return { executionId: wb.id, status: data.endDate ? 'completed' : 'in_progress' };
};

const executeTask = async (taskId, data) => {
  const { TaskExecution, TaskExecutionInputLog, TaskExecutionLaborLog, TaskExecutionMachineryLog, TaskExecutionPhoto } = getDb();

  const task = await TaskExecution.findByPk(taskId);
  if (!task) { const err = new Error('Task not found'); err.statusCode = 404; throw err; }

  await task.update({
    task_start_date: data.startDate,
    task_status: 'in_progress',
    task_completion_percentage: data.completionPercentage || 0,
    task_notes: data.notes || null,
  });

  // Log inputs
  if (data.inputs?.length) {
    await TaskExecutionInputLog.bulkCreate(data.inputs.map((inp) => ({
      task_execution_id: task.id,
      input_item_id: inp.inputItemId,
      quantity_used: inp.quantityUsed,
      quantity_unit_id: inp.unitId,
      input_cost: inp.cost || null,
    })));
  }

  // Log labor
  if (data.labor?.length) {
    await TaskExecutionLaborLog.bulkCreate(data.labor.map((lab) => ({
      task_execution_id: task.id,
      labor_type: lab.laborType,
      labor_count: lab.laborCount,
      labor_hours: lab.laborHours,
      labor_wage_per_day: lab.wagePerDay || null,
      total_labor_cost: lab.wagePerDay ? lab.laborCount * lab.wagePerDay : null,
    })));
  }

  // Log machinery
  if (data.machinery?.length) {
    await TaskExecutionMachineryLog.bulkCreate(data.machinery.map((m) => ({
      task_execution_id: task.id,
      machinery_type: m.machineryType,
      hours_used: m.hoursUsed,
      machinery_hire_cost: m.hireCost || null,
      is_hired: true,
    })));
  }

  // Log photos
  if (data.photos?.length) {
    await TaskExecutionPhoto.bulkCreate(data.photos.map((mediaId) => ({
      task_execution_id: task.id,
      photo_uuid: generateUUID(),
      media_asset_id: mediaId,
      photo_type: 'during_task',
    })));
    await task.update({ execution_photo_count: (task.execution_photo_count || 0) + data.photos.length });
  }

  logger.info(`Task ${taskId} execution started`);
  return { executionId: task.id, status: 'in_progress' };
};

const completeTask = async (taskId, data) => {
  const { TaskExecution } = getDb();
  const task = await TaskExecution.findByPk(taskId);
  if (!task) { const err = new Error('Task not found'); err.statusCode = 404; throw err; }

  await task.update({
    task_end_date: data.endDate,
    task_status: 'completed',
    task_completion_percentage: 100,
    task_notes: data.finalNotes ? `${task.task_notes || ''}\n${data.finalNotes}`.trim() : task.task_notes,
  });

  // Emit compliance update after task completion
  try {
    const { WorkbandExecution, CultivationCycle } = getDb();
    const wb = await WorkbandExecution.findByPk(task.workband_execution_id);
    if (wb) {
      const cycle = await CultivationCycle.findOne({ where: { cycle_uuid: wb.cycle_id, is_active: true } });
      if (cycle) {
        const varianceService = require('./varianceService');
        const snapshot = await varianceService.computeCycleComplianceScore(cycle.id);
        const { emitComplianceUpdate } = require('./complianceEventEmitter');
        await emitComplianceUpdate(cycle.farmer_id, 'CROP', cycle.id, snapshot);
      }
    }
  } catch (emitErr) {
    logger.warn('Failed to emit compliance update after task completion', { error: emitErr.message });
  }

  logger.info(`Task ${taskId} completed`);
  return { executionId: task.id, status: 'completed' };
};

// ─── Harvest & Sales ──────────────────────────────────────────────

const recordHarvest = async (farmerId, cycleId, data) => {
  const { HarvestRecord, CultivationCycle } = getDb();
  const harvestEventBridge = require('./harvestEventBridge');

  const cycle = await CultivationCycle.findByPk(cycleId);
  if (!cycle) { const err = new Error('Cycle not found'); err.statusCode = 404; throw err; }

  const record = await HarvestRecord.create({
    record_uuid: generateUUID(), cycle_id: cycle.cycle_uuid,
    harvest_start_date: data.harvestStartDate,
    harvest_end_date: data.harvestEndDate || null,
    total_harvest_quantity_kg: data.totalQuantityKg,
    harvest_quality_grade: data.qualityGrade || null,
    harvest_notes: data.notes || null,
  });

  await cycle.update({ cycle_status: 'post_harvest', cycle_actual_harvest_date: data.harvestEndDate || data.harvestStartDate });

  // ─── PULSE × DICE × SAGE Trigger ───────────────────────────────
  // Non-blocking: harvest recording succeeds even if bridge fails
  const pulseDiceResult = await harvestEventBridge.onHarvestComplete({
    farmerId, cycle, harvestRecord: record
  });

  logger.info(`Harvest recorded: ${record.record_uuid}, cycle: ${cycle.cycle_uuid}, bridge: ${pulseDiceResult.triggered}`);
  return {
    harvestRecordId: record.id,
    recordUuid: record.record_uuid,
    postHarvestIntelligence: pulseDiceResult.triggered ? {
      optimalStrategy: pulseDiceResult.recommendation?.optimalStrategy,
      currentPrice: pulseDiceResult.currentMarket?.currentPrice,
      forecasts: pulseDiceResult.forecasts,
      topupEligible: pulseDiceResult.recommendation?.topupEligible,
      topupMaxAmount: pulseDiceResult.recommendation?.topupMaxAmount
    } : null
  };
};

const recordSale = async (farmerId, harvestRecordId, data) => {
  const { HarvestSaleRecord, HarvestRecord } = getDb();
  const harvestEventBridge = require('./harvestEventBridge');

  const grossValue = data.quantitySold * data.pricePerKg;
  const transportCost = data.transportationCost || 0;
  const marketFees = data.marketFees || 0;
  const netValue = grossValue - transportCost - marketFees;

  const sale = await HarvestSaleRecord.create({
    record_uuid: generateUUID(), harvest_record_id: harvestRecordId,
    sale_date: data.saleDate,
    quantity_sold_kg: data.quantitySold,
    price_per_kg: data.pricePerKg,
    gross_sale_value: grossValue,
    transportation_cost: transportCost,
    market_fees_cost: marketFees,
    net_sale_value: netValue,
    buyer_name: data.buyerName || null,
    buyer_type: data.buyerType || null,
  });

  // ─── DICE Auto-Repay Trigger ────────────────────────────────────
  // If farmer has an active post-harvest topup loan, auto-repay from sale proceeds
  const harvestRecord = await HarvestRecord.findByPk(harvestRecordId);
  const autoRepayResult = await harvestEventBridge.onHarvestSaleRecorded({
    farmerId, saleRecord: sale, harvestRecord
  });

  logger.info(`Sale recorded: ${sale.record_uuid}, net: ${netValue}, autoRepay: ${autoRepayResult.autoRepayTriggered}`);
  return {
    saleRecordId: sale.id,
    netValue,
    autoRepay: autoRepayResult.autoRepayTriggered ? {
      repaymentAmount: autoRepayResult.repaymentAmount,
      newOutstanding: autoRepayResult.newOutstanding,
      topupStatus: autoRepayResult.topupStatus
    } : null
  };
};

// ─── Cycle Summary ────────────────────────────────────────────────

const getCycleSummary = async (farmerId, cycleId) => {
  const { CultivationCycle, CultivationCyclePlanning, CultivationCycleExpenseSummary, CultivationCycleIncomeSummary, CultivationCycleProfitability, CultivationCycleBenchmarking, CultivationCycleHealthMonitoring, HarvestRecord, HarvestSaleRecord, Field, FarmRegister } = getDb();

  const cycle = await CultivationCycle.findOne({
    where: { id: cycleId, is_active: true },
    include: [{ model: Field, as: 'field', include: [{ model: FarmRegister, as: 'farmRegister', where: { farmer_id: farmerId } }] }],
  });
  if (!cycle) { const err = new Error('Cycle not found'); err.statusCode = 404; throw err; }

  const [planning, expenses, income, profitability, benchmarking, healthMonitoring, harvests] = await Promise.all([
    CultivationCyclePlanning.findOne({ where: { cycle_id: cycle.cycle_uuid, is_active: true } }),
    CultivationCycleExpenseSummary.findOne({ where: { cycle_id: cycle.cycle_uuid, is_active: true } }),
    CultivationCycleIncomeSummary.findOne({ where: { cycle_id: cycle.cycle_uuid, is_active: true } }),
    CultivationCycleProfitability.findOne({ where: { cycle_id: cycle.cycle_uuid, is_active: true } }),
    CultivationCycleBenchmarking.findOne({ where: { cycle_id: cycle.cycle_uuid, is_active: true } }),
    CultivationCycleHealthMonitoring.findAll({ where: { cycle_id: cycle.cycle_uuid, is_active: true }, order: [['monitoring_date', 'DESC']], limit: 5 }),
    HarvestRecord.findAll({ where: { cycle_id: cycle.cycle_uuid, is_active: true }, include: [{ model: HarvestSaleRecord, as: 'sales', required: false }] }),
  ]);

  return {
    cycle: { id: cycle.id, uuid: cycle.cycle_uuid, status: cycle.cycle_status, season: cycle.cycle_season, year: cycle.cycle_year },
    planning, expenses, income, profitability, benchmarking, healthMonitoring, harvests,
  };
};

// ─── Post-Harvest PULSE × DICE Intelligence ─────────────────────

const getCyclePulseRealisation = async (farmerId, cycleId) => {
  const { CultivationCycle, HarvestRecord, PulseSellRecommendation, DicePriceRealisationSnapshot, Field, FarmRegister } = getDb();

  const cycle = await CultivationCycle.findOne({
    where: { id: cycleId, is_active: true },
    include: [{ model: Field, as: 'field', include: [{ model: FarmRegister, as: 'farmRegister', where: { farmer_id: farmerId } }] }],
  });
  if (!cycle) { const err = new Error('Cycle not found'); err.statusCode = 404; throw err; }

  if (cycle.cycle_status !== 'post_harvest' && cycle.cycle_status !== 'closed') {
    return { available: false, reason: 'Cycle has not reached post-harvest stage yet', cycleStatus: cycle.cycle_status };
  }

  // Fetch the latest PULSE sell recommendation for this cycle
  const recommendation = await PulseSellRecommendation.findOne({
    where: { farmer_id: farmerId, cycle_id: cycle.cycle_uuid, is_active: true },
    order: [['recommendation_generated_date', 'DESC']]
  });

  // Fetch the latest DICE price realisation snapshot
  const snapshot = await DicePriceRealisationSnapshot.findOne({
    where: { farmer_id: farmerId, is_active: true },
    order: [['snapshot_date', 'DESC']]
  });

  // Fetch harvest records
  const harvests = await HarvestRecord.findAll({
    where: { cycle_id: cycle.cycle_uuid, is_active: true }
  });

  const totalHarvestKg = harvests.reduce((sum, h) => sum + parseFloat(h.total_harvest_quantity_kg || 0), 0);

  return {
    available: true,
    cycle: {
      id: cycle.id,
      uuid: cycle.cycle_uuid,
      status: cycle.cycle_status,
      cropId: cycle.crop_id,
      harvestDate: cycle.cycle_actual_harvest_date
    },
    harvest: {
      totalQuantityKg: totalHarvestKg,
      totalQuantityQuintals: totalHarvestKg / 100,
      records: harvests.map(h => ({
        id: h.id,
        uuid: h.record_uuid,
        quantityKg: parseFloat(h.total_harvest_quantity_kg),
        qualityGrade: h.harvest_quality_grade,
        startDate: h.harvest_start_date,
        endDate: h.harvest_end_date
      }))
    },
    recommendation: recommendation ? {
      id: recommendation.id,
      optimalStrategy: recommendation.optimal_strategy,
      recommendedTiming: recommendation.recommended_timing,
      recommendedPrice: parseFloat(recommendation.recommended_price),
      rationale: recommendation.rationale,
      mandiOptions: recommendation.mandi_recommendations ? JSON.parse(recommendation.mandi_recommendations) : [],
      loanOutstanding: parseFloat(recommendation.loan_outstanding_at_recommendation || 0),
      sellNowRealisation: parseFloat(recommendation.sell_now_realisation || 0),
      store15dRealisation: parseFloat(recommendation.store_15d_realisation || 0),
      store30dRealisation: parseFloat(recommendation.store_30d_realisation || 0),
      topupEligible: recommendation.topup_loan_eligible,
      topupMaxAmount: parseFloat(recommendation.topup_loan_max_amount || 0),
      generatedDate: recommendation.recommendation_generated_date
    } : null,
    priceSnapshot: snapshot ? {
      currentMandiPrice: parseFloat(snapshot.current_mandi_price || 0),
      sellNow: {
        gross: parseFloat(snapshot.sell_now_gross || 0),
        net: parseFloat(snapshot.sell_now_net || 0),
        surplusDeficit: parseFloat(snapshot.sell_now_surplus_deficit || 0)
      },
      store15Days: {
        predictedPrice: parseFloat(snapshot.predicted_price_15d || 0),
        confidence: parseFloat(snapshot.confidence_15d || 0),
        net: parseFloat(snapshot.store_15d_net || 0),
        surplusDeficit: parseFloat(snapshot.store_15d_surplus_deficit || 0)
      },
      store30Days: {
        predictedPrice: parseFloat(snapshot.predicted_price_30d || 0),
        confidence: parseFloat(snapshot.confidence_30d || 0),
        net: parseFloat(snapshot.store_30d_net || 0),
        surplusDeficit: parseFloat(snapshot.store_30d_surplus_deficit || 0)
      },
      recommendedStrategy: snapshot.recommended_strategy,
      topupEligible: snapshot.topup_eligible,
      snapshotDate: snapshot.snapshot_date
    } : null
  };
};

// ─── List farmer's cycles ─────────────────────────────────────────

/**
 * List all cultivation cycles belonging to a farmer. Used by the new
 * persona-based /activity-crop drill-in screen which needs one call to
 * render all running + recent cycles for the farmer.
 *
 * Enriches each row with crop_name, crop_code, variety_name (if linked).
 * Field linkage is optional — cycles created via the crop-card shortcut
 * may have a null field_id.
 */
const listMyCycles = async (farmerId, opts = {}) => {
  const { CultivationCycle, CropMaster, VarietyMaster, Field, FarmRegister } = getDb();
  const { Op } = require('sequelize');

  const where = { farmer_id: farmerId, is_active: true };
  if (opts.status) where.cycle_status = opts.status;
  // By default, exclude closed cycles unless includeClosed=true
  if (!opts.includeClosed && !opts.status) {
    where.cycle_status = { [Op.ne]: 'closed' };
  }

  const cycles = await CultivationCycle.findAll({
    where,
    include: [
      {
        model: Field,
        as: 'field',
        required: false,
        include: [{ model: FarmRegister, as: 'farmRegister', required: false }],
      },
    ],
    order: [['cycle_sowing_date', 'DESC']],
    limit: opts.limit || 50,
  });

  if (cycles.length === 0) return [];

  // Batch-load crop + variety names. Note: cultivation_cycles.crop_id and
  // cultivation_cycles.variety_id are STRING(36) UUIDs, not numeric PKs —
  // they join on CropMaster.crop_id / VarietyMaster.variety_id (the UUID
  // columns), not on the autoincrement `id` column.
  const cropIds = [...new Set(cycles.map((c) => c.crop_id).filter(Boolean))];
  const varietyIds = [...new Set(cycles.map((c) => c.variety_id).filter(Boolean))];

  const [crops, varieties] = await Promise.all([
    cropIds.length ? CropMaster.findAll({ where: { crop_id: cropIds } }) : [],
    varietyIds.length ? VarietyMaster.findAll({ where: { variety_id: varietyIds } }) : [],
  ]);

  const cropById = Object.fromEntries(crops.map((c) => [c.crop_id, c]));
  const varietyById = Object.fromEntries(varieties.map((v) => [v.variety_id, v]));

  return cycles.map((c) => {
    const crop = cropById[c.crop_id];
    const variety = varietyById[c.variety_id];
    return {
      cycleId: c.id,
      cycleUuid: c.cycle_uuid,
      cropId: c.crop_id,
      cropCode: crop?.crop_code || null,
      cropName: crop?.crop_name || null,
      varietyId: c.variety_id,
      varietyName: variety?.variety_name || null,
      season: c.cycle_season,
      year: c.cycle_year,
      sowingDate: c.cycle_sowing_date,
      expectedHarvestDate: c.cycle_expected_harvest_date,
      actualHarvestDate: c.cycle_actual_harvest_date,
      status: c.cycle_status,
      fieldId: c.field_id,
      fieldName: c.field?.field_name || null,
      fieldSizeHectares: c.field?.field_size_hectares || null,
      popId: c.pop_id,
      selfDeclaredCrop: c.self_declared_crop,
    };
  });
};

module.exports = {
  registerFarm, addField, createCycle, getCycleWorkbands,
  executeWorkband, executeTask, completeTask,
  recordHarvest, recordSale, getCycleSummary,
  getCyclePulseRealisation,
  listMyCycles,
};
