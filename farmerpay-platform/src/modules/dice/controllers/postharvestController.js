/**
 * Post-Harvest Top-Up Controller — Handles DICE post-harvest top-up loan endpoints.
 */
const postharvestTopupService = require('../services/postharvestTopupService');
const { success } = require('../../../shared/utils/responseHelper');
const { User } = require('../../../shared/models');

const resolveUserId = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) { const err = new Error('User not found'); err.statusCode = 404; throw err; }
  return user.id;
};

/** POST /dice/postharvest-topup/apply */
const applyTopup = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await postharvestTopupService.applyForTopup({ farmerId, ...req.body });
    return success(res, { message: 'Top-up loan application submitted', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

/** GET /dice/postharvest-topup/:topupId */
const getTopup = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await postharvestTopupService.getTopupDetails(parseInt(req.params.topupId, 10), farmerId);
    return success(res, { message: 'Top-up loan details retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /dice/postharvest-topup/farmer/:farmerId */
const listFarmerTopups = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await postharvestTopupService.listFarmerTopups(farmerId);
    return success(res, { message: 'Top-up loans retrieved', data: result });
  } catch (err) { next(err); }
};

/** POST /dice/postharvest-topup/:topupId/release */
const releaseTopup = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const topupId = parseInt(req.params.topupId, 10);
    const result = await postharvestTopupService.releaseAndRepay({ topupId, farmerId, ...req.body });
    return success(res, { message: 'Produce released and loan repaid', data: result });
  } catch (err) { next(err); }
};

/** GET /dice/warehouses */
const listWarehouses = async (req, res, next) => {
  try {
    const result = await postharvestTopupService.listWarehouses(req.query);
    return success(res, { message: 'Warehouses retrieved', data: result });
  } catch (err) { next(err); }
};

module.exports = {
  applyTopup,
  getTopup,
  listFarmerTopups,
  releaseTopup,
  listWarehouses,
};
