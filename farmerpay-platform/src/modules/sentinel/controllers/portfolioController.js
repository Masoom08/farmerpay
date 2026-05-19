/**
 * Portfolio Controller
 * Handles portfolio overview for bank users.
 */

const sentinelService = require('../services/sentinelService');
const { success } = require('../../../shared/utils/responseHelper');
const { User } = require('../../../shared/models');

/** GET /sentinel/portfolio */
const getPortfolio = async (req, res, next) => {
  try {
    // A BANK_OFFICER is always scoped to their own portfolio regardless of
    // the bankUserId they pass. Only ADMIN callers may specify another
    // officer's ID or omit the filter entirely. This closes the IDOR where
    // any officer could enumerate the whole bank by simply not passing the
    // filter the validator accepts.
    const filters = { ...req.query };
    if (req.user?.role !== 'ADMIN') {
      const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
      filters.bankUserId = user ? user.id : -1;
    }
    const result = await sentinelService.getPortfolio(filters);
    return success(res, {
      message: 'Portfolio overview retrieved',
      data: result.data,
      meta: result.meta,
    });
  } catch (err) { next(err); }
};

module.exports = {
  getPortfolio,
};
