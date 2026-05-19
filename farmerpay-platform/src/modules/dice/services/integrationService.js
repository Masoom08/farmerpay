/**
 * Integration Service
 * Handles multi-provider integration for loan operations (API and CSV sync).
 */
const logger = require('../../../shared/utils/logger');
const { generateUUID } = require('../../../shared/utils/uuidHelper');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

/**
 * Logs an integration event.
 * @param {Object} params
 * @returns {Promise<Object>}
 */
const logIntegration = async ({ providerId, integrationType, requestPayload, responsePayload, status, errorMessage }) => {
  const { LoanIntegrationLog } = getDb();
  return LoanIntegrationLog.create({
    provider_id: providerId,
    integration_type: integrationType,
    request_payload: requestPayload,
    response_payload: responsePayload,
    integration_status: status,
    error_message: errorMessage,
  });
};

/**
 * Submits an application to a provider's API.
 * @param {number} applicationId
 * @param {number} providerId
 * @returns {Promise<Object>}
 */
const submitToProvider = async (applicationId, providerId) => {
  const { LoanProvider, LoanApplication } = getDb();
  const provider = await LoanProvider.findByPk(providerId);

  if (!provider || provider.api_integration_status === 'none') {
    logger.info(`Provider ${providerId} has no API integration, skipping`);
    return { status: 'skipped', reason: 'No API integration configured' };
  }

  // TODO: Implement provider-specific API calls
  // Placeholder: log the attempt
  const result = await logIntegration({
    providerId,
    integrationType: 'application_submit',
    requestPayload: { applicationId },
    responsePayload: { status: 'queued' },
    status: 'success',
  });

  logger.info(`Application ${applicationId} submitted to provider ${providerId}`);
  return { status: 'submitted', integrationLogId: result.id };
};

module.exports = { logIntegration, submitToProvider };
