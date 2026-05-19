/**
 * Recovery Controller
 * Handles recovery case management and action logging.
 */

const recoveryService = require('../services/recoveryService');
const { success } = require('../../../shared/utils/responseHelper');
const { User } = require('../../../shared/models');

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

/** GET /sentinel/recovery/cases */
const getRecoveryCases = async (req, res, next) => {
  try {
    // Force scope: non-ADMIN callers only see cases for loans they reviewed
    // or approved; the bankUserId field is not client-controllable.
    const filters = { ...req.query };
    if (req.user?.role !== 'ADMIN') {
      filters.bankUserId = await resolveUserId(req);
    }
    const result = await recoveryService.getRecoveryCases(filters);
    return success(res, {
      message: 'Recovery cases retrieved',
      data: result.cases,
      meta: { total: result.total },
    });
  } catch (err) { next(err); }
};

/** GET /sentinel/recovery/case/:caseId */
const getRecoveryCase = async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.caseId, 10);
    const bankerId = req.user?.role !== 'ADMIN' ? await resolveUserId(req) : null;
    const result = await recoveryService.getRecoveryCase(caseId, { bankerId });
    return success(res, { message: 'Recovery case details retrieved', data: result });
  } catch (err) { next(err); }
};

/** POST /sentinel/recovery/case/:caseId/action */
const createRecoveryAction = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const result = await recoveryService.createRecoveryAction(
      parseInt(req.params.caseId, 10),
      userId,
      req.body
    );
    return success(res, { message: 'Recovery action logged', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

module.exports = {
  getRecoveryCases,
  getRecoveryCase,
  createRecoveryAction,
};
