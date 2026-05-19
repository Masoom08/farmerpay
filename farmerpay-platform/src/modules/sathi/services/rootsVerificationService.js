/**
 * ROOTS Verification Service — Creates and completes field verification
 * tasks for Sathis triggered by the Variance Engine's red flags.
 */

const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');
const { generateUUID } = require('../../../shared/utils/uuidHelper');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

const MS_PER_DAY = 86400000;

const PRIORITY_MAP = { CRITICAL: 'urgent', HIGH: 'high', MEDIUM: 'medium', LOW: 'low' };

/* ====================================================================
 * 1. createRootsVerificationTask
 * ==================================================================== */

const createRootsVerificationTask = async (farmerId, triggerReason, specificConcerns = []) => {
  const { SathiTask, ChoiceAssignment, sequelize } = getDb();

  // Find assigned Sathi
  const assignment = await ChoiceAssignment.findOne({
    where: { farmer_id: farmerId, is_active: true },
    attributes: ['intermediary_id'],
  });

  if (!assignment) {
    logger.warn(`No Sathi assigned for farmer ${farmerId}, skipping verification task`);
    return null;
  }

  const priority = PRIORITY_MAP[triggerReason] || 'medium';

  // Build checklist from concerns
  const checklist = buildChecklist(specificConcerns);

  const t = await sequelize.transaction();
  try {
    const task = await SathiTask.create({
      task_uuid: generateUUID(),
      assigned_to_agent_id: assignment.intermediary_id,
      farmer_id: farmerId,
      task_type: 'roots_field_verification',
      task_title: `ROOTS Verification: ${specificConcerns[0] || triggerReason || 'Field check'}`,
      task_description: `Verify farmer's ROOTS data in field. Concerns: ${specificConcerns.join(', ') || 'General compliance check'}.`,
      task_priority: priority,
      task_status: 'assigned',
      assigned_at: new Date(),
      due_date: new Date(Date.now() + 3 * MS_PER_DAY).toISOString().slice(0, 10),
      task_entity_type: 'roots_verification',
      task_entity_id: farmerId,
      is_active: true,
    }, { transaction: t });

    await t.commit();

    logger.info(`ROOTS verification task created: ${task.task_uuid} for farmer ${farmerId}`);
    return {
      taskId: task.id,
      taskUuid: task.task_uuid,
      assignedTo: assignment.intermediary_id,
      priority,
      checklist,
    };
  } catch (err) {
    await t.rollback();
    logger.error('Failed to create ROOTS verification task', { farmerId, error: err.message });
    throw err;
  }
};

const buildChecklist = (concerns) => {
  const items = [
    { id: 'crop_standing', label: 'Verify crop is standing in the field', evidenceType: 'photo', required: true },
    { id: 'field_area', label: 'Verify field area matches records', evidenceType: 'gps', required: true },
    { id: 'current_stage', label: 'Identify current crop growth stage', evidenceType: 'photo', required: true },
    { id: 'farmer_interview', label: 'Interview farmer about farming practices', evidenceType: 'text', required: true },
  ];

  // Add concern-specific items
  if (concerns.includes('NO_DATA_ENTRY') || concerns.includes('no_data')) {
    items.push({ id: 'data_gap_reason', label: 'Ask farmer why no data was entered', evidenceType: 'text', required: true });
    items.push({ id: 'assist_entry', label: 'Assist farmer in entering missing data', evidenceType: 'text', required: false });
  }
  if (concerns.includes('COST_ANOMALY') || concerns.includes('cost')) {
    items.push({ id: 'input_receipts', label: 'Check input purchase receipts', evidenceType: 'photo', required: true });
    items.push({ id: 'input_bags', label: 'Photo of input bags/packaging', evidenceType: 'photo', required: false });
  }
  if (concerns.includes('CRITICAL_STAGE_MISSED') || concerns.includes('missed_stage')) {
    items.push({ id: 'missed_stage_check', label: 'Verify if stage was actually done but not logged', evidenceType: 'text', required: true });
  }
  if (concerns.includes('YIELD_ANOMALY') || concerns.includes('yield')) {
    items.push({ id: 'harvest_estimate', label: 'Estimate standing crop yield visually', evidenceType: 'text', required: true });
  }
  if (concerns.includes('BACKFILL_SUSPECTED') || concerns.includes('backfill')) {
    items.push({ id: 'timeline_verify', label: 'Verify actual dates of farming activities', evidenceType: 'text', required: true });
  }
  if (concerns.includes('soil_health')) {
    items.push({ id: 'shc_capture', label: 'Help farmer capture Soil Health Card', evidenceType: 'photo', required: false });
  }

  return items;
};

/* ====================================================================
 * 2. completeVerification
 * ==================================================================== */

