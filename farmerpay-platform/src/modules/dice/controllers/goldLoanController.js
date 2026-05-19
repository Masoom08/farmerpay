/**
 * Gold Loan Controller
 * Handles gold loan appraisal endpoints.
 */

const {
  getIbjaPrice,
  calculateGoldValue,
  calculateLtvCap,
  preDisburseChecklist,
} = require('../services/goldLoanAppraisalService');
const { success } = require('../../../shared/utils/responseHelper');
const { User } = require('../../../shared/models');

const resolveUserId = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return user.id;
};

/** GET /dice/gold-loan/ibja-price */
const getPrice = async (req, res, next) => {
  try {
    await resolveUserId(req);
    const result = getIbjaPrice();
    return success(res, { message: 'IBJA price retrieved', data: result });
  } catch (err) {
    next(err);
  }
};

/** POST /dice/gold-loan/calculate-value */
const calcValue = async (req, res, next) => {
  try {
    await resolveUserId(req);
    const result = calculateGoldValue(req.body);
    return success(res, { message: 'Gold value calculated', data: result });
  } catch (err) {
    next(err);
  }
};

/** GET /dice/gold-loan/ltv-cap */
const getLtvCap = async (req, res, next) => {
  try {
    await resolveUserId(req);
    const loanAmount = parseFloat(req.query.loanAmount);
    if (!loanAmount || loanAmount <= 0) {
      const err = new Error('loanAmount query parameter is required and must be positive');
      err.statusCode = 400;
      throw err;
    }
    const cap = calculateLtvCap(loanAmount);
    return success(res, { message: 'LTV cap calculated', data: { loanAmount, ltvCap: cap } });
  } catch (err) {
    next(err);
  }
};

/** GET /dice/gold-loan/checklist/:applicationId */
const getChecklist = async (req, res, next) => {
  try {
    await resolveUserId(req);
    const applicationId = parseInt(req.params.applicationId, 10);
    const result = await preDisburseChecklist(applicationId);
    return success(res, { message: 'Pre-disburse checklist generated', data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPrice, calcValue, getLtvCap, getChecklist };
