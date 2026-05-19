/**
 * Choice Controller
 * Handles HTTP requests for CRP/intermediary profiles, tasks, assignments, interactions, and performance.
 */

const choiceService = require('../services/choiceService');
const { success } = require('../../../shared/utils/responseHelper');

/** GET /choice/intermediaries/:choiceId/profile */
const getProfile = async (req, res, next) => {
  try {
    const result = await choiceService.getIntermediaryProfile(req.params.choiceId);
    return success(res, { message: 'Intermediary profile retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /choice/intermediaries/:choiceId/tasks */
const getTasks = async (req, res, next) => {
  try {
    const result = await choiceService.getIntermediaryTasks(req.params.choiceId);
    return success(res, {
      message: 'Intermediary tasks retrieved',
      data: result.tasks,
      meta: { total: result.total },
    });
  } catch (err) { next(err); }
};

/** GET /choice/intermediaries/:choiceId/assigned-farmers */
const getAssignedFarmers = async (req, res, next) => {
  try {
    const result = await choiceService.getAssignedFarmers(req.params.choiceId, req.query);
    return success(res, {
      message: 'Assigned farmers retrieved',
      data: result.farmers,
      meta: { total: result.total },
    });
  } catch (err) { next(err); }
};

/** POST /choice/intermediaries/:choiceId/interaction */
const createInteraction = async (req, res, next) => {
  try {
    const result = await choiceService.createInteraction(req.params.choiceId, req.body);
    return success(res, { message: 'Interaction logged', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

/** GET /choice/intermediaries/:choiceId/performance */
const getPerformance = async (req, res, next) => {
  try {
    const result = await choiceService.getPerformance(
      req.params.choiceId,
      parseInt(req.query.month, 10),
      parseInt(req.query.year, 10)
    );
    return success(res, { message: 'Performance KPIs retrieved', data: result });
  } catch (err) { next(err); }
};

module.exports = {
  getProfile,
  getTasks,
  getAssignedFarmers,
  createInteraction,
  getPerformance,
};
