/**
 * AgriStack Crop Data Service — STUB (P1)
 *
 * #7 Crop survey data → Pre-populate crop history (higher accuracy than self-report)
 * #8 Crop sown data anonymised (i6:o2) → Village crop pattern analysis for SAGE/PULSE
 * #9 Crop area statistics (i5:o5) → Crop area estimation for market intel
 * #10 Crop identification on plots (i14:o8) → Verify farmer-reported crop vs DCS
 * #13 Soil health (i2:o14) → NPK, pH, organic carbon (free baseline)
 * #18 Survey numbers (i11:o15) → Field verification
 *
 * Target tables: cultivation_cycles, field_soil_details, sage_crop_health_observations
 */

const logger = require('../../../shared/utils/logger');
const config = require('../config/agristackConfig');
const client = require('./agristackClient');

const getCropSurveyData = async (farmerId) => {
  if (!config.features.cropDataEnabled) return null;
  return client.callApi('cropSurveyData', { farmer_id: farmerId });
};

const getCropSownData = async (lgdVillageId, season, year) => {
  if (!config.features.cropDataEnabled) return null;
  return client.callApi('cropSownData', { village_id: lgdVillageId, season, year });
};

const getCropAreaStats = async (lgdDistrictId, cropCode) => {
  if (!config.features.cropDataEnabled) return null;
  return client.callApi('cropAreaStats', { district_id: lgdDistrictId, crop_code: cropCode });
};

const getCropIdentification = async (farmerId, plotId) => {
  if (!config.features.cropDataEnabled) return null;
  return client.callApi('cropIdentification', { farmer_id: farmerId, plot_id: plotId });
};

const getSoilHealth = async (farmerId) => {
  if (!config.features.soilHealthEnabled) return null;
  return client.callApi('soilHealth', { farmer_id: farmerId });
};

const getSurveyNumbers = async (lgdVillageId) => {
  if (!config.features.cropDataEnabled) return null;
  return client.callApi('surveyNumbers', { village_id: lgdVillageId });
};

module.exports = {
  getCropSurveyData, getCropSownData, getCropAreaStats,
  getCropIdentification, getSoilHealth, getSurveyNumbers,
};
