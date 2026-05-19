/**
 * AA Routes — Account Aggregator Financial Intelligence endpoints.
 * @swagger
 * tags:
 *   - name: Account Aggregator
 *     description: AA consent, data fetch, financial analysis, and cross-module bridge
 */

const express = require('express');
const router = express.Router();
const aaController = require('../controllers/aaController');
const validate = require('../../../middleware/validate');
const { authenticate } = require('../../../middleware/auth');
const roleCheck = require('../../../middleware/roleCheck');
const {
  initiateConsentSchema, webhookSchema, refreshAnalysisSchema,
  transactionsQuerySchema, bulkAnalysisSchema, farmerIdParam,
} = require('../validators/aaValidator');

// All AA routes require authentication (except webhooks)
router.use(authenticate);

// ──────────────────────────────────────────────
// Consent Lifecycle
// ──────────────────────────────────────────────

/**
 * @swagger
 * /aa/consent:
 *   post:
 *     tags: [Account Aggregator]
 *     summary: Initiate AA consent for the farmer
 *     description: Creates a consent request with the AA provider. Returns a redirect URL for farmer to approve.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               provider: { type: string, enum: [setu, finvu, onemoney] }
 *               purposeText: { type: string }
 *               monthsBack: { type: integer, minimum: 6, maximum: 24 }
 *     responses:
 *       201: { description: Consent initiated, returns redirect URL }
 */
router.post('/consent', validate(initiateConsentSchema), aaController.initiateConsent);

/**
 * @swagger
 * /aa/consent:
 *   get:
 *     tags: [Account Aggregator]
 *     summary: Get farmer's current AA consent status
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current consent status }
 */
router.get('/consent', aaController.getConsentStatus);

/**
 * @swagger
 * /aa/consent/{consentUuid}:
 *   get:
 *     tags: [Account Aggregator]
 *     summary: Check specific consent status (polls AA provider)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: consentUuid
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Consent status from AA provider }
 */
router.get('/consent/:consentUuid', aaController.checkConsent);

/**
 * @swagger
 * /aa/consent:
 *   delete:
 *     tags: [Account Aggregator]
 *     summary: Revoke farmer's active AA consent
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Consent revoked }
 */
router.delete('/consent', aaController.revokeConsent);

// ──────────────────────────────────────────────
// Webhooks (no auth — AA providers call these)
// ──────────────────────────────────────────────
// Note: These bypass the router.use(authenticate) above
// because they're defined on a separate sub-router below

// ──────────────────────────────────────────────
// Data Fetch
// ──────────────────────────────────────────────

/**
 * @swagger
 * /aa/fetch:
 *   post:
 *     tags: [Account Aggregator]
 *     summary: Trigger data fetch from AA provider
 *     description: Fetches bank statements for the farmer's approved consent. Stores summaries in DB.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Data fetch result with accounts processed }
 */
router.post('/fetch', aaController.triggerDataFetch);

// ──────────────────────────────────────────────
// Analysis & Intelligence (Layer 2 + 3)
// ──────────────────────────────────────────────

/**
 * @swagger
 * /aa/analysis:
 *   get:
 *     tags: [Account Aggregator]
 *     summary: Get full financial analysis from AA data
 *     description: Returns income classification, expense detection, seasonality, health score, and cross-module data.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Complete financial analysis }
 */
router.get('/analysis', aaController.getAnalysis);

/**
 * @swagger
 * /aa/analysis/health-score:
 *   get:
 *     tags: [Account Aggregator]
 *     summary: Get financial health score (0-100) with grade
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Health score with component breakdown }
 */
router.get('/analysis/health-score', aaController.getHealthScore);

/**
 * @swagger
 * /aa/analysis/history:
 *   get:
 *     tags: [Account Aggregator]
 *     summary: Get paginated past analysis runs
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Analysis history with pagination }
 */
router.get('/analysis/history', aaController.getAnalysisHistory);

