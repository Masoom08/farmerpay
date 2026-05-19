/**
 * Insurance Controller
 * Handles insurance product discovery, enrollment, claims, and status endpoints.
 */

const {
  getProducts,
  calculatePremium,
  enrollFarmer,
  fileClaim,
  getInsuranceStatus,
} = require('../services/insuranceService');
const { success } = require('../../../shared/utils/responseHelper');
const STATUS_CODES = require('../../../shared/constants/statusCodes');
const { User } = require('../../../shared/models');

const resolveUserId = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) { const err = new Error('User not found'); err.statusCode = 404; throw err; }
  return user.id;
};

/** GET /dice/insurance/products — Insurance product catalog */
const products = async (req, res, next) => {
  try {
    const result = getProducts();
    return success(res, { message: 'Insurance products retrieved', data: result });
  } catch (err) { next(err); }
};

/** POST /dice/insurance/calculate-premium — Premium with subsidy breakdown */
const calcPremium = async (req, res, next) => {
  try {
    await resolveUserId(req);
    const result = calculatePremium(req.body);
    return success(res, { message: 'Premium calculated', data: result });
  } catch (err) { next(err); }
};

/** POST /dice/insurance/enroll — Enroll farmer with policy number generation */
const enroll = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await enrollFarmer({ farmerId, ...req.body });
    return success(res, { message: 'Farmer enrolled in insurance', data: result, statusCode: STATUS_CODES.CREATED });
  } catch (err) { next(err); }
};

/** POST /dice/insurance/claim — File claim with proper workflow */
const claim = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await fileClaim({ farmerId, ...req.body });
    return success(res, { message: 'Insurance claim filed', data: result });
  } catch (err) { next(err); }
};

/** GET /dice/insurance/status — Policy repository for farmer */
const status = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await getInsuranceStatus(farmerId);
    return success(res, { message: 'Insurance status retrieved', data: result });
  } catch (err) { next(err); }
};

module.exports = { products, calcPremium, enroll, claim, status };
