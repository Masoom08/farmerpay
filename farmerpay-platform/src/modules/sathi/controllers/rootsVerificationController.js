/**
 * ROOTS Verification Controller — Sathi field verification endpoints.
 */

const rootsVerificationService = require('../services/rootsVerificationService');
const { success } = require('../../../shared/utils/responseHelper');
const STATUS_CODES = require('../../../shared/constants/statusCodes');

const createVerification = async (req, res, next) => {
  try {
    const { farmerId, triggerReason, concerns } = req.body;
    const result = await rootsVerificationService.createRootsVerificationTask(farmerId, triggerReason, concerns || []);
    return success(res, { message: 'ROOTS verification task created', data: result, statusCode: STATUS_CODES.CREATED });
  } catch (e) { next(e); }
};

const getChecklist = async (req, res, next) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    // Get farmer from task, then build checklist
    const { SathiTask } = require('../../../shared/models');
    const task = await SathiTask.findByPk(taskId);
    if (!task) { const err = new Error('Task not found'); err.statusCode = 404; throw err; }

    const result = await rootsVerificationService.getVerificationChecklist(task.farmer_id, task.task_entity_id);
    return success(res, { message: 'Verification checklist', data: result });
  } catch (e) { next(e); }
};

const completeVerification = async (req, res, next) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const agentId = req.user?.id;
    const result = await rootsVerificationService.completeVerification(taskId, agentId, req.body);
    return success(res, { message: 'Verification completed', data: result });
  } catch (e) { next(e); }
};

const assistedEntry = async (req, res, next) => {
  try {
    // Delegate to existing task execution endpoints — Sathi logs on behalf of farmer
    const { apiPost } = require('../../../config');
    return success(res, { message: 'Assisted entry noted — use /roots/tasks/:id/execute to log data', data: { taskId: req.params.taskId } });
  } catch (e) { next(e); }
};

module.exports = { createVerification, getChecklist, completeVerification, assistedEntry };