const completeVerification = async (taskId, agentId, verificationData) => {
  const {
    SathiTask, SathiTaskExecution, SathiEvidenceBundle, SathiEvidenceItem,
    RootsComplianceSnapshot, RootsRedFlag, sequelize,
  } = getDb();

  const task = await SathiTask.findByPk(taskId);
  if (!task || task.task_type !== 'roots_field_verification') {
    const err = new Error('Verification task not found');
    err.statusCode = 404; throw err;
  }

  const t = await sequelize.transaction();
  try {
    // Create task execution
    const execution = await SathiTaskExecution.create({
      execution_uuid: generateUUID(),
      task_id: taskId,
      agent_id: agentId,
      started_at: verificationData.startedAt || new Date(),
      completed_at: new Date(),
      start_latitude: verificationData.gps?.latitude || null,
      start_longitude: verificationData.gps?.longitude || null,
      end_latitude: verificationData.gps?.latitude || null,
      end_longitude: verificationData.gps?.longitude || null,
      execution_notes: JSON.stringify({
        cropStanding: verificationData.cropStanding,
        estimatedStage: verificationData.estimatedStage,
        farmerInterview: verificationData.farmerInterview,
        discrepancies: verificationData.discrepancies || [],
      }),
      is_active: true,
    }, { transaction: t });

    // Create evidence bundle
    const bundle = await SathiEvidenceBundle.create({
      bundle_uuid: generateUUID(),
      task_execution_id: execution.id,
      bundle_type: 'farm_field_verification',
      bundle_submission_date: new Date().toISOString().slice(0, 10),
      bundle_verification_status: 'submitted',
      is_active: true,
    }, { transaction: t });

    // Create evidence items
    if (verificationData.fieldPhotoUrl) {
      await SathiEvidenceItem.create({
        bundle_id: bundle.id,
        evidence_item_uuid: generateUUID(),
        evidence_type: 'photo',
        media_asset_id: null,
        gps_latitude: verificationData.gps?.latitude || null,
        gps_longitude: verificationData.gps?.longitude || null,
        evidence_purpose: 'crop_proof',
        is_active: true,
      }, { transaction: t });
    }

    if (verificationData.gps) {
      await SathiEvidenceItem.create({
        bundle_id: bundle.id,
        evidence_item_uuid: generateUUID(),
        evidence_type: 'gps_location',
        gps_latitude: verificationData.gps.latitude,
        gps_longitude: verificationData.gps.longitude,
        evidence_purpose: 'land_proof',
        is_active: true,
      }, { transaction: t });
    }

    // Mark compliance as sathi-verified
    await RootsComplianceSnapshot.update(
      { sathi_verified: true },
      { where: { farmer_id: task.farmer_id, is_active: true }, transaction: t }
    );

    // Create discrepancy red flags if found
    const discrepancies = verificationData.discrepancies || [];
    for (const disc of discrepancies) {
      await RootsRedFlag.create({
        uuid: generateUUID(),
        farmer_id: task.farmer_id,
        activity_type: disc.activityType || 'CROP',
        activity_reference_id: disc.activityRefId || task.task_entity_id,
        flag_type: 'SATHI_DISCREPANCY',
        severity: disc.severity || 'MEDIUM',
        description: disc.description || 'Sathi field verification found discrepancy',
        evidence_json: {
          taskId,
          bundleId: bundle.id,
          verifiedBy: agentId,
          discrepancyDetail: disc.detail || null,
        },
        status: 'OPEN',
        is_active: true,
      }, { transaction: t });
    }

    // Process assisted entries
    if (verificationData.assistedEntries?.length) {
      // Store as task execution notes — actual ROOTS data entry happens via existing APIs
      logger.info(`ROOTS verification: ${verificationData.assistedEntries.length} assisted entries for farmer ${task.farmer_id}`);
    }

    // Complete the task
    await task.update({
      task_status: 'completed',
      completed_at: new Date(),
    }, { transaction: t });

    await t.commit();

    logger.info(`ROOTS verification completed: task ${taskId}, bundle ${bundle.bundle_uuid}`);
    return {
      taskId,
      bundleId: bundle.bundle_uuid,
      sathiVerified: true,
      discrepanciesFound: discrepancies.length,
    };
  } catch (err) {
    await t.rollback();
    logger.error('ROOTS verification completion failed', { taskId, error: err.message });
    throw err;
  }
};

/* ====================================================================
 * 3. getVerificationChecklist
 * ==================================================================== */

const getVerificationChecklist = async (farmerId, cycleId) => {
  const { CultivationCycle, RootsComplianceSnapshot, RootsRedFlag, SoilHealthRecord, WorkbandExecution } = getDb();

  const cycle = cycleId
    ? await CultivationCycle.findByPk(cycleId)
    : await CultivationCycle.findOne({
      where: { farmer_id: farmerId, is_active: true, cycle_status: { [Op.in]: ['sowing', 'growing', 'monitoring', 'harvesting'] } },
      order: [['created_at', 'DESC']],
    });

  // Determine concerns from data
  const concerns = [];

  if (cycle) {
    const snapshot = await RootsComplianceSnapshot.findOne({
      where: { farmer_id: farmerId, activity_reference_id: cycle.id, is_active: true },
      order: [['snapshot_date', 'DESC']],
    });

    if (snapshot) {
      if (parseFloat(snapshot.overall_compliance_score || 0) < 60) concerns.push('low_compliance');
      if (snapshot.data_completeness_pct < 50) concerns.push('NO_DATA_ENTRY');
    }

    const openFlags = await RootsRedFlag.findAll({
      where: { farmer_id: farmerId, status: 'OPEN', is_active: true },
      attributes: ['flag_type'],
    });
    openFlags.forEach((f) => { if (!concerns.includes(f.flag_type)) concerns.push(f.flag_type); });

    // Check soil health
    if (cycle.field_id) {
      const soil = await SoilHealthRecord.findOne({ where: { field_id: cycle.field_id, is_active: true } });
      if (!soil) concerns.push('soil_health');
    }
  }

  const checklist = buildChecklist(concerns);

  return {
    farmerId,
    cycleId: cycle?.id || null,
    cycleName: cycle?.self_declared_crop || cycle?.crop_id || null,
    concerns,
    checklist,
  };
};

module.exports = {
  createRootsVerificationTask,
  completeVerification,
  getVerificationChecklist,
};
