/**
 * Finacle Integration Routes
 * Webhook receiver (inbound) and outbound push APIs.
 *
 * @swagger
 * tags:
 *   name: Finacle Integration
 *   description: Pathway 2-3 — Finacle CBS bidirectional integration
 */

const express = require('express');
const router = express.Router();
const finacleWebhookController = require('../controllers/finacleWebhookController');
const { authenticate } = require('../../../middleware/auth');
const roleCheck = require('../../../middleware/roleCheck');

// ─── Inbound Webhook (no JWT auth — uses HMAC verification) ─────

/**
 * @swagger
 * /bank/webhooks/finacle:
 *   post:
 *     tags: [Finacle Integration]
 *     summary: Receive Finacle CBS events (disbursement, repayment, SMA, closure)
 *     description: |
 *       Headers: X-Finacle-Event-Type, X-Idempotency-Key, X-HMAC-Signature
 *       Event types: loan_disbursement, repayment_received, sma_classification_change,
 *       account_closure, topup_renewal, collateral_valuation_update
 *     responses:
 *       200: { description: Event processed }
 */
router.post('/webhooks/finacle', finacleWebhookController.receiveWebhook);

// ─── Outbound Push (requires JWT auth) ──────────────────────────

router.use(authenticate);
router.use(roleCheck('BANK_OFFICER', 'ADMIN'));

/**
 * @swagger
 * /bank/finacle/push/loan-origination:
 *   post:
 *     tags: [Finacle Integration]
 *     summary: Push approved loan application to Finacle LOS
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Loan origination pushed }
 */
router.post('/finacle/push/loan-origination', finacleWebhookController.pushLoanOrigination);

/**
 * @swagger
 * /bank/finacle/push/insurance:
 *   post:
 *     tags: [Finacle Integration]
 *     summary: Push insurance enrollment to Finacle for Standing Instruction
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Insurance enrollment pushed }
 */
router.post('/finacle/push/insurance', finacleWebhookController.pushInsuranceEnrollment);

/**
 * @swagger
 * /bank/finacle/push/enduse-verification:
 *   post:
 *     tags: [Finacle Integration]
 *     summary: Push end-use verification score to Finacle loan remarks
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: End-use verification pushed }
 */
router.post('/finacle/push/enduse-verification', finacleWebhookController.pushEndUseVerification);

/**
 * @swagger
 * /bank/finacle/push/pre-delinquency-alert:
 *   post:
 *     tags: [Finacle Integration]
 *     summary: Push pre-delinquency alert to Finacle officer notification
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Alert pushed }
 */
router.post('/finacle/push/pre-delinquency-alert', finacleWebhookController.pushPreDelinquencyAlert);

module.exports = router;
