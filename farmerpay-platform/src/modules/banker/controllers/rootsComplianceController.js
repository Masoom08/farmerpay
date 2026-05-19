/**
 * ROOTS Compliance Controller — Banker dashboard endpoints
 * for Variance Engine compliance analytics.
 */

const rootsComplianceAnalytics = require('../services/rootsComplianceAnalytics');
const { success } = require('../../../shared/utils/responseHelper');
const { parsePagination } = require('../../../shared/utils/paginationHelper');

const getPortfolioCompliance = async (req, res, next) => {
  try {
    const filters = { season: req.query.season || null, crop: req.query.crop || null };
    const data = await rootsComplianceAnalytics.getRootsPortfolioCompliance(filters);
    return success(res, { message: 'ROOTS portfolio compliance', data });
  } catch (e) { next(e); }
};

const getRedFlags = async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query);
    const filters = { severity: req.query.severity || null, status: req.query.status || null };
    const data = await rootsComplianceAnalytics.getRootsRedFlags(filters, pagination);
    return success(res, { message: 'ROOTS red flags', data: data.flags, meta: data.meta, summary: data.summary });
  } catch (e) { next(e); }
};

const getRootsVsRepayment = async (req, res, next) => {
  try {
    const data = await rootsComplianceAnalytics.getRootsVsRepayment();
    return success(res, { message: 'ROOTS vs repayment correlation', data });
  } catch (e) { next(e); }
};

const getBranchCompliance = async (req, res, next) => {
  try {
    const data = await rootsComplianceAnalytics.getBranchCompliance();
    return success(res, { message: 'Branch compliance', data });
  } catch (e) { next(e); }
};

const acknowledgeRedFlag = async (req, res, next) => {
  try {
    const data = await rootsComplianceAnalytics.acknowledgeRedFlag(req.params.flagId, req.user?.id);
    return success(res, { message: 'Red flag acknowledged', data });
  } catch (e) { next(e); }
};

module.exports = { getPortfolioCompliance, getRedFlags, getRootsVsRepayment, getBranchCompliance, acknowledgeRedFlag };
