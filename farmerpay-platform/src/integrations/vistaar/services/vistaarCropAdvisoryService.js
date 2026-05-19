/**
 * Vistaar Crop Advisory Service — STUB
 *
 * DO NOT BUILD generic crop advisory in-house.
 * When Vistaar API becomes available, this service fetches generic advisories
 * and SAGE enhances them with farm-specific context from ROOTS.
 *
 * Vistaar provides: Bharati AI Advisory + ICAR POP (free)
 * SAGE adds: ROOTS execution data context (crop stage, field history, input logs)
 *
 * Flow: Vistaar generic advisory → this adapter → SAGE advisory engine
 *       → farm-specific recommendation with ROOTS context
 */

const logger = require('../../../shared/utils/logger');
const vistaarConfig = require('../config/vistaarConfig');

/**
 * Fetches generic crop advisory from Vistaar for a given crop + region.
 * STUB — returns null until Vistaar API is available.
 *
 * @param {string} cropName - Crop name (e.g., 'wheat', 'rice')
 * @param {number} lgdStateId - LGD state ID
 * @param {number} lgdDistrictId - LGD district ID
 * @param {string} growthStage - Current growth stage from ROOTS
 * @returns {Promise<Object|null>} Advisory data or null if API unavailable
 */
const fetchCropAdvisory = async (cropName, lgdStateId, lgdDistrictId, growthStage) => {
  if (!vistaarConfig.features.cropAdvisoryEnabled) {
    logger.debug('Vistaar crop advisory disabled — API not yet available');
    return null;
  }

  // TODO: Implement when Vistaar opens API
  // const url = `${vistaarConfig.baseUrl}${vistaarConfig.endpoints.cropAdvisory}`;
  // const response = await axios.get(url, { params: { crop: cropName, state: lgdStateId, district: lgdDistrictId } });
  // return response.data;

  return null;
};

/**
 * Enhances Vistaar advisory with ROOTS farm-specific context.
 * Called by SAGE advisory engine after fetching Vistaar data.
 */
const enhanceWithFarmContext = async (vistaarAdvisory, farmerId, cycleId) => {
  if (!vistaarAdvisory) return null;

  // SAGE will:
  // 1. Map generic advisory to farmer's specific crop stage from ROOTS
  // 2. Cross-reference with farmer's input logs (what they've already applied)
  // 3. Adjust recommendation based on field soil data
  // 4. Add cost estimates from VYAPAR vendor pricing

  return {
    source: 'vistaar_enhanced',
    genericAdvisory: vistaarAdvisory,
    farmSpecificNotes: 'Enhancement pending — connect to SAGE engine',
  };
};

module.exports = { fetchCropAdvisory, enhanceWithFarmContext };
