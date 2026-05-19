/**
 * Ecosystem Controller — Phase 3 planned features.
 * Handles marketplace, finance, insurance, DigiLocker, e-RUPI, CRIF, hedging.
 */

const ecosystemService = require('../services/ecosystemService');
const { success } = require('../../../shared/utils/responseHelper');

/** GET /vyapar/marketplace/inputs */
const getInputMarketplace = async (req, res, next) => {
  try {
    const { cropId, districtId, search, page, limit } = req.query;
    const result = await ecosystemService.getInputMarketplace({ cropId, districtId, search, page, limit });
    return success(res, { message: 'Input marketplace retrieved', data: result.inputs, meta: result.meta });
  } catch (err) { next(err); }
};

/** GET /vyapar/supply-chain-finance/:farmerId */
const getSupplyChainFinance = async (req, res, next) => {
  try {
    const { farmerId } = req.params;
    const result = await ecosystemService.getSupplyChainFinance({ farmerId });
    return success(res, { message: 'Supply chain finance data retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /vyapar/warehouse-finance/:farmerId */
const getWarehouseReceiptFinance = async (req, res, next) => {
  try {
    const { farmerId } = req.params;
    const result = await ecosystemService.getWarehouseReceiptFinance({ farmerId });
    return success(res, { message: 'Warehouse receipt finance data retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /vyapar/fpo-lending/:fpoId */
const getFpoLendingStatus = async (req, res, next) => {
  try {
    const { fpoId } = req.params;
    const result = await ecosystemService.getFpoLendingStatus({ fpoId });
    return success(res, { message: 'FPO lending status retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /vyapar/livestock-insurance/:farmerId */
const getLivestockInsurance = async (req, res, next) => {
  try {
    const { farmerId } = req.params;
    const result = await ecosystemService.getLivestockInsurance({ farmerId });
    return success(res, { message: 'Livestock insurance data retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /vyapar/weather-insurance */
const getWeatherInsuranceProducts = async (req, res, next) => {
  try {
    const { districtId, season } = req.query;
    const result = await ecosystemService.getWeatherInsuranceProducts({ districtId, season });
    return success(res, { message: 'Weather insurance products retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /vyapar/digilocker/:farmerId */
const getDigiLockerDocuments = async (req, res, next) => {
  try {
    const { farmerId } = req.params;
    const result = await ecosystemService.getDigiLockerDocuments({ farmerId });
    return success(res, { message: 'DigiLocker documents retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /vyapar/erupi/:farmerId */
const getErupiVoucherStatus = async (req, res, next) => {
  try {
    const { farmerId } = req.params;
    const result = await ecosystemService.getErupiVoucherStatus({ farmerId });
    return success(res, { message: 'e-RUPI voucher status retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /vyapar/crif-score/:farmerId */
const getCrifHighMarkScore = async (req, res, next) => {
  try {
    const { farmerId } = req.params;
    const result = await ecosystemService.getCrifHighMarkScore({ farmerId });
    return success(res, { message: 'CRIF HighMark score retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /vyapar/commodity-hedging/:commodityId */
const getCommodityHedgingAdvisory = async (req, res, next) => {
  try {
    const { commodityId } = req.params;
    const result = await ecosystemService.getCommodityHedgingAdvisory({ commodityId });
    return success(res, { message: 'Commodity hedging advisory retrieved', data: result });
  } catch (err) { next(err); }
};

module.exports = {
  getInputMarketplace,
  getSupplyChainFinance,
  getWarehouseReceiptFinance,
  getFpoLendingStatus,
  getLivestockInsurance,
  getWeatherInsuranceProducts,
  getDigiLockerDocuments,
  getErupiVoucherStatus,
  getCrifHighMarkScore,
  getCommodityHedgingAdvisory,
};
