/**
 * Fishery Controller
 * Handles HTTP requests for pond register, pond, stocking, and water quality.
 */

const fisheryService = require('../services/fisheryService');
const { success } = require('../../../../shared/utils/responseHelper');
const { User } = require('../../../../shared/models');

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

/** POST /roots/fishery/pond-register */
const createPondRegister = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await fisheryService.createPondRegister(farmerId, req.body);
    return success(res, { message: 'Pond register created', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

/** POST /roots/fishery/pond/:registerId/ponds */
const addPond = async (req, res, next) => {
  try {
    const result = await fisheryService.addPond(parseInt(req.params.registerId, 10), req.body);
    return success(res, { message: 'Pond added', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

/** POST /roots/fishery/pond/:pondId/stocking */
const addStocking = async (req, res, next) => {
  try {
    const result = await fisheryService.addStocking(parseInt(req.params.pondId, 10), req.body);
    return success(res, { message: 'Species stocking recorded', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

/** GET /roots/fishery/pond/:pondId/water-quality */
const getWaterQuality = async (req, res, next) => {
  try {
    const result = await fisheryService.getWaterQuality(
      parseInt(req.params.pondId, 10),
      parseInt(req.query.month, 10),
      parseInt(req.query.year, 10)
    );
    return success(res, { message: 'Water quality logs retrieved', data: result });
  } catch (err) { next(err); }
};

module.exports = { createPondRegister, addPond, addStocking, getWaterQuality };
