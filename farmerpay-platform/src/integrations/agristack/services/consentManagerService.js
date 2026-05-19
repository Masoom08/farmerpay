/**
 * AgriStack Consent Manager Service — STUB (P0)
 *
 * #17 Consent management (DPDP Act compliance)
 *     POST /cm/consentRequests → Create consent request for farmer data access
 *     GET /cm/consentArtifacts → Retrieve consent artifacts for audit
 *
 * Reduces DPDP engineering burden — farmer-controlled data sharing.
 * Every AgriStack data fetch requiring PII needs a valid consent token.
 *
 * Target tables: sathi_farmer_consents (existing)
 */

const logger = require('../../../shared/utils/logger');
const config = require('../config/agristackConfig');
const client = require('./agristackClient');

const createConsentRequest = async (farmerId, purpose, dataTypes) => {
  if (!config.features.consentManagerEnabled) return null;
  return client.callApi('consentRequest', {
    farmer_id: farmerId,
    purpose,
    data_types: dataTypes,
    expiry_days: 365,
  });
};

const getConsentArtifacts = async (consentRequestId) => {
  if (!config.features.consentManagerEnabled) return null;
  // GET endpoint — pass as query param
  return client.callApi('consentArtifacts', { consent_request_id: consentRequestId });
};

const getConsentToken = async (farmerId, purpose) => {
  if (!config.features.consentManagerEnabled) return null;
  // Create consent request → get artifact → extract token
  const request = await createConsentRequest(farmerId, purpose, ['identity', 'land', 'crop']);
  if (!request) return null;
  const artifact = await getConsentArtifacts(request.consent_request_id);
  return artifact ? artifact.consent_token : null;
};

module.exports = { createConsentRequest, getConsentArtifacts, getConsentToken };