/**
 * @swagger
 * /aa/analysis/transactions:
 *   get:
 *     tags: [Account Aggregator]
 *     summary: Get paginated classified bank transactions
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema: { type: integer }
 *       - name: limit
 *         in: query
 *         schema: { type: integer }
 *       - name: type
 *         in: query
 *         schema: { type: string, enum: [credit, debit] }
 *       - name: category
 *         in: query
 *         schema: { type: string }
 *       - name: fromDate
 *         in: query
 *         schema: { type: string, format: date }
 *       - name: toDate
 *         in: query
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Classified transactions with pagination }
 */
router.get('/analysis/transactions', validate(transactionsQuerySchema, 'query'), aaController.getTransactions);

/**
 * @swagger
 * /aa/analysis/refresh:
 *   post:
 *     tags: [Account Aggregator]
 *     summary: Trigger re-analysis with latest data
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               force: { type: boolean, default: false }
 *     responses:
 *       200: { description: Fresh analysis result }
 */
router.post('/analysis/refresh', validate(refreshAnalysisSchema), aaController.refreshAnalysis);

/**
 * @swagger
 * /aa/bridge/{module}:
 *   get:
 *     tags: [Account Aggregator]
 *     summary: Get AA data formatted for a specific module
 *     description: Returns module-ready data. Supported modules - trust, drishti, sentinel, dice, sathi.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: module
 *         in: path
 *         required: true
 *         schema: { type: string, enum: [trust, drishti, sentinel, dice, sathi] }
 *     responses:
 *       200: { description: Module-specific AA intelligence data }
 */
router.get('/bridge/:module', aaController.getModuleData);

/**
 * @swagger
 * /aa/providers:
 *   get:
 *     tags: [Account Aggregator]
 *     summary: List available AA providers and their status
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of AA providers }
 */
router.get('/providers', aaController.listProviders);

// ──────────────────────────────────────────────
// Admin / Banker Routes
// ──────────────────────────────────────────────

/**
 * @swagger
 * /aa/admin/stats:
 *   get:
 *     tags: [Account Aggregator]
 *     summary: AA adoption stats (consent rates, avg scores)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: AA adoption statistics }
 */
router.get('/admin/stats', roleCheck('banker', 'admin'), aaController.getAdminStats);

/**
 * @swagger
 * /aa/admin/farmer/{farmerId}/analysis:
 *   get:
 *     tags: [Account Aggregator]
 *     summary: View a farmer's AA analysis (banker access)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: farmerId
 *         in: path
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Farmer's latest analysis }
 */
router.get('/admin/farmer/:farmerId/analysis', roleCheck('banker', 'admin'), aaController.getFarmerAnalysis);

/**
 * @swagger
 * /aa/admin/bulk-analysis:
 *   post:
 *     tags: [Account Aggregator]
 *     summary: Trigger batch re-analysis for multiple farmers
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               farmerIds:
 *                 type: array
 *                 items: { type: integer }
 *     responses:
 *       202: { description: Batch analysis queued }
 */
router.post('/admin/bulk-analysis', roleCheck('admin'), validate(bulkAnalysisSchema), aaController.triggerBulkAnalysis);

module.exports = router;

// ──────────────────────────────────────────────
// Webhook Router (separate — no auth middleware)
// ──────────────────────────────────────────────
const webhookRouter = express.Router();

/**
 * @swagger
 * /aa/webhook/{provider}:
 *   post:
 *     tags: [Account Aggregator]
 *     summary: Receive webhook from AA provider (no auth)
 *     parameters:
 *       - name: provider
 *         in: path
 *         required: true
 *         schema: { type: string, enum: [setu, finvu] }
 *     responses:
 *       200: { description: Webhook acknowledged }
 */
webhookRouter.post('/webhook/:provider', validate(webhookSchema), aaController.handleWebhook);

module.exports.webhookRouter = webhookRouter;
