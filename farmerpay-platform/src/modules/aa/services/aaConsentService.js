/**
 * AA Consent Service
 * Orchestrates the full consent lifecycle: request → approve → fetch → store.
 * Sits between the controller and the AA provider clients.
 */

const logger = require('../../../shared/utils/logger');
const { generateUUID } = require('../../../shared/utils/uuidHelper');
const { setWithTTL, getKey, deleteKeys } = require('../../../config/redis');
const { getProvider, listProviders } = require('../../../integrations/accountAggregator');
const { aaConfig } = require('../../../integrations/accountAggregator');
const { logEvent } = require('./aaAuditLogger');
const { verifyWebhook } = require('./aaWebhookVerifier');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

// ──────────────────────────────────────────────
// Consent Request
// ──────────────────────────────────────────────

/**
 * Initiate AA consent for a farmer.
 * Creates consent record in DB, sends request to AA provider, returns redirect URL.
 * @param {number} farmerId - Internal user ID
 * @param {Object} params - { provider?, purposeText?, monthsBack? }
 * @returns {Object} { consentUuid, consentHandle, redirectUrl, status }
 */
const initiateConsent = async (farmerId, params = {}) => {
  const { AaConsent, User, sequelize: seq } = getDb();

  // Get farmer's mobile number for AA provider
  const user = await User.findByPk(farmerId);
  if (!user) {
    const err = new Error('Farmer not found');
    err.statusCode = 404;
    err.errorCode = 'AA_FARMER_NOT_FOUND';
    throw err;
  }

  // Check for existing active consent. We also look up `requested` status
  // to cover the narrow window between two concurrent initiations — both
  // would otherwise create a new 'requested' row for the same farmer,
  // leaking handles and doubling upstream AA provider calls.
  const existing = await AaConsent.findOne({
    where: {
      farmer_id: farmerId,
      consent_status: { [require('sequelize').Op.in]: ['approved', 'requested'] },
      is_active: true,
    },
  });
  if (existing) {
    return {
      consentUuid: existing.consent_uuid,
      status: existing.consent_status === 'approved' ? 'already_active' : 'already_pending',
      message: existing.consent_status === 'approved'
        ? 'Active consent already exists. Revoke first to create new one.'
        : 'A consent request is already pending. Complete or revoke it before starting another.',
    };
  }

  const providerName = params.provider || aaConfig.activeProvider;
  const client = getProvider(providerName);

  const monthsBack = Math.min(
    params.monthsBack || aaConfig.dataWindow.defaultMonths,
    aaConfig.dataWindow.maxMonths
  );
  const dataFrom = new Date();
  dataFrom.setMonth(dataFrom.getMonth() - monthsBack);

  const transaction = await seq.transaction();
  try {
    // Create DB record
    const consentUuid = generateUUID();
    const consent = await AaConsent.create({
      consent_uuid: consentUuid,
      farmer_id: farmerId,
      aa_provider: providerName === 'onemoney' ? 'onemoney' : providerName,
      consent_status: 'requested',
      consent_purpose: params.purposeText || 'Agricultural credit assessment and loan servicing',
      data_from: dataFrom,
      data_to: new Date(),
      is_active: true,
    }, { transaction });

    // Send to AA provider
    let providerResponse;
    if (aaConfig.enabled) {
      providerResponse = await client.createConsent(user.phone, {
        dataFromDate: dataFrom,
        dataToDate: new Date(),
        purposeText: consent.consent_purpose,
      });
    } else {
      // Dev/test mode — mock response
      providerResponse = {
        consentHandle: `mock-handle-${consentUuid}`,
        redirectUrl: `${aaConfig.setu.redirectUrl}?mock=true&id=${consentUuid}`,
        status: 'PENDING',
      };
    }

    // Store V2 fields from provider response
    await consent.update({
      consent_handle: providerResponse.consentHandle,
      redirect_url: providerResponse.redirectUrl,
    }, { transaction });

    await transaction.commit();

    // Cache consent handle → consent UUID mapping for webhook resolution.
    // Capped at 1 hour: webhook callbacks should arrive within minutes of
    // issuance. A longer-lived mapping becomes a leakage vector — whoever
    // captures the handle can poll Redis to resolve it to internal IDs.
    const HANDLE_CACHE_TTL_SEC = Math.min(aaConfig.cache?.consentTTL || 3600, 3600);
    await setWithTTL(
      `aa:handle:${providerResponse.consentHandle}`,
      JSON.stringify({ consentId: consent.id, consentUuid, farmerId }),
      HANDLE_CACHE_TTL_SEC
    );

    // Audit log: consent_requested
    logEvent({
      consentId: consent.id, farmerId,
      eventType: 'consent_requested', eventSource: 'farmer',
      provider: providerName,
      metadata: { purposeText: consent.consent_purpose, monthsBack },
    });

    return {
      consentUuid,
      consentHandle: providerResponse.consentHandle,
      redirectUrl: providerResponse.redirectUrl,
      status: 'requested',
      provider: providerName,
    };
  } catch (err) {
    await transaction.rollback();
    logger.error('[AAConsent] initiateConsent failed:', err.message);
    throw err;
  }
};

