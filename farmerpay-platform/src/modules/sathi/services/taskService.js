/**
 * Task Service
 * Business logic for SATHI task assignment, execution, and lifecycle management.
 */

const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

/**
 * Retrieves tasks assigned to a specific agent with optional filtering.
 */
const getAgentTasks = async (agentId, filters = {}) => {
  const { SathiTask, FieldAgentProfile } = getDb();

  const where = { assigned_to_agent_id: agentId, is_active: true };
  if (filters.status) where.task_status = filters.status;
  if (filters.priority) where.task_priority = filters.priority;

  const limit = filters.limit || 20;
  const offset = filters.offset || 0;

  const { count, rows } = await SathiTask.findAndCountAll({
    where,
    order: [
      ['task_priority', 'ASC'],
      ['due_date', 'ASC'],
    ],
    limit,
    offset,
  });

  return { tasks: rows, total: count };
};

/**
 * Retrieves a single task with its executions and entity details.
 */
const getTaskById = async (taskId) => {
  const { SathiTask, SathiTaskExecution, SathiEvidenceBundle, FieldAgentProfile } = getDb();

  const task = await SathiTask.findOne({
    where: { id: taskId, is_active: true },
    include: [
      {
        model: SathiTaskExecution,
        as: 'executions',
        where: { is_active: true },
        required: false,
        include: [
          { model: SathiEvidenceBundle, as: 'evidenceBundles', where: { is_active: true }, required: false },
        ],
      },
      { model: FieldAgentProfile, as: 'agent' },
    ],
  });

  if (!task) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  return task;
};

/**
 * Starts task execution with GPS location tracking.
 */
const startTask = async (taskId, agentUserId, data) => {
  const { SathiTask, SathiTaskExecution, SathiAuditLog, FieldAgentProfile } = getDb();

  const task = await SathiTask.findOne({ where: { id: taskId, is_active: true } });
  if (!task) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  if (task.task_status !== 'assigned') {
    const err = new Error('Task is not in assigned status');
    err.statusCode = 400;
    err.errorCode = 'VAL_002';
    throw err;
  }

  // Verify agent owns this task
  const agentProfile = await FieldAgentProfile.findOne({
    where: { agent_user_id: agentUserId, is_active: true },
  });
  if (!agentProfile || agentProfile.id !== task.assigned_to_agent_id) {
    const err = new Error('You are not assigned to this task');
    err.statusCode = 403;
    err.errorCode = 'AUTH_005';
    throw err;
  }

  const execution = await SathiTaskExecution.create({
    execution_uuid: uuidv4(),
    task_id: taskId,
    start_timestamp: new Date(),
    execution_location_latitude: data.latitude,
    execution_location_longitude: data.longitude,
    execution_location_accuracy_meters: data.accuracy || null,
    execution_status: 'in_progress',
  });

  await task.update({ task_status: 'in_progress' });

  await SathiAuditLog.create({
    audit_id: uuidv4(),
    task_id: taskId,
    execution_id: execution.id,
    action_type: 'task_started',
    action_by: agentUserId,
    action_at: new Date(),
    action_details: { latitude: data.latitude, longitude: data.longitude },
  });

  logger.info(`Task ${taskId} started by agent ${agentUserId}`);
  return { executionId: execution.id, startedAt: execution.start_timestamp };
};

/**
 * Updates an in-progress task execution with notes and photo count.
 */
const updateTask = async (taskId, agentUserId, data) => {
  const { SathiTaskExecution, SathiAuditLog } = getDb();

  const execution = await SathiTaskExecution.findOne({
    where: { task_id: taskId, execution_status: 'in_progress', is_active: true },
    order: [['created_at', 'DESC']],
  });

  if (!execution) {
    const err = new Error('No active execution found for this task');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const updates = {};
  if (data.notes) updates.execution_notes = data.notes;
  if (data.photosUploaded != null) updates.completion_photo_count = data.photosUploaded;

  await execution.update(updates);

  await SathiAuditLog.create({
    audit_id: uuidv4(),
    task_id: taskId,
    execution_id: execution.id,
    action_type: 'task_updated',
    action_by: agentUserId,
    action_at: new Date(),
    action_details: updates,
  });

  return { executionId: execution.id, status: 'in_progress' };
};

/**
 * Completes a task with end GPS, evidence bundle, and notes.
 */
const completeTask = async (taskId, agentUserId, data) => {
  const {
    SathiTask, SathiTaskExecution, SathiEvidenceBundle,
    SathiEvidenceItem, SathiAuditLog,
  } = getDb();

  const execution = await SathiTaskExecution.findOne({
    where: { task_id: taskId, execution_status: 'in_progress', is_active: true },
    order: [['created_at', 'DESC']],
  });

  if (!execution) {
    const err = new Error('No active execution found for this task');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  // Update execution
  await execution.update({
    end_timestamp: new Date(),
    execution_status: 'completed',
    execution_notes: data.notes || execution.execution_notes,
  });

  // Create evidence bundle
  const bundle = await SathiEvidenceBundle.create({
    bundle_uuid: uuidv4(),
    task_execution_id: execution.id,
    bundle_type: data.evidenceBundle.type,
    bundle_submission_date: new Date(),
    bundle_verification_status: 'submitted',
  });

  // Create evidence items
  const itemPromises = data.evidenceBundle.items.map((item) =>
    SathiEvidenceItem.create({
      bundle_id: bundle.id,
      evidence_item_uuid: uuidv4(),
      evidence_type: item.evidenceType,
      document_id: item.documentId || null,
      media_asset_id: item.mediaAssetId || null,
      gps_latitude: item.gpsLatitude || null,
      gps_longitude: item.gpsLongitude || null,
      signature_url: item.signatureUrl || null,
    })
  );
  await Promise.all(itemPromises);

  // Update task status
  const task = await SathiTask.findByPk(taskId);
  await task.update({ task_status: 'completed', completed_at: new Date() });

  await SathiAuditLog.create({
    audit_id: uuidv4(),
    task_id: taskId,
    execution_id: execution.id,
    action_type: 'task_completed',
    action_by: agentUserId,
    action_at: new Date(),
    action_details: {
      endLatitude: data.endLatitude,
      endLongitude: data.endLongitude,
      bundleId: bundle.id,
      evidenceItemCount: data.evidenceBundle.items.length,
    },
  });

  logger.info(`Task ${taskId} completed by agent ${agentUserId}, bundle ${bundle.id}`);
  return { executionId: execution.id, status: 'completed', bundleId: bundle.id };
};

module.exports = {
  getAgentTasks,
  getTaskById,
  startTask,
  updateTask,
  completeTask,
};
