/**
 * Task Controller
 * Handles HTTP requests for SATHI task operations: list, detail, start, update, complete.
 */

const taskService = require('../services/taskService');
const evidenceService = require('../services/evidenceService');
const { success } = require('../../../shared/utils/responseHelper');
const { User, FieldAgentProfile } = require('../../../shared/models');

/**
 * Resolves internal user ID from JWT UUID.
 */
const resolveUserId = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }
  return user.id;
};

/**
 * Resolves agent profile ID from agent user ID (route param).
 */
const resolveAgentId = async (agentUserId) => {
  const agent = await FieldAgentProfile.findOne({
    where: { agent_user_id: agentUserId, is_active: true },
  });
  if (!agent) {
    const err = new Error('Agent profile not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }
  return agent.id;
};

/** GET /sathi/agent/:agentId/tasks */
const getAgentTasks = async (req, res, next) => {
  try {
    const agentId = await resolveAgentId(parseInt(req.params.agentId, 10));
    const result = await taskService.getAgentTasks(agentId, req.query);
    return success(res, {
      message: 'Agent tasks retrieved successfully',
      data: result.tasks,
      meta: { total: result.total },
    });
  } catch (err) { next(err); }
};

/** GET /sathi/tasks/:taskId */
const getTaskDetail = async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(parseInt(req.params.taskId, 10));
    return success(res, { message: 'Task details retrieved', data: task });
  } catch (err) { next(err); }
};

/** POST /sathi/tasks/:taskId/start */
const startTask = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const result = await taskService.startTask(parseInt(req.params.taskId, 10), userId, req.body);
    return success(res, { message: 'Task started', data: result });
  } catch (err) { next(err); }
};

/** POST /sathi/tasks/:taskId/update */
const updateTask = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const result = await taskService.updateTask(parseInt(req.params.taskId, 10), userId, req.body);
    return success(res, { message: 'Task updated', data: result });
  } catch (err) { next(err); }
};

/** POST /sathi/tasks/:taskId/complete */
const completeTask = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const result = await taskService.completeTask(parseInt(req.params.taskId, 10), userId, req.body);
    return success(res, { message: 'Task completed', data: result });
  } catch (err) { next(err); }
};

/** GET /sathi/evidence/:bundleId */
const getEvidenceBundle = async (req, res, next) => {
  try {
    const result = await evidenceService.getEvidenceBundle(parseInt(req.params.bundleId, 10));
    return success(res, { message: 'Evidence bundle retrieved', data: result });
  } catch (err) { next(err); }
};

module.exports = {
  getAgentTasks,
  getTaskDetail,
  startTask,
  updateTask,
  completeTask,
  getEvidenceBundle,
};
