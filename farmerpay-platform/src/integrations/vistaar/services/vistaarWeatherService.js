/**
 * Vistaar Weather Alert Service — STUB
 *
 * DO NOT BUILD standalone weather alerts.
 * When Vistaar API becomes available, this service fetches IMD weather data
 * and SAGE maps it to crop growth stage from ROOTS.
 *
 * Vistaar provides: Localized weather forecasts via IMD (free)
 * SAGE adds: Crop-stage mapping (e.g., "heavy rain during flowering = yield risk")
 *
 * Flow: Vistaar weather → this adapter → SAGE weather engine
 *       → crop-stage-aware alert with impact assessment
 */

const logger = require('../../../shared/utils/logger');
const vistaarConfig = require('../config/vistaarConfig');

/**
 * Fetches weather alerts from Vistaar for a village/block.
 * STUB — returns null until Vistaar API is available.
 */
const fetchWeatherAlerts = async (lgdVillageId, lgdBlockId) => {
  if (!vistaarConfig.features.weatherAlertsEnabled) {
    logger.debug('Vistaar weather alerts disabled — API not yet available');
    return null;
  }

  // TODO: Implement when Vistaar opens API
  return null;
};

/**
 * Maps weather alert to crop growth stage impact.
 * Called by SAGE to add agricultural context to raw weather data.
 */
const mapToCropStageImpact = async (weatherAlert, cropName, currentGrowthStage) => {
  if (!weatherAlert) return null;

  // Impact mapping examples:
  // Heavy rain + flowering stage = HIGH impact (yield loss)
  // Frost + vegetative stage = MEDIUM impact (growth delay)
  // Drought + grain filling = CRITICAL impact (crop failure)

  return {
    source: 'vistaar_weather_enhanced',
    rawAlert: weatherAlert,
    cropStageImpact: 'Enhancement pending — connect to SAGE engine',
  };
};

module.exports = { fetchWeatherAlerts, mapToCropStageImpact };
