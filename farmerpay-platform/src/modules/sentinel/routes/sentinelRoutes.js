/**
 * Sentinel Routes
 * Loan health, risk analysis, SMA classification, red flags, and alerts.
 * All routes require authentication.
 *
 * @swagger
 * tags:
 *   name: Sentinel
 *   description: Loan health monitoring, EWS alerts, and risk analysis
 */

const express = require('express');
const router = express.Router();

const sentinelController = require('../controllers/sentinelController');
const validate = require('../../../middleware/validate');
const { authenticate } = require('../../../middleware/auth');
const roleCheck = require('../../../middleware/roleCheck');
const {
  getAlertsSchema,
  acknowledgeAlertSchema,
  alertActionSchema,
} = require('../validators/sentinelValidator');

router.use(authenticate);
router.use(roleCheck('BANK_OFFICER', 'ADMIN'));

// ─── Loan Health ────────────────────────────────────────────────────

/**
 * @swagger
 * /sentinel/loan/{applicationId}/health:
 *   get:
 *     tags: [Sentinel]
 *     summary: Get comprehensive loan health data
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Loan health with SMA and red flags }
 */
router.get('/loan/:applicationId/health', sentinelController.getLoanHealth);

/**
 * @swagger
 * /sentinel/loan/{applicationId}/risk:
 *   get:
 *     tags: [Sentinel]
 *     summary: Get loan risk analysis with EWS signals and suggestions
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Risk score, indicators, EWS signals }
 */
router.get('/loan/:applicationId/risk', sentinelController.getLoanRisk);

/**
 * @swagger
 * /sentinel/loan/{applicationId}/cashflow:
 *   get:
 *     tags: [Sentinel]
 *     summary: Get cash flow projections
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Monthly cash flow projections }
 */
router.get('/loan/:applicationId/cashflow', sentinelController.getCashFlow);

// ─── SMA & Red Flags ───────────────────────────────────────────────

/**
 * @swagger
 * /sentinel/sma-classification/{applicationId}:
 *   get:
 *     tags: [Sentinel]
 *     summary: Get SMA classification for a loan
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: SMA classification details }
 */
router.get('/sma-classification/:applicationId', sentinelController.getSmaClassification);

/**
 * @swagger
 * /sentinel/red-flags/{applicationId}:
 *   get:
 *     tags: [Sentinel]
 *     summary: Get red flags for a loan application
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Red flag events with resolution status }
 */
router.get('/red-flags/:applicationId', sentinelController.getRedFlags);

// ─── Alerts ─────────────────────────────────────────────────────────

/**
 * @swagger
 * /sentinel/alerts:
 *   get:
 *     tags: [Sentinel]
 *     summary: Get EWS alerts with filtering
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [low, medium, high, urgent] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, in_progress, completed] }
 *     responses:
 *       200: { description: Paginated alerts with unacknowledged count }
 */
router.get('/alerts', validate(getAlertsSchema, 'query'), sentinelController.getAlerts);

/**
 * @swagger
 * /sentinel/alerts/{alertId}/acknowledge:
 *   post:
 *     tags: [Sentinel]
 *     summary: Acknowledge an alert
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Alert acknowledged }
 */
router.post('/alerts/:alertId/acknowledge', validate(acknowledgeAlertSchema), sentinelController.acknowledgeAlert);

/**
 * @swagger
 * /sentinel/alerts/{alertId}/action:
 *   post:
 *     tags: [Sentinel]
 *     summary: Record action taken on an alert
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Action recorded }
 */
router.post('/alerts/:alertId/action', validate(alertActionSchema), sentinelController.alertAction);

// ─── Intelligence (Phase 2) ────────────────────────────────────────

const intelligenceController = require('../controllers/intelligenceController');

/**
 * @swagger
 * /sentinel/intelligence/yield-prediction/{cycleId}:
 *   get:
 *     tags: [Sentinel]
 *     summary: Predict crop yield for a cultivation cycle
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: cycleId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Yield prediction with confidence and factors }
 */
router.get('/intelligence/yield-prediction/:cycleId', intelligenceController.getYieldPrediction);

/**
 * @swagger
 * /sentinel/intelligence/satellite-health/{cycleId}:
 *   get:
 *     tags: [Sentinel]
 *     summary: Get satellite-derived crop health (NDVI) for a cultivation cycle
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: cycleId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Satellite crop health with NDVI and vegetation indices }
 */
router.get('/intelligence/satellite-health/:cycleId', intelligenceController.getSatelliteHealth);

/**
 * @swagger
 * /sentinel/intelligence/weather-risk:
 *   get:
 *     tags: [Sentinel]
 *     summary: Calculate weather risk score for a district and season
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: districtId
 *         schema: { type: integer }
 *       - in: query
 *         name: season
 *         schema: { type: string, enum: [kharif, rabi, zaid] }
 *     responses:
 *       200: { description: Weather risk assessment with probabilities }
 */
router.get('/intelligence/weather-risk', intelligenceController.getWeatherRisk);

/**
 * @swagger
 * /sentinel/intelligence/dynamic-rate/{applicationId}:
 *   get:
 *     tags: [Sentinel]
 *     summary: Calculate risk-adjusted dynamic interest rate
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Dynamic rate with adjustments and net rate }
 */
router.get('/intelligence/dynamic-rate/:applicationId', intelligenceController.getDynamicRate);

/**
 * @swagger
 * /sentinel/intelligence/restructuring/{applicationId}:
 *   get:
 *     tags: [Sentinel]
 *     summary: Get loan restructuring recommendations
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Restructuring eligibility and options }
 */
router.get('/intelligence/restructuring/:applicationId', intelligenceController.getRestructuring);

/**
 * @swagger
 * /sentinel/intelligence/npa-prediction/{farmerId}:
 *   get:
 *     tags: [Sentinel]
 *     summary: Predict NPA probability for a farmer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: farmerId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: NPA probability with risk band and contributing factors }
 */
router.get('/intelligence/npa-prediction/:farmerId', intelligenceController.getNpaPrediction);

/**
 * @swagger
 * /sentinel/intelligence/collection-schedule/{farmerId}:
 *   get:
 *     tags: [Sentinel]
 *     summary: Generate smart collection schedule for a farmer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: farmerId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Optimized collection schedule with channels and priorities }
 */
router.get('/intelligence/collection-schedule/:farmerId', intelligenceController.getCollectionSchedule);

/**
 * @swagger
 * /sentinel/intelligence/video-kyc/{farmerId}:
 *   get:
 *     tags: [Sentinel]
 *     summary: Get video KYC completion status for a farmer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: farmerId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Video KYC step-by-step status }
 */
router.get('/intelligence/video-kyc/:farmerId', intelligenceController.getVideoKycStatus);

/**
 * @swagger
 * /sentinel/intelligence/languages:
 *   get:
 *     tags: [Sentinel]
 *     summary: Get supported languages for the platform
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of supported languages with active status }
 */
router.get('/intelligence/languages', intelligenceController.getSupportedLanguages);

/**
 * @swagger
 * /sentinel/intelligence/advanced-analytics:
 *   get:
 *     tags: [Sentinel]
 *     summary: Get advanced analytics dashboard summary
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Aggregated intelligence metrics for dashboard }
 */
router.get('/intelligence/advanced-analytics', intelligenceController.getAdvancedAnalytics);

module.exports = router;
