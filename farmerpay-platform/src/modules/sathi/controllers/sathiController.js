/**
 * Sathi Controller
 * Handles HTTP requests for farmer consents, field verifications, and sync operations.
 */

const sathiService = require('../services/sathiService');
const syncService = require('../services/syncService');
const { success } = require('../../../shared/utils/responseHelper');
const { User } = require('../../../shared/models');

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

/** GET /sathi/farmer/:farmerId/consents */
const getFarmerConsents = async (req, res, next) => {
  try {
    const consents = await sathiService.getFarmerConsents(parseInt(req.params.farmerId, 10));
    return success(res, { message: 'Farmer consents retrieved', data: consents });
  } catch (err) { next(err); }
};

/** POST /sathi/farmer/:farmerId/consents */
const createFarmerConsent = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const result = await sathiService.createFarmerConsent(
      parseInt(req.params.farmerId, 10),
      userId,
      req.body
    );
    return success(res, { message: 'Consent recorded', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

/** POST /sathi/sync */
const processSync = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const result = await syncService.processSyncQueue(userId, req.body.syncQueue);
    return success(res, { message: 'Sync processed', data: result });
  } catch (err) { next(err); }
};

/** POST /sathi/sync/conflicts/:conflictId/resolve */
const resolveConflict = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const result = await syncService.resolveConflict(
      parseInt(req.params.conflictId, 10),
      userId,
      req.body
    );
    return success(res, { message: 'Conflict resolved', data: result });
  } catch (err) { next(err); }
};

/** GET /sathi/field-verifications/:farmerId */
const getFieldVerifications = async (req, res, next) => {
  try {
    const verifications = await sathiService.getFieldVerifications(parseInt(req.params.farmerId, 10));
    return success(res, { message: 'Field verifications retrieved', data: verifications });
  } catch (err) { next(err); }
};

/** POST /sathi/field-verifications */
const createFieldVerification = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const result = await sathiService.createFieldVerification(userId, req.body);
    return success(res, { message: 'Field verification created', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

module.exports = {
  getFarmerConsents,
  createFarmerConsent,
  processSync,
  resolveConflict,
  getFieldVerifications,
  createFieldVerification,
};
