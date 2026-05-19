/**
 * Scale Controller
 * Phase 4 — Multi-bank, open APIs, AA, OCEN, CBS, state customization,
 * regulatory reports, and benchmark analytics.
 */

const scaleService = require('../services/scaleService');
const { success } = require('../../../shared/utils/responseHelper');

/** GET /bank/multi-bank/config */
const getMultiBankConfig = async (req, res, next) => {
  try {
    const result = await scaleService.getMultiBankConfig();
    return success(res, { message: 'Multi-bank config retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /bank/open-api/marketplace */
const getOpenApiMarketplace = async (req, res, next) => {
  try {
    const result = await scaleService.getOpenApiMarketplace();
    return success(res, { message: 'API marketplace retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /bank/account-aggregator/:farmerId */
const getAccountAggregatorStatus = async (req, res, next) => {
  try {
    const result = await scaleService.getAccountAggregatorStatus(req.params.farmerId);
    return success(res, { message: 'Account aggregator status retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /bank/ocen/network */
const getOcenLendingNetwork = async (req, res, next) => {
  try {
    const result = await scaleService.getOcenLendingNetwork();
    return success(res, { message: 'OCEN network status retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /bank/cbs/integrations */
const getCbsIntegrationStatus = async (req, res, next) => {
  try {
    const result = await scaleService.getCbsIntegrationStatus();
    return success(res, { message: 'CBS integration status retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /bank/state-customization */
const getStateCustomization = async (req, res, next) => {
  try {
    const result = await scaleService.getStateCustomization();
    return success(res, { message: 'State customization config retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /bank/regulatory-reports */
const getRegulatoryReports = async (req, res, next) => {
  try {
    const result = await scaleService.getRegulatoryReports();
    return success(res, { message: 'Regulatory reports retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /bank/benchmarks */
const getBenchmarkAnalytics = async (req, res, next) => {
  try {
    const result = await scaleService.getBenchmarkAnalytics();
    return success(res, { message: 'Benchmark analytics retrieved', data: result });
  } catch (err) { next(err); }
};

module.exports = {
  getMultiBankConfig,
  getOpenApiMarketplace,
  getAccountAggregatorStatus,
  getOcenLendingNetwork,
  getCbsIntegrationStatus,
  getStateCustomization,
  getRegulatoryReports,
  getBenchmarkAnalytics,
};