// ──────────────────────────────────────────────
// Consent Status & Webhook Processing
// ──────────────────────────────────────────────

/**
 * Check and update consent status from AA provider.
 * @param {string} consentUuid
 * @returns {Object} { consentUuid, status, provider }
 */
const checkConsentStatus = async (consentUuid) => {
  const { AaConsent } = getDb();

  const consent = await AaConsent.findOne({ where: { consent_uuid: consentUuid } });
  if (!consent) {
    const err = new Error('Consent not found');
    err.statusCode = 404;
    err.errorCode = 'AA_CONSENT_NOT_FOUND';
    throw err;
  }

  // If already in terminal state, return from DB
  if (['approved', 'rejected', 'revoked', 'expired'].includes(consent.consent_status)) {
    return {
      consentUuid: consent.consent_uuid,
      status: consent.consent_status,
      provider: consent.aa_provider,
      dataFrom: consent.data_from,
      dataTo: consent.data_to,
    };
  }

  // Poll AA provider for latest status
  if (aaConfig.enabled) {
    const client = getProvider(consent.aa_provider);
    const handle = await getKey(`aa:handle:${consentUuid}`);
    if (handle) {
      const parsed = JSON.parse(handle);
      const providerStatus = await client.getConsentStatus(parsed.consentHandle || consentUuid);
      const normalizedStatus = normalizeStatus(providerStatus.status);

      if (normalizedStatus !== consent.consent_status) {
        await consent.update({ consent_status: normalizedStatus });
      }

      return {
        consentUuid: consent.consent_uuid,
        status: normalizedStatus,
        provider: consent.aa_provider,
      };
    }
  }

  return {
    consentUuid: consent.consent_uuid,
    status: consent.consent_status,
    provider: consent.aa_provider,
  };
};

/**
 * Process AA webhook notification.
 * Called when Setu/Finvu sends consent approval or session completion callback.
 * @param {string} provider - 'setu' or 'finvu'
 * @param {Object} payload - Raw webhook body
 * @returns {Object} { processed, eventType, consentUuid }
 */
const processWebhook = async (provider, payload, headers = {}) => {
  // Step 0: Verify webhook signature
  const verification = await verifyWebhook(provider, headers, payload);
  if (!verification.valid) {
    logger.warn(`[AAConsent] Webhook verification failed: ${verification.reason}`);
    return { processed: false, reason: verification.reason };
  }

  const { AaConsent } = getDb();
  const client = getProvider(provider);
  const event = client.parseWebhook(payload);

  logger.info(`[AAConsent] Webhook received: ${event.eventType} from ${provider}`);

  // Resolve consent handle to internal consent record
  const cached = await getKey(`aa:handle:${event.consentHandle}`);
  if (!cached) {
    logger.warn(`[AAConsent] Unknown consent handle in webhook: ${event.consentHandle}`);
    return { processed: false, reason: 'unknown_consent_handle' };
  }

  const { consentId, consentUuid, farmerId } = typeof cached === 'string' ? JSON.parse(cached) : cached;
  const consent = await AaConsent.findByPk(consentId);
  if (!consent) return { processed: false, reason: 'consent_not_found' };

  const normalizedStatus = normalizeStatus(event.status);
  const updateFields = { consent_status: normalizedStatus };
  if (normalizedStatus === 'approved') {
    updateFields.approved_at = new Date();
    updateFields.provider_consent_id = event.providerConsentId || null;
  }
  await consent.update(updateFields);

  // Audit log: consent status change from webhook
  const auditEventType = {
    approved: 'consent_approved', rejected: 'consent_rejected',
    revoked: 'consent_revoked', expired: 'consent_expired',
  }[normalizedStatus];
  if (auditEventType) {
    logEvent({
      consentId: consent.id, farmerId,
      eventType: auditEventType, eventSource: 'webhook',
      provider, metadata: { webhookEvent: event.eventType },
    });
  }

  // If consent is approved, auto-trigger data fetch
  if (normalizedStatus === 'approved') {
    logger.info(`[AAConsent] Consent approved for farmer ${farmerId} — triggering data fetch`);
    // Queue the data fetch via RabbitMQ. If the queue is unreachable, mark
    // the consent with a DB flag so a reconciliation job (or on-demand
    // read) can retry later — without the flag, a transient queue outage
    // silently strands the farmer in an approved-but-no-data state.
    try {
      const { publishToQueue } = require('../../../config/rabbitmq');
      await publishToQueue('aa.data.fetch', {
        consentId: consent.id,
        consentUuid,
        farmerId,
        provider,
      });
      await consent.update({ pending_data_fetch: false });
    } catch (queueErr) {
      logger.error('[AAConsent] Failed to queue data fetch:', queueErr.message);
      try {
        await consent.update({ pending_data_fetch: true });
      } catch (markErr) {
        logger.error(`[AAConsent] Failed to mark pending_data_fetch: ${markErr.message}`);
      }
      // Don't throw — webhook should return 200 regardless
    }
  }

  await deleteKeys([`aa:consent:${farmerId}`]); // Invalidate cached consent status

  return { processed: true, eventType: event.eventType, consentUuid, status: normalizedStatus };
};

