/**
 * Finacle Webhook Controller
 * Receives inbound events from Finacle CBS via middleware/Event Hub.
 * Pathway 2-3: webhook endpoints for automated Finacle integration.
 */

const finacleWebhookService = require('../services/finacleWebhookService');
const finacleOutboundService = require('../services/finacleOutboundService');
const { success } = require('../../../shared/utils/responseHelper');

/**
 * POST /bank/webhooks/finacle
 * Main webhook receiver — routes events by type.
 * Expected headers: X-Finacle-Event-Type, X-Idempotency-Key, X-HMAC-Signature
 */
const receiveWebhook = async (req, res, next) => {
  try {
    const eventType = req.headers['x-finacle-event-type'] || req.body.eventType;
    const idempotencyKey = req.headers['x-idempotency-key'] || null;
    const hmacSignature = req.headers['x-hmac-signature'] || null;

    if (!eventType) {
      const err = new Error('Missing X-Finacle-Event-Type header');
      err.statusCode = 400;
      throw err;
    }

    // HMAC verification is mandatory. Missing secret = refuse the webhook;
    // Finacle events move money and update NPA classification, so silently
    // accepting unsigned payloads when the secret is unset would let anyone
    // with network reachability forge events. Startup also fails (see app.js)
    // when this env var is missing in production.
    const hmacSecret = process.env.FINACLE_WEBHOOK_SECRET;
    if (!hmacSecret) {
      const err = new Error('FINACLE_WEBHOOK_SECRET not configured — webhook disabled');
      err.statusCode = 503;
      throw err;
    }
    if (!hmacSignature) {
      const err = new Error('Missing X-HMAC-Signature header');
      err.statusCode = 401;
      throw err;
    }
    const hmacVerified = finacleWebhookService.verifyHmac(req.body, hmacSignature, hmacSecret);
    if (!hmacVerified) {
      const err = new Error('HMAC signature verification failed');
      err.statusCode = 401;
      throw err;
    }

    // Freshness: reject events whose timestamp is >5 min off now(). Without
    // this, a captured valid webhook can be replayed indefinitely outside
    // any idempotency window — a high-impact risk for NPA reclassifications
    // and disbursement events.
    const FRESHNESS_MS = 5 * 60 * 1000;
    const tsHeader = req.headers['x-finacle-timestamp'];
    const tsRaw = tsHeader || req.body.timestamp || req.body.eventTimestamp;
    if (!tsRaw) {
      const err = new Error('Missing X-Finacle-Timestamp header');
      err.statusCode = 401;
      throw err;
    }
    const tsMs = typeof tsRaw === 'number' ? tsRaw : Date.parse(tsRaw);
    if (!Number.isFinite(tsMs) || Math.abs(Date.now() - tsMs) > FRESHNESS_MS) {
      const err = new Error('Webhook timestamp outside freshness window');
      err.statusCode = 401;
      throw err;
    }

    const result = await finacleWebhookService.processWebhookEvent(eventType, req.body, {
      idempotencyKey,
      hmacSignature,
      hmacVerified,
      sourceIp: req.ip,
    });

    // Acknowledge within 5 seconds per spec
    return success(res, { message: 'Webhook processed', data: result });
  } catch (err) { next(err); }
};

/**
 * POST /bank/finacle/push/loan-origination
 * Push approved loan application to Finacle LOS.
 */
const pushLoanOrigination = async (req, res, next) => {
  try {
    const result = await finacleOutboundService.pushLoanOrigination(req.body.applicationId);
    return success(res, { message: 'Loan origination pushed to Finacle', data: result });
  } catch (err) { next(err); }
};

/**
 * POST /bank/finacle/push/insurance
 * Push insurance enrollment to Finacle for SI setup.
 */
const pushInsuranceEnrollment = async (req, res, next) => {
  try {
    const result = await finacleOutboundService.pushInsuranceEnrollment(req.body.enrollmentId);
    return success(res, { message: 'Insurance enrollment pushed to Finacle', data: result });
  } catch (err) { next(err); }
};

/**
 * POST /bank/finacle/push/enduse-verification
 * Push end-use verification score to Finacle.
 */
const pushEndUseVerification = async (req, res, next) => {
  try {
    const result = await finacleOutboundService.pushEndUseVerification(req.body.applicationId);
    return success(res, { message: 'End-use verification pushed to Finacle', data: result });
  } catch (err) { next(err); }
};

/**
 * POST /bank/finacle/push/pre-delinquency-alert
 * Push pre-delinquency alert to Finacle officer notification.
 */
const pushPreDelinquencyAlert = async (req, res, next) => {
  try {
    const result = await finacleOutboundService.pushPreDelinquencyAlert(
      req.body.applicationId, req.body.rssScore, req.body.rssData
    );
    return success(res, { message: 'Pre-delinquency alert pushed', data: result });
  } catch (err) { next(err); }
};

module.exports = {
  receiveWebhook, pushLoanOrigination, pushInsuranceEnrollment,
  pushEndUseVerification, pushPreDelinquencyAlert,
};
