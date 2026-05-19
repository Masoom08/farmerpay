/**
 * Banker Controller — Handles banker dashboard endpoints.
 */

const bankerAnalyticsService = require('../services/bankerAnalyticsService');
const { success } = require('../../../shared/utils/responseHelper');
const { parsePagination } = require('../../../shared/utils/paginationHelper');

const getPortfolioOverview = async (req, res, next) => {
  try {
    const data = await bankerAnalyticsService.portfolioOverview();
    return success(res, { message: 'Portfolio overview retrieved', data });
  } catch (e) { next(e); }
};

const getFarmerRiskList = async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query);
    const filters = {
      complianceStatus: req.query.complianceStatus || null,
      sortBy: req.query.sortBy || 'compliance_score',
      search: req.query.search || null,
    };
    const data = await bankerAnalyticsService.farmerRiskList(filters, pagination);
    return success(res, { message: 'Farmer risk list retrieved', data: data.rows, meta: data.meta });
  } catch (e) { next(e); }
};

const getFarmerDetail = async (req, res, next) => {
  try {
    const farmerId = parseInt(req.params.farmerId, 10);
    const data = await bankerAnalyticsService.farmerDetailView(farmerId);
    return success(res, { message: 'Farmer detail retrieved', data });
  } catch (e) { next(e); }
};

const getEarlyWarnings = async (req, res, next) => {
  try {
    const data = await bankerAnalyticsService.earlyWarnings();
    return success(res, { message: 'Early warnings retrieved', data });
  } catch (e) { next(e); }
};

const getPortfolioTrends = async (req, res, next) => {
  try {
    const period = req.query.period || '30d';
    const data = await bankerAnalyticsService.portfolioTrends(period);
    return success(res, { message: 'Portfolio trends retrieved', data });
  } catch (e) { next(e); }
};

const getRootsActivity = async (req, res, next) => {
  try {
    const data = await bankerAnalyticsService.rootsActivityAnalytics();
    return success(res, { message: 'ROOTS activity analytics retrieved', data });
  } catch (e) { next(e); }
};

module.exports = {
  getPortfolioOverview,
  getFarmerRiskList,
  getFarmerDetail,
  getEarlyWarnings,
  getPortfolioTrends,
  getRootsActivity,
};