/**
 * Revoke farmer's active consent.
 * @param {number} farmerId
 * @returns {Object}
 */
const revokeConsent = async (farmerId) => {
  const { AaConsent } = getDb();

  const consent = await AaConsent.findOne({
    where: { farmer_id: farmerId, consent_status: 'approved', is_active: true },
  });
  if (!consent) {
    const err = new Error('No active consent to revoke');
    err.statusCode = 404;
    err.errorCode = 'AA_NO_ACTIVE_CONSENT';
    throw err;
  }

  if (aaConfig.enabled) {
    const client = getProvider(consent.aa_provider);
    await client.revokeConsent(consent.consent_uuid);
  }

  await consent.update({ consent_status: 'revoked', is_active: false });

  // RBI AA framework mandates immediate purge on revoke — not "whenever
  // the nightly aaDataPurgeJob next runs". We hard-delete derived data
  // (transactions, analyses, cached summaries/analyses) inline so a
  // revoke request followed by a read cannot surface the farmer's data.
  const { AaTransaction, AaFinancialAnalysis, AaBankStatementSummary } = getDb();
  await Promise.all([
    AaTransaction.destroy({ where: { farmer_id: farmerId } }).catch((err) =>
      logger.warn(`[AAConsent] revoke purge: transactions delete failed: ${err.message}`)
    ),
    AaFinancialAnalysis.destroy({ where: { farmer_id: farmerId } }).catch((err) =>
      logger.warn(`[AAConsent] revoke purge: analyses delete failed: ${err.message}`)
    ),
    AaBankStatementSummary.destroy({ where: { farmer_id: farmerId } }).catch((err) =>
      logger.warn(`[AAConsent] revoke purge: summaries delete failed: ${err.message}`)
    ),
  ]);
  await deleteKeys([
    `aa:consent:${farmerId}`,
    `aa:summary:${farmerId}`,
    `aa:analysis:${farmerId}`,
  ]);

  // Audit log: consent_revoked + purge outcome
  logEvent({
    consentId: consent.id, farmerId,
    eventType: 'consent_revoked', eventSource: 'farmer',
    provider: consent.aa_provider,
    metadata: { purgeInitiated: true },
  });

  return { consentUuid: consent.consent_uuid, status: 'revoked', dataPurged: true };
};

/**
 * Get farmer's current consent status.
 * @param {number} farmerId
 * @returns {Object}
 */
const getConsentForFarmer = async (farmerId) => {
  const cacheKey = `aa:consent:${farmerId}`;
  const cached = await getKey(cacheKey);
  if (cached) return typeof cached === 'string' ? JSON.parse(cached) : cached;

  const { AaConsent } = getDb();
  const consent = await AaConsent.findOne({
    where: { farmer_id: farmerId, is_active: true },
    order: [['created_at', 'DESC']],
  });

  const result = consent ? {
    consentUuid: consent.consent_uuid,
    provider: consent.aa_provider,
    status: consent.consent_status,
    purpose: consent.consent_purpose,
    dataFrom: consent.data_from,
    dataTo: consent.data_to,
    createdAt: consent.created_at,
  } : {
    status: 'not_initiated',
    providers: listProviders(),
  };

  await setWithTTL(cacheKey, JSON.stringify(result), aaConfig.cache.consentTTL);
  return result;
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const normalizeStatus = (providerStatus) => {
  const map = {
    PENDING: 'requested',
    REQUESTED: 'requested',
    APPROVED: 'approved',
    ACTIVE: 'approved',
    REJECTED: 'rejected',
    DENIED: 'rejected',
    REVOKED: 'revoked',
    EXPIRED: 'expired',
    PAUSED: 'requested',
  };
  return map[(providerStatus || '').toUpperCase()] || 'requested';
};

module.exports = {
  initiateConsent,
  checkConsentStatus,
  processWebhook,
  revokeConsent,
  getConsentForFarmer,
};
