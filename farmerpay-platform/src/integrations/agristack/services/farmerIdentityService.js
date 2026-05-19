/**
 * AgriStack Farmer Identity Service — STUB (P0)
 *
 * #1 GET Farmer ID by Aadhaar hash → Link FarmerPay profile to 11-digit Farmer ID
 * #2 Verify Farmer ID exists → Returns demographics + land if found
 * #22 Farmer details (full profile) → Pre-populate loan applications
 * #20 Bulk farmer data sync → Portfolio-level batch processing
 *
 * Target tables: users, farmer_profiles
 */

const logger = require('../../../shared/utils/logger');
const config = require('../config/agristackConfig');
const client = require('./agristackClient');

const getFarmerIdByAadhaar = async (aadhaarHash) => {
  if (!config.features.farmerIdentityEnabled) return null;
  return client.callApi('getFarmerId', { aadhaar_hash: aadhaarHash });
};

const verifyFarmerId = async (farmerId) => {
  if (!config.features.farmerIdentityEnabled) return null;
  return client.callApi('verifyFarmerId', { farmer_id: farmerId });
};

const getFarmerDetails = async (farmerId, consentToken) => {
  if (!config.features.farmerIdentityEnabled) return null;
  return client.callApi('farmerDetails', { farmer_id: farmerId }, { consentToken });
};

const bulkFarmerSync = async (farmerIds) => {
  if (!config.features.bulkSyncEnabled) return null;
  return client.callApi('bulkFarmerSync', { farmer_ids: farmerIds });
};

module.exports = { getFarmerIdByAadhaar, verifyFarmerId, getFarmerDetails, bulkFarmerSync };
