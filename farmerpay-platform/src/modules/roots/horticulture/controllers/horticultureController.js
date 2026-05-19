/**
 * Horticulture Controller
 * Handles HTTP requests for orchard management, planting, harvest, health, inputs, irrigation.
 */

const horticultureService = require('../services/horticultureService');
const { success } = require('../../../../shared/utils/responseHelper');
const { User } = require('../../../../shared/models');

const resolveUserId = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) { const err = new Error('User not found'); err.statusCode = 404; err.errorCode = 'RES_001'; throw err; }
  return user.id;
};

/** POST /roots/horticulture/orchards */
const createOrchard = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await horticultureService.createOrchard(farmerId, req.body);
    return success(res, { message: 'Orchard created', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

/** GET /roots/horticulture/orchards */
const getOrchards = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await horticultureService.getOrchards(farmerId);
    return success(res, { message: 'Orchards retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /roots/horticulture/orchards/:orchardId */
const getOrchardDetail = async (req, res, next) => {
  try {
    const result = await horticultureService.getOrchardDetail(parseInt(req.params.orchardId, 10));
    return success(res, { message: 'Orchard detail retrieved', data: result });
  } catch (err) { next(err); }
};

/** POST /roots/horticulture/orchards/:orchardId/plantings */
const addPlanting = async (req, res, next) => {
  try {
    const result = await horticultureService.addPlanting(parseInt(req.params.orchardId, 10), req.body);
    return success(res, { message: 'Planting recorded', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

/** POST /roots/horticulture/orchards/:orchardId/harvests */
const addHarvest = async (req, res, next) => {
  try {
    const result = await horticultureService.addHarvest(parseInt(req.params.orchardId, 10), req.body);
    return success(res, { message: 'Harvest recorded', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

/** POST /roots/horticulture/orchards/:orchardId/health */
const addHealthRecord = async (req, res, next) => {
  try {
    const result = await horticultureService.addHealthRecord(parseInt(req.params.orchardId, 10), req.body);
    return success(res, { message: 'Health record created', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

/** POST /roots/horticulture/orchards/:orchardId/inputs */
const addInputLog = async (req, res, next) => {
  try {
    const result = await horticultureService.addInputLog(parseInt(req.params.orchardId, 10), req.body);
    return success(res, { message: 'Input log recorded', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

/** POST /roots/horticulture/orchards/:orchardId/irrigation */
const addIrrigationLog = async (req, res, next) => {
  try {
    const result = await horticultureService.addIrrigationLog(parseInt(req.params.orchardId, 10), req.body);
    return success(res, { message: 'Irrigation log recorded', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

/** GET /roots/horticulture/orchards/:orchardId/production */
const getProductionSummary = async (req, res, next) => {
  try {
    const result = await horticultureService.getProductionSummary(
      parseInt(req.params.orchardId, 10),
      parseInt(req.query.month, 10),
      parseInt(req.query.year, 10)
    );
    return success(res, { message: 'Production summary retrieved', data: result });
  } catch (err) { next(err); }
};

module.exports = {
  createOrchard, getOrchards, getOrchardDetail,
  addPlanting, addHarvest, addHealthRecord,
  addInputLog, addIrrigationLog, getProductionSummary,
};
