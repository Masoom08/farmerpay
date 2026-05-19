/**
 * Setu Account Aggregator Client
 * Implements FIU-side integration with Setu AA (powering OneMoney).
 * Handles: consent creation, consent status polling, data fetch, session management.
 *
 * Setu AA API Reference: https://docs.setu.co/data/account-aggregator
 */

const axios = require('axios');
const logger = require('../../../shared/utils/logger');
const aaConfig = require('../config/aaConfig');

const PROVIDER = 'setu';
let accessToken = null;
let tokenExpiry = 0;

// ──────────────────────────────────────────────
// Auth — Setu uses client_credentials OAuth2
// ──────────────────────────────────────────────

const getAccessToken = async () => {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;

  const cfg = aaConfig.setu;
  if (!cfg.clientId || !cfg.clientSecret) {
    logger.warn('[SetuAA] Missing client credentials — returning null');
    return null;
  }

  try {
    const res = await axios.post(`${cfg.baseUrl}/v2/auth/token`, {
      clientID: cfg.clientId,
      secret: cfg.clientSecret,
    }, { timeout: aaConfig.retry.timeoutMs });

    accessToken = res.data.access_token || res.data.token;
    tokenExpiry = Date.now() + (res.data.expiresIn || 1800) * 1000;
    return accessToken;
  } catch (err) {
    logger.error('[SetuAA] Auth failed:', err.message);
    return null;
  }
};

const apiCall = async (method, path, data = null) => {
  const token = await getAccessToken();
  if (!token) return null;

  const cfg = aaConfig.setu;
  const headers = {
    Authorization: `Bearer ${token}`,
    'x-product-instance-id': cfg.productInstanceId,
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
    logger.error(`[SetuAA] ${method.toUpperCase()} ${path} failed:`, err.response?.data || err.message);
    throw err;
  }
};

// ──────────────────────────────────────────────
// Consent Management
// ──────────────────────────────────────────────

/**
 * Create a consent request for a farmer.
 * @param {string} mobileNumber - Farmer's registered mobile (linked to bank account)
 * @param {Object} options - { dataFromDate, dataToDate, purposeText }
 * @returns {Object} { consentHandle, redirectUrl, status }
 */
const createConsent = async (mobileNumber, options = {}) => {
  const cfg = aaConfig.setu;
  const now = new Date();
  const dataFrom = options.dataFromDate || new Date(now.setMonth(now.getMonth() - aaConfig.dataWindow.defaultMonths));
  const dataTo = options.dataToDate || new Date();

  const consentDetail = {
    consentStart: new Date().toISOString(),
    consentExpiry: new Date(Date.now() + 24 * 30 * 24 * 3600 * 1000).toISOString(), // 24 months
    consentMode: 'STORE',
    fetchType: cfg.consentTemplate.fetchType,
    consentTypes: cfg.consentTemplate.consentTypes,
    fiTypes: cfg.consentTemplate.fiTypes,
    DataConsumer: { id: aaConfig.fiu.entityHandle },
    Customer: { id: `${mobileNumber}@onemoney` },
    Purpose: {
      ...cfg.consentTemplate.purpose,
      text: options.purposeText || cfg.consentTemplate.purpose.text,
    },
    FIDataRange: {
      from: dataFrom.toISOString(),
      to: dataTo.toISOString(),
    },
    DataLife: cfg.consentTemplate.dataLife,
    Frequency: cfg.consentTemplate.frequency,
  };

  const response = await apiCall('POST', '/v2/consents', consentDetail);

  return {
    consentHandle: response?.id || response?.consentHandle,
    redirectUrl: response?.url || `${cfg.redirectUrl}?id=${response?.id}`,
    status: response?.status || 'PENDING',
    rawResponse: response,
  };
};

/**
 * Check consent status by handle.
 * @param {string} consentHandle
 * @returns {Object} { status, consentId, signedConsent }
 */
const getConsentStatus = async (consentHandle) => {
  const response = await apiCall('GET', `/v2/consents/${consentHandle}`);
  return {
    status: response?.status,  // PENDING, APPROVED, REJECTED, REVOKED, EXPIRED
    consentId: response?.consentId || response?.id,
    signedConsent: response?.signedConsent || null,
    fiTypes: response?.fiTypes || [],
  };
};

/**
 * Revoke an active consent.
 * @param {string} consentId
 * @returns {Object}
 */
const revokeConsent = async (consentId) => {
  return apiCall('POST', `/v2/consents/${consentId}/revoke`);
};

// ──────────────────────────────────────────────
// Data Fetch (FI Session)
// ──────────────────────────────────────────────

/**
 * Create a data session to fetch financial information.
 * @param {string} consentId - Approved consent ID
 * @param {Object} options - { dataFromDate, dataToDate, fiTypes }
 * @returns {Object} { sessionId, status }
 */
const createDataSession = async (consentId, options = {}) => {
  const now = new Date();
  const dataFrom = options.dataFromDate || new Date(now.setMonth(now.getMonth() - aaConfig.dataWindow.defaultMonths));
  const dataTo = options.dataToDate || new Date();

  const response = await apiCall('POST', '/v2/sessions', {
    consentId,
    DataRange: {
      from: dataFrom.toISOString(),
      to: dataTo.toISOString(),
    },
    format: 'json',
  });

  return {
    sessionId: response?.id || response?.sessionId,
    status: response?.status || 'PENDING',
    rawResponse: response,
  };
};

/**
 * Fetch data from a completed session.
 * @param {string} sessionId
 * @returns {Object} { accounts: [{ fiType, accountData, transactions }] }
 */
const fetchSessionData = async (sessionId) => {
  const response = await apiCall('GET', `/v2/sessions/${sessionId}`);

  if (!response || response.status !== 'COMPLETED') {
    return { status: response?.status || 'PENDING', accounts: [] };
  }

  // Setu returns decrypted data for managed AA integrations
  const accounts = (response.Payload || response.data || []).map((fi) => ({
    fiType: fi.fiType || fi.fipId,
    fipId: fi.fipId,
    fipName: fi.fipName || null,
    accounts: (fi.data || []).map((acct) => ({
      linkedAccRef: acct.linkRefNumber || acct.linkedAccRef,
      maskedAccNumber: acct.maskedAccNumber,
      accountType: acct.type || acct.accountType,
      summary: acct.Summary || acct.summary || {},
      profile: acct.Profile || acct.profile || {},
      transactions: acct.Transactions?.Transaction || acct.transactions || [],
    })),
  }));

  return { status: 'COMPLETED', accounts };
};

// ──────────────────────────────────────────────
// Webhook handler helper
// ──────────────────────────────────────────────

/**
 * Parse and validate Setu webhook payload.
 * @param {Object} payload - Raw webhook body
 * @returns {Object} { eventType, consentHandle, consentId, sessionId, status, timestamp }
 */
const parseWebhook = (payload) => {
  return {
    eventType: payload?.type || payload?.event,
    consentHandle: payload?.consentHandle || payload?.data?.consentHandle,
    consentId: payload?.consentId || payload?.data?.consentId,
    sessionId: payload?.sessionId || payload?.data?.sessionId,
    status: payload?.data?.status || payload?.status,
    timestamp: payload?.timestamp || new Date().toISOString(),
  };
};

module.exports = {
  createConsent,
  getConsentStatus,
  revokeConsent,
  createDataSession,
  fetchSessionData,
  parseWebhook,
  PROVIDER,
};
