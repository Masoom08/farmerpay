/**
 * Vistaar Pest Surveillance Service — STUB
 *
 * Consume Vistaar NPSS pest alerts. SAGE adds farm-specific context:
 * crop stage + field location + treatment recommendation + cost estimate.
 *
 * Flow: Vistaar pest alert → this adapter → SAGE pest engine
 *       → farm-specific alert with treatment + VYAPAR vendor for inputs
 */

const logger = require('../../../shared/utils/logger');
const vistaarConfig = require('../config/vistaarConfig');

/**
 * Fetches pest surveillance alerts from Vistaar NPSS.
 * STUB — returns null until Vistaar API is available.
 */
const fetchPestAlerts = async (lgdStateId, lgdDistrictId, cropName) => {
  if (!vistaarConfig.features.pestSurveillanceEnabled) {
    logger.debug('Vistaar pest surveillance disabled — API not yet available');
    return null;
  }

  // TODO: Implement when Vistaar opens API
  return null;
};

/**
 * Enhances Vistaar pest alert with SAGE farm-specific context.
 * Adds: crop stage, affected area estimate, treatment recommendation,
 * VYAPAR vendor for pesticide purchase, cost estimate.
 */
const enhanceWithFarmContext = async (pestAlert, farmerId, cycleId) => {
  if (!pestAlert) return null;

  return {
    source: 'vistaar_pest_enhanced',
    rawAlert: pestAlert,
    farmContext: 'Enhancement pending — connect to SAGE + VYAPAR',
  };
};

module.exports = { fetchPestAlerts, enhanceWithFarmContext };
