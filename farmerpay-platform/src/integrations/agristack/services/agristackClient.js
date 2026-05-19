/**
 * AgriStack API Client — Base HTTP client for all UFSI API calls.
 *
 * Handles: JWT authentication, request signing, error handling,
 * consent token injection, audit logging.
 *
 * STUB — will use axios when sandbox access is granted.
 */

const logger = require('../../../shared/utils/logger');
const config = require('../config/agristackConfig');

/**
 * Makes an authenticated API call to AgriStack UFSI.
 * @param {string} endpointKey - Key from agristackConfig.endpoints
 * @param {Object} payload - Request body
 * @param {Object} [options] - Additional options (consentToken, mapperId override)
 * @returns {Promise<Object|null>} Response data or null if disabled/unavailable
 */
const callApi = async (endpointKey, payload, options = {}) => {
  const endpoint = config.endpoints[endpointKey];
  if (!endpoint) {
    logger.error(`AgriStack: Unknown endpoint key: ${endpointKey}`);
    return null;
  }

  if (!config.jwtToken) {
    logger.debug(`AgriStack: JWT token not configured — ${endpointKey} skipped`);
    return null;
  }

  const url = `${config.baseUrl}${endpoint.path}`;
  const body = endpoint.mapperId
    ? { mapper_id: endpoint.mapperId, ...payload }
    : payload;

  try {
    // TODO: Replace with actual HTTP call when sandbox available
    // const response = await axios({
    //   method: endpoint.method,
    //   url,
    //   headers: {
    //     'Authorization': `Bearer ${config.jwtToken}`,
    //     'Content-Type': 'application/json',
    //     ...(options.consentToken ? { 'X-Consent-Token': options.consentToken } : {}),
    //   },
    //   data: body,
    //   timeout: 30000,
    // });
    // return response.data;

    logger.debug(`AgriStack STUB: ${endpoint.method} ${url} — not yet connected`);
    return null;
  } catch (err) {
    logger.error(`AgriStack API error [${endpointKey}]: ${err.message}`);
    return null;
  }
};

/**
 * Calls the /agristack/seek endpoint with a mapper ID.
 * Generic seek function used by 15+ AgriStack services.
 */
const seek = async (mapperId, payload, options = {}) => {
  return callApi('__seek', { mapper_id: mapperId, ...payload }, options);
};

module.exports = { callApi, seek };
