/**
 * Intelligence Controller
 * Handles Phase 2 analytics endpoints: yield prediction, satellite health,
 * weather risk, dynamic rates, restructuring, NPA prediction, collection
 * scheduling, video KYC, language support, and advanced analytics.
 */

const intelligenceService = require('../services/intelligenceService');
const { success } = require('../../../shared/utils/responseHelper');

// ────────────────────────────────────────────────────────────────────
// 1. Yield Prediction
// ────────────────────────────────────────────────────────────────────

/** GET /sentinel/intelligence/yield-prediction/:cycleId */
const getYieldPrediction = async (req, res, next) => {
  try {
    const result = await intelligenceService.predictCropYield(parseInt(req.params.cycleId, 10));
    return success(res, { message: 'Yield prediction retrieved', data: result });
  } catch (err) { next(err); }
};

// ────────────────────────────────────────────────────────────────────
// 2. Satellite Crop Health
// ────────────────────────────────────────────────────────────────────

/** GET /sentinel/intelligence/satellite-health/:cycleId */
const getSatelliteHealth = async (req, res, next) => {
  try {
    const result = await intelligenceService.getCropHealthFromSatellite(parseInt(req.params.cycleId, 10));
    return success(res, { message: 'Satellite crop health retrieved', data: result });
  } catch (err) { next(err); }
};

// ────────────────────────────────────────────────────────────────────
// 3. Weather Risk Score
// ────────────────────────────────────────────────────────────────────

/** GET /sentinel/intelligence/weather-risk?districtId=&season= */
const getWeatherRisk = async (req, res, next) => {
  try {
    const { districtId, season } = req.query;
    const result = await intelligenceService.calculateWeatherRisk(districtId, season);
    return success(res, { message: 'Weather risk assessment retrieved', data: result });
  } catch (err) { next(err); }
};

// ────────────────────────────────────────────────────────────────────
// 5. Dynamic Interest Rate
// ────────────────────────────────────────────────────────────────────

/** GET /sentinel/intelligence/dynamic-rate/:applicationId */
const getDynamicRate = async (req, res, next) => {
  try {
    const result = await intelligenceService.calculateDynamicRate(parseInt(req.params.applicationId, 10));
    return success(res, { message: 'Dynamic interest rate calculated', data: result });
  } catch (err) { next(err); }
};

// ────────────────────────────────────────────────────────────────────
// 6. Restructuring Recommendation
// ────────────────────────────────────────────────────────────────────

/** GET /sentinel/intelligence/restructuring/:applicationId */
const getRestructuring = async (req, res, next) => {
  try {
    const result = await intelligenceService.recommendRestructuring(parseInt(req.params.applicationId, 10));
    return success(res, { message: 'Restructuring recommendation retrieved', data: result });
  } catch (err) { next(err); }
};

// ────────────────────────────────────────────────────────────────────
// 7. NPA Prediction
// ────────────────────────────────────────────────────────────────────

/** GET /sentinel/intelligence/npa-prediction/:farmerId */
const getNpaPrediction = async (req, res, next) => {
  try {
    const result = await intelligenceService.predictNpaProbability(parseInt(req.params.farmerId, 10));
    return success(res, { message: 'NPA prediction retrieved', data: result });
  } catch (err) { next(err); }
};

// ────────────────────────────────────────────────────────────────────
// 9. Smart Collection Schedule
// ────────────────────────────────────────────────────────────────────

/** GET /sentinel/intelligence/collection-schedule/:farmerId */
const getCollectionSchedule = async (req, res, next) => {
  try {
    const result = await intelligenceService.generateCollectionSchedule(parseInt(req.params.farmerId, 10));
    return success(res, { message: 'Collection schedule generated', data: result });
  } catch (err) { next(err); }
};

// ────────────────────────────────────────────────────────────────────
// 10. Video KYC Status
// ────────────────────────────────────────────────────────────────────

/** GET /sentinel/intelligence/video-kyc/:farmerId */
const getVideoKycStatus = async (req, res, next) => {
  try {
    const result = await intelligenceService.getVideoKycStatus(parseInt(req.params.farmerId, 10));
    return success(res, { message: 'Video KYC status retrieved', data: result });
  } catch (err) { next(err); }
};

// ────────────────────────────────────────────────────────────────────
// 11. Language Support
// ────────────────────────────────────────────────────────────────────

/** GET /sentinel/intelligence/languages */
const getSupportedLanguages = async (req, res, next) => {
  try {
    const result = await intelligenceService.getSupportedLanguages();
    return success(res, { message: 'Supported languages retrieved', data: result });
  } catch (err) { next(err); }
};

// ────────────────────────────────────────────────────────────────────
// 12. Advanced Analytics Summary
// ────────────────────────────────────────────────────────────────────

/** GET /sentinel/intelligence/advanced-analytics */
const getAdvancedAnalytics = async (req, res, next) => {
  try {
    const result = await intelligenceService.getAdvancedAnalytics();
    return success(res, { message: 'Advanced analytics summary retrieved', data: result });
  } catch (err) { next(err); }
};

// ────────────────────────────────────────────────────────────────────
// Exports
// ────────────────────────────────────────────────────────────────────

module.exports = {
  getYieldPrediction,
  getSatelliteHealth,
  getWeatherRisk,
  getDynamicRate,
  getRestructuring,
  getNpaPrediction,
  getCollectionSchedule,
  getVideoKycStatus,
  getSupportedLanguages,
  getAdvancedAnalytics,
};
