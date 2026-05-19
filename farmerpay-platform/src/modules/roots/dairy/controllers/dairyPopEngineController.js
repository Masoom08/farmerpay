/**
 * Dairy PoP Engine Controller — Endpoints for breed-specific PoP comparison,
 * compliance scoring, and alerts.
 */
const dairyPopEngine = require('../services/dairyPopEngine');
const { success } = require('../../../../shared/utils/responseHelper');

const getPopComparison = async (req, res, next) => {
  try {
    const herdId = parseInt(req.params.herdId, 10);
    const [feed, vacc, repro] = await Promise.all([
      dairyPopEngine.computeFeedEfficiency(herdId, req.query),
      dairyPopEngine.checkVaccinationCompliance(herdId),
      dairyPopEngine.checkReproductiveEfficiency(herdId),
    ]);
    return success(res, { message: 'Dairy PoP comparison', data: { feed, vaccination: vacc, reproduction: repro } });
  } catch (e) { next(e); }
};

const getComplianceScore = async (req, res, next) => {
  try {
    const result = await dairyPopEngine.computeDairyComplianceScore(parseInt(req.params.herdId, 10));
    return success(res, { message: 'Dairy compliance score', data: result });
  } catch (e) { next(e); }
};

const getAlerts = async (req, res, next) => {
  try {
    const alerts = await dairyPopEngine.generateDairyAlerts(parseInt(req.params.herdId, 10));
    return success(res, { message: 'Dairy alerts', data: alerts });
  } catch (e) { next(e); }
};

const getYieldVariance = async (req, res, next) => {
  try {
    const result = await dairyPopEngine.computeYieldVariance(parseInt(req.params.animalId, 10), req.query);
    return success(res, { message: 'Yield variance', data: result });
  } catch (e) { next(e); }
};

const getReproductiveEfficiency = async (req, res, next) => {
  try {
    const result = await dairyPopEngine.checkReproductiveEfficiency(parseInt(req.params.herdId, 10));
    return success(res, { message: 'Reproductive efficiency', data: result });
  } catch (e) { next(e); }
};

module.exports = { getPopComparison, getComplianceScore, getAlerts, getYieldVariance, getReproductiveEfficiency };
