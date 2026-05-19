/**
 * Sage Routes
 * AI advisory, alerts, and crop health observation endpoints.
 *
 * @swagger
 * tags:
 *   name: SAGE
 *   description: AI-driven farmer advisory system
 */

const express = require('express');
const router = express.Router();
const sageController = require('../controllers/sageController');
const validate = require('../../../middleware/validate');
const { authenticate } = require('../../../middleware/auth');
const roleCheck = require('../../../middleware/roleCheck');
const { getAdvisoriesSchema, acknowledgeAdvisorySchema, getAlertsSchema, createCropObservationSchema } = require('../validators/sageValidator');

router.use(authenticate);
router.use(roleCheck('FARMER', 'AGENT', 'ADMIN'));

/** @swagger /sage/advisories/{farmerId} GET */
router.get('/advisories/:farmerId', validate(getAdvisoriesSchema, 'query'), sageController.getAdvisories);

/** @swagger /sage/advisories/{farmerId}/acknowledge POST */
router.post('/advisories/:farmerId/acknowledge', validate(acknowledgeAdvisorySchema), sageController.acknowledgeAdvisory);

/** @swagger /sage/alerts/{farmerId} GET */
router.get('/alerts/:farmerId', validate(getAlertsSchema, 'query'), sageController.getAlerts);

/** @swagger /sage/crop-observation/{farmerId} POST */
router.post('/crop-observation/:farmerId', validate(createCropObservationSchema), sageController.createCropObservation);

// ─── SAGE Crop Advisory Engine (Phase 2A) ───────────────────────────

router.post('/engine/run/:cycleId', sageController.runEngineForCycle);
router.post('/engine/run-farmer/me', sageController.runEngineForFarmer);
router.post('/weather/observe', sageController.seedWeatherObservation);
router.post('/pests/alert', sageController.seedPestAlert);
router.post('/imd/fetch', sageController.fetchImdNow);
router.post('/google/fetch/:cycleId', sageController.fetchGoogleForCycle);
router.post('/google/observe', sageController.seedGoogleObservation);

// ─── SAGE feed (Phase 1: ₹-framed advisories for the auth'd farmer) ──

/** GET /sage/feed/me — ₹-framed feed for the current farmer */
router.get('/feed/me', sageController.getFeed);

/** POST /sage/feed/acknowledge — Acknowledge an advisory by id */
router.post('/feed/acknowledge', sageController.acknowledgeFeedAdvisory);

// ─── Soil Health Card ───────────────────────────────────────────────

/** POST /sage/soil-health/:farmerId — Save soil health card (manual entry or OCR parsed) */
router.post('/soil-health/:farmerId', sageController.saveSoilHealth);

/** GET /sage/soil-health/:farmerId — Get latest soil health summary with advisories */
router.get('/soil-health/:farmerId', sageController.getSoilHealth);

// ─── Feedback ───────────────────────────────────────────────────────

/** POST /sage/feedback/:farmerId — Submit feedback on an advisory */
router.post('/feedback/:farmerId', sageController.submitFeedback);

module.exports = router;
