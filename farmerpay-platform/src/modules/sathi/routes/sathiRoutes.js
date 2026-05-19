/**
 * Sathi Routes
 * Farmer consents, sync operations, and field verifications.
 * All routes require authentication.
 *
 * @swagger
 * tags:
 *   name: SATHI
 *   description: Farmer consents, offline sync, and field verifications
 */

const express = require('express');
const router = express.Router();

const sathiController = require('../controllers/sathiController');
const validate = require('../../../middleware/validate');
const { authenticate } = require('../../../middleware/auth');
const roleCheck = require('../../../middleware/roleCheck');
const {
  createConsentSchema,
  syncSchema,
  resolveConflictSchema,
  createFieldVerificationSchema,
} = require('../validators/sathiValidator');

router.use(authenticate);
router.use(roleCheck('AGENT', 'ADMIN'));

// ─── Farmer Consents ────────────────────────────────────────────────

/**
 * @swagger
 * /sathi/farmer/{farmerId}/consents:
 *   get:
 *     tags: [SATHI]
 *     summary: Get all consents for a farmer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: farmerId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: List of farmer consents }
 *   post:
 *     tags: [SATHI]
 *     summary: Record a new farmer consent
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Consent recorded }
 */
router.get('/farmer/:farmerId/consents', sathiController.getFarmerConsents);
router.post('/farmer/:farmerId/consents', validate(createConsentSchema), sathiController.createFarmerConsent);

// ─── Offline Sync ───────────────────────────────────────────────────

/**
 * @swagger
 * /sathi/sync:
 *   post:
 *     tags: [SATHI]
 *     summary: Process offline sync queue from mobile client
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Sync results with conflicts }
 */
router.post('/sync', validate(syncSchema), sathiController.processSync);

/**
 * @swagger
 * /sathi/sync/conflicts/{conflictId}/resolve:
 *   post:
 *     tags: [SATHI]
 *     summary: Resolve a sync conflict
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conflictId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Conflict resolved }
 */
router.post('/sync/conflicts/:conflictId/resolve', validate(resolveConflictSchema), sathiController.resolveConflict);

// ─── Field Verifications ────────────────────────────────────────────

/**
 * @swagger
 * /sathi/field-verifications/{farmerId}:
 *   get:
 *     tags: [SATHI]
 *     summary: Get field verifications for a farmer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: farmerId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: List of field verifications }
 */
router.get('/field-verifications/:farmerId', sathiController.getFieldVerifications);

/**
 * @swagger
 * /sathi/field-verifications:
 *   post:
 *     tags: [SATHI]
 *     summary: Create a new field verification with checklist
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Field verification created }
 */
router.post('/field-verifications', validate(createFieldVerificationSchema), sathiController.createFieldVerification);

// ─── ROOTS Field Verification ──────────────────────────────────────
const rootsVerifyCtrl = require('../controllers/rootsVerificationController');
const {
  createRootsVerificationSchema,
  completeRootsVerificationSchema,
} = require('../validators/sathiValidator');

router.post('/roots-verification', validate(createRootsVerificationSchema), rootsVerifyCtrl.createVerification);
router.get('/roots-verification/:taskId/checklist', rootsVerifyCtrl.getChecklist);
router.post('/roots-verification/:taskId/complete', validate(completeRootsVerificationSchema), rootsVerifyCtrl.completeVerification);
router.post('/roots-verification/:taskId/assisted-entry', rootsVerifyCtrl.assistedEntry);

module.exports = router;
