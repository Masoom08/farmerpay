/**
 * AgriStack Land Verification Service — STUB (P0-P1)
 *
 * #3 Land data by Aadhaar (i1:o1) → Saves ULI LRS cost (₹5-30/hit), free for 17 states
 * #4 Verify land record exists → Pre-loan land check
 * #12 Village-wise ROR data → State-federated land records
 * #16 Farmer owned area by state (i12:o20) → Total landholding for loan limit
 * #23 Unified land data cross-state (i10:o12) → Standardised land ownership
 * #24 Land lineage parent/child → Inheritance/split tracking
 *
 * Target tables: field_ownership_statuses, farm_registers, fields
 */

const logger = require('../../../shared/utils/logger');
const config = require('../config/agristackConfig');
const client = require('./agristackClient');

const getLandByAadhaar = async (aadhaarHash, consentToken) => {
  if (!config.features.landVerificationEnabled) return null;
  return client.callApi('landByAadhaar', { aadhaar_hash: aadhaarHash }, { consentToken });
};

const verifyLand = async (landDetails) => {
  if (!config.features.landVerificationEnabled) return null;
  return client.callApi('verifyLand', landDetails);
};

const getVillageRorData = async (villageCode) => {
  if (!config.features.landVerificationEnabled) return null;
  return client.callApi('villageRorData', { village_code: villageCode });
};

const getFarmerOwnedArea = async (farmerId) => {
  if (!config.features.landVerificationEnabled) return null;
  return client.callApi('farmerOwnedArea', { farmer_id: farmerId });
};

const getUnifiedLandData = async (farmerId) => {
  if (!config.features.landVerificationEnabled) return null;
  return client.callApi('unifiedLandData', { farmer_id: farmerId });
};

const getLandLineage = async (farmId) => {
  if (!config.features.landVerificationEnabled) return null;
  return client.callApi('landLineage', { farm_id: farmId });
};

module.exports = {
  getLandByAadhaar, verifyLand, getVillageRorData,
  getFarmerOwnedArea, getUnifiedLandData, getLandLineage,
};
