/**
 * Banker Insurance Controller — 3 read-only endpoints that surface the
 * insurance_enrollments + loan_insurance_bundled tables to DICE analysts.
 *
 * Routes (mounted under /api/v1/banker/insurance/* in bankerRoutes.js):
 *   GET /portfolio  → getPortfolioSummary
 *   GET /policies   → listPolicies (paginated, filterable)
 *   GET /claims     → listClaims (claim pipeline)
 *
 * All inherit the authenticate + roleCheck middleware from the banker
 * router. See Insurance Phase 1 plan for context.
 */

const insurancePortfolioService = require('../services/insurancePortfolioService');
const { success } = require('../../../shared/utils/responseHelper');

const getPortfolioSummary = async (req, res, next) => {
  try {
    const data = await insurancePortfolioService.getPortfolioSummary();
    return success(res, { message: 'Insurance portfolio summary retrieved', data });
  } catch (e) {
    next(e);
  }
};

const listPolicies = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 25));
    const offset = (page - 1) * pageSize;

    const data = await insurancePortfolioService.listPolicies({
      product: req.query.product || null,
      status: req.query.status || null,
      search: req.query.search || null,
      limit: pageSize,
      offset,
    });

    return success(res, {
      message: 'Insurance policies retrieved',
      data: data.rows,
      meta: { total: data.total, page: data.page, pageSize: data.pageSize },
    });
  } catch (e) {
    next(e);
  }
};

const listClaims = async (req, res, next) => {
  try {
    const data = await insurancePortfolioService.listClaims({
      status: req.query.status || null,
    });
    return success(res, { message: 'Insurance claims retrieved', data });
  } catch (e) {
    next(e);
  }
};

// ─── Phase 2 POS endpoints ─────────────────────────────────────────

const getReferralFunnel = async (req, res, next) => {
  try {
    const data = await insurancePortfolioService.getReferralFunnel({
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null,
      productId: req.query.productId ? parseInt(req.query.productId, 10) : null,
    });
    return success(res, { message: 'Referral funnel retrieved', data });
  } catch (e) {
    next(e);
  }
};

const listReferrals = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 25));
    const data = await insurancePortfolioService.listReferrals({
      action: req.query.action || null,
      productId: req.query.productId ? parseInt(req.query.productId, 10) : null,
      search: req.query.search || null,
      page,
      pageSize,
    });
    return success(res, {
      message: 'Referrals retrieved',
      data: data.rows,
      meta: { total: data.total, page: data.page, pageSize: data.pageSize },
    });
  } catch (e) {
    next(e);
  }
};

const listPosProducts = async (req, res, next) => {
  try {
    const data = await insurancePortfolioService.listPosProducts();
    return success(res, { message: 'Offer catalog retrieved', data });
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getPortfolioSummary,
  listPolicies,
  listClaims,
  // Phase 2 POS additions
  getReferralFunnel,
  listReferrals,
  listPosProducts,
};
