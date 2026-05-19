/**
 * AA Provider Factory
 * Returns the active AA client based on config or per-request override.
 * All providers implement the same interface: createConsent, getConsentStatus,
 * revokeConsent, createDataSession, fetchSessionData, parseWebhook.
 */

const aaConfig = require('../config/aaConfig');
const setuClient = require('./setuClient');
const finvuClient = require('./finvuClient');
const logger = require('../../../shared/utils/logger');

const providers = {
  setu: setuClient,
  onemoney: setuClient,  // Setu powers OneMoney
  finvu: finvuClient,
};

/**
 * Get the AA client for a specific provider.
 * @param {string} [providerName] - 'setu', 'finvu', 'onemoney'. Defaults to config.activeProvider.
 * @returns {Object} AA client with standardized interface
 */
const getProvider = (providerName) => {
  const name = (providerName || aaConfig.activeProvider).toLowerCase();
  const client = providers[name];

  if (!client) {
    logger.error(`[AAFactory] Unknown AA provider: ${name}`);
    const err = new Error(`Unsupported AA provider: ${name}`);
    err.statusCode = 400;
    err.errorCode = 'AA_PROVIDER_INVALID';
    throw err;
  }

  return client;
};

/**
 * List all supported providers with their status.
 * @returns {Array<Object>}
 */
const listProviders = () => {
  return [
    {
      name: 'Setu (OneMoney)',
      code: 'setu',
      active: aaConfig.activeProvider === 'setu',
      configured: !!aaConfig.setu.clientId,
    },
    {
      name: 'Finvu',
      code: 'finvu',
      active: aaConfig.activeProvider === 'finvu',
      configured: !!aaConfig.finvu.apiKey,
    },
  ];
};

module.exports = { getProvider, listProviders };
