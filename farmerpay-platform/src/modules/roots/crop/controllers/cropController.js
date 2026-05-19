/**
 * Crop Controller — Handles all ROOTS crop knowledge base endpoints (public).
 */
const cropService = require('../services/cropService');
const { success } = require('../../../../shared/utils/responseHelper');

/** GET /roots/crops */
const getCrops = async (req, res, next) => {
  try {
    const result = await cropService.getCrops(req.query, req.query, req.language);
    return success(res, { message: 'Crops retrieved', data: result.crops, meta: result.meta });
  } catch (err) { next(err); }
};

/** GET /roots/crops/:cropId/varieties */
const getVarieties = async (req, res, next) => {
  try {
    const result = await cropService.getVarieties(req.params.cropId, req.query);
    return success(res, { message: 'Varieties retrieved', data: result.varieties, meta: result.meta });
  } catch (err) { next(err); }
};

/** GET /roots/varieties/:varietyId/suitability */
const getVarietySuitability = async (req, res, next) => {
  try {
    const stateId = req.query.stateId ? parseInt(req.query.stateId, 10) : null;
    const data = await cropService.getVarietySuitability(req.params.varietyId, stateId);
    return success(res, { message: 'Suitability data retrieved', data });
  } catch (err) { next(err); }
};

/** GET /roots/varieties/:varietyId/traits */
const getVarietyTraits = async (req, res, next) => {
  try {
    const data = await cropService.getVarietyTraits(req.params.varietyId);
    return success(res, { message: 'Traits retrieved', data });
  } catch (err) { next(err); }
};

/** GET /roots/pop/search */
const searchPractices = async (req, res, next) => {
  try {
    const result = await cropService.searchPractices(req.query, req.query);
    return success(res, { message: 'Practices retrieved', data: result.practices, meta: result.meta });
  } catch (err) { next(err); }
};

/** GET /roots/pop/:popId/details */
const getPracticeDetail = async (req, res, next) => {
  try {
    const data = await cropService.getPracticeDetail(req.params.popId);
    return success(res, { message: 'Practice details retrieved', data });
  } catch (err) { next(err); }
};

/** GET /roots/inputs */
const getInputs = async (req, res, next) => {
  try {
    const result = await cropService.getInputs(req.query, req.query, req.language);
    return success(res, { message: 'Inputs retrieved', data: result.items, meta: result.meta });
  } catch (err) { next(err); }
};

/** GET /roots/inputs/:itemId/packs */
const getInputPacks = async (req, res, next) => {
  try {
    const stateId = req.query.stateId ? parseInt(req.query.stateId, 10) : null;
    const data = await cropService.getInputPacks(req.params.itemId, stateId);
    return success(res, { message: 'Input packs retrieved', data });
  } catch (err) { next(err); }
};

module.exports = { getCrops, getVarieties, getVarietySuitability, getVarietyTraits, searchPractices, getPracticeDetail, getInputs, getInputPacks };
