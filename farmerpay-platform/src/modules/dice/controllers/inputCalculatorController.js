/**
 * Input Calculator Controller — Handles loan sizing based on input costs + SoF norms.
 */
const inputCostCalculatorService = require('../services/inputCostCalculatorService');
const { success } = require('../../../shared/utils/responseHelper');
const { User } = require('../../../shared/models');

const resolveUserId = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) { const err = new Error('User not found'); err.statusCode = 404; throw err; }
  return user.id;
};

/** GET /dice/input-calculator/inputs — PoP input dropdown with prices */
const getInputDropdown = async (req, res, next) => {
  try {
    const result = await inputCostCalculatorService.getInputDropdown(req.query);
    return success(res, { message: 'Input dropdown retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /dice/input-calculator/extra-inputs — Search extra inputs catalogue */
const getExtraInputs = async (req, res, next) => {
  try {
    const result = await inputCostCalculatorService.getExtraInputCatalogue(req.query);
    return success(res, { message: 'Extra inputs retrieved', data: result.items, meta: result.meta });
  } catch (err) { next(err); }
};

/** POST /dice/input-calculator/calculate — Calculate loan requirement */
const calculateLoan = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await inputCostCalculatorService.calculateLoanRequirement({ farmerId, ...req.body });
    return success(res, { message: 'Loan requirement calculated', data: result });
  } catch (err) { next(err); }
};

/** GET /dice/scale-of-finance — Lookup DLTC/NABARD norms */
const getScaleOfFinance = async (req, res, next) => {
  try {
    const result = await inputCostCalculatorService.getScaleOfFinance(req.query);
    return success(res, { message: 'Scale of Finance norms retrieved', data: result });
  } catch (err) { next(err); }
};

module.exports = { getInputDropdown, getExtraInputs, calculateLoan, getScaleOfFinance };
