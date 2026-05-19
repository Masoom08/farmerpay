/**
 * Finvu Account Aggregator Client
 * Backup AA provider. Implements same interface as setuClient.js.
 *
 * Finvu API Reference: https://docs.finvu.in/
 */

const axios = require('axios');
const logger = require('../../../shared/utils/logger');
const aaConfig = require('../config/aaConfig');

const PROVIDER = 'finvu';

const apiCall = async (method, path, data = null) => {
  const cfg = aaConfig.finvu;
  if (!cfg.apiKey) {
    logger.warn('[FinvuAA] Missing API key — returning null');
    return null;
  }

  const headers = {
    'x-api-key': cfg.apiKey,
    'x-api-secret': cfg.apiSecret,
    'Content-Type': 'application/json',
  };

  try {
    const res = await axios({
      method,
      url: `${cfg.baseUrl}${path}`,
      data,
      headers,
      timeout: aaConfig.retry.timeoutMs,
    });
    return res.data;
  } catch (err) {
    logger.error(`[FinvuAA] ${method.toUpperCase()} ${path} failed:`, err.response?.data || err.message);
    throw err;
  }
};

/**
 * Create consent request.
 * @param {string} mobileNumber
 * @param {Object} options
 * @returns {Object} { consentHandle, redirectUrl, status }
 */
const createConsent = async (mobileNumber, options = {}) => {
  const now = new Date();
  const dataFrom = options.dataFromDate || new Date(now.setMonth(now.getMonth() - aaConfig.dataWindow.defaultMonths));
  const dataTo = options.dataToDate || new Date();

  const response = await apiCall('POST', '/ConsentRequest', {
    ver: '2.0.0',
    timestamp: new Date().toISOString(),
    txnid: `FP-${Date.now()}`,
    Customer: { id: `${mobileNumber}@finvu` },
    FIDataRange: { from: dataFrom.toISOString(), to: dataTo.toISOString() },
    consentDetail: {
      consentTypes: ['PROFILE', 'SUMMARY', 'TRANSACTIONS'],
      fiTypes: ['DEPOSIT', 'RECURRING_DEPOSIT', 'TERM_DEPOSIT'],
      fetchType: 'PERIODIC',
      Frequency: { unit: 'MONTH', value: 1 },
      DataLife: { unit: 'MONTH', value: 12 },
      consentMode: 'STORE',
      Purpose: { code: '101', text: options.purposeText || 'Agricultural credit assessment' },
    },
  });

  return {
    consentHandle: response?.ConsentHandle || response?.consentHandle,
    redirectUrl: response?.redirectUrl || `https://app.finvu.in/consent?handle=${response?.ConsentHandle}`,
    status: response?.status || 'PENDING',
    rawResponse: response,
  };
};

const getConsentStatus = async (consentHandle) => {
  const response = await apiCall('POST', '/Consent/handle', { ConsentHandle: consentHandle });
  return {
    status: response?.ConsentStatus?.status || response?.status,
    consentId: response?.consentId || consentHandle,
    signedConsent: response?.signedConsent || null,
    fiTypes: response?.fiTypes || [],
  };
};

const revokeConsent = async (consentId) => {
  return apiCall('POST', '/Consent/revoke', { consentId });
};

const createDataSession = async (consentId, options = {}) => {
  const now = new Date();
  const dataFrom = options.dataFromDate || new Date(now.setMonth(now.getMonth() - aaConfig.dataWindow.defaultMonths));
  const dataTo = options.dataToDate || new Date();

  const response = await apiCall('POST', '/FI/request', {
    ver: '2.0.0',
    timestamp: new Date().toISOString(),
    txnid: `FP-${Date.now()}`,
    Consent: { id: consentId },
    FIDataRange: { from: dataFrom.toISOString(), to: dataTo.toISOString() },
  });

  return {
    sessionId: response?.sessionId || response?.SessionId,
    status: response?.status || 'PENDING',
    rawResponse: response,
  };
};

const fetchSessionData = async (sessionId) => {
  const response = await apiCall('POST', '/FI/fetch', { sessionId });

  if (!response || !response.FI) {
    return { status: response?.status || 'PENDING', accounts: [] };
  }

  const accounts = response.FI.map((fi) => ({
    fiType: fi.fiType,
    fipId: fi.fipID,
    fipName: null,
    accounts: (fi.data || []).map((acct) => ({
      linkedAccRef: acct.linkRefNumber,
      maskedAccNumber: acct.maskedAccNumber,
      accountType: acct.type,
      summary: acct.Summary || {},
      profile: acct.Profile || {},
      transactions: acct.Transactions?.Transaction || [],
    })),
  }));

  return { status: 'COMPLETED', accounts };
};

const parseWebhook = (payload) => ({
  eventType: payload?.type || payload?.event,
  consentHandle: payload?.consentHandle || payload?.ConsentHandle,
  consentId: payload?.consentId,
  sessionId: payload?.sessionId || payload?.SessionId,
  status: payload?.status,
  timestamp: payload?.timestamp || new Date().toISOString(),
});

module.exports = {
  createConsent,
  getConsentStatus,
  revokeConsent,
  createDataSession,
  fetchSessionData,
  parseWebhook,
  PROVIDER,
};
