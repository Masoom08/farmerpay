/**
 * Insurance Phase 2 POS — Referral controller.
 *
 * Endpoints:
 *   POST /insurance/referrals      — log a funnel action
 *   GET  /insurance/referrals/me   — farmer's own referral history
 */

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

const log = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const {
      productId,
      action,
      sumInsured,
      farmerPremium,
      subsidyAmount,
      areaHectares,
      crop,
      season,
      cycleId,
    } = req.body;

    const quoteSnapshot =
      action === 'viewed'
        ? null
        : {
            sumInsured: sumInsured ?? null,
            farmerPremium: farmerPremium ?? null,
            subsidyAmount: subsidyAmount ?? null,
            areaHectares: areaHectares ?? null,
            crop: crop ?? null,
            season: season ?? null,
          };

    const data = await posReferralService.logReferral({
      farmerId,
      productId,
      action,
      quoteSnapshot,
      cycleId: cycleId || null,
    });

    return success(res, {
      message: 'Referral logged',
      data,
      statusCode: 201,
    });
  } catch (e) {
    next(e);
  }
};

const listMine = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
    const offset = parseInt(req.query.offset, 10) || 0;
    const data = await posReferralService.getReferralsForFarmer(farmerId, { limit, offset });
    return success(res, { message: 'My referrals retrieved', data });
  } catch (e) {
    next(e);
  }
};

module.exports = { log, listMine };
