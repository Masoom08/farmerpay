/**
 * Insurance Phase 2 POS — Premium quote controller.
 *
 * POST /insurance/quote — returns a farmer-facing quote breakdown.
 * Authenticated (so we can log the quote as a referral action).
 */

const premiumQuoteService = require('../services/premiumQuoteService');
const posReferralService = require('../services/posReferralService');
const { User } = require('../../../shared/models');
const { success } = require('../../../shared/utils/responseHelper');

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

const quote = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const { productId, sumInsured, season, areaHectares, crop } = req.body;

    const q = await premiumQuoteService.quote({
      productId,
      sumInsured,
      season,
      areaHectares,
      crop,
    });

    // Log the quote as a referral action for funnel tracking. Non-fatal.
    try {
      await posReferralService.logReferral({
        farmerId,
        productId,
        action: 'quoted',
        quoteSnapshot: {
          sumInsured: q.inputs.sumInsured,
          farmerPremium: q.farmerPremium,
          subsidyAmount: q.subsidyAmount,
          areaHectares: q.inputs.areaHectares,
          crop: q.inputs.crop,
          season: q.inputs.season,
        },
      });
    } catch (logErr) {
      // Referral logging failure should not break the quote response
      req.log?.warn?.(`[insurance/quote] referral log failed: ${logErr.message}`);
    }

    return success(res, { message: 'Quote calculated', data: q });
  } catch (e) {
    next(e);
  }
};

module.exports = { quote };
