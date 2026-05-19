/**
 * Choice Routes
 * Intermediary management, farmer assignment, field visits, and performance dashboards.
 *
 * @swagger
 * tags:
 *   name: Choice
 *   description: Intermediary (BC/FPO agent) management and field visit tracking
 */

const express = require('express');
const router = express.Router();

const choiceController = require('../controllers/choiceController');
const validate = require('../../../middleware/validate');
const { authenticate } = require('../../../middleware/auth');
const {
  registerIntermediarySchema,
  assignFarmerSchema,
  logFieldVisitSchema,
  listIntermediariesSchema,
} = require('../validators/choiceValidator');

router.use(authenticate);

/**
 * @swagger
 * /choice/intermediary:
 *   post:
 *     tags: [Choice]
 *     summary: Register a new intermediary
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, mobile, type]
 *             properties:
 *               name: { type: string, maxLength: 100 }
 *               mobile: { type: string }
 *               type: { type: string, enum: [bc, fpo_agent, agri_entrepreneur, bank_mitra] }
 *               districtId: { type: integer }
 *               stateId: { type: integer }
 *               skills: { type: array, items: { type: string } }
 *     responses:
 *       201: { description: Intermediary registered }
 */
router.post('/intermediary', validate(registerIntermediarySchema), choiceController.registerIntermediary);

/**
 * @swagger
 * /choice/intermediary/{intermediaryId}/assign/{farmerId}:
 *   post:
 *     tags: [Choice]
 *     summary: Assign a farmer to an intermediary
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: intermediaryId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: farmerId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       201: { description: Farmer assigned }
 */
router.post('/intermediary/:intermediaryId/assign/:farmerId', choiceController.assignFarmer);

/**
 * @swagger
 * /choice/intermediary/{intermediaryId}/visit:
 *   post:
 *     tags: [Choice]
 *     summary: Log a field visit
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: intermediaryId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [farmerId, visitType]
 *             properties:
 *               farmerId: { type: integer }
 *               visitType: { type: string, enum: [onboarding, monitoring, collection, advisory, verification] }
 *               notes: { type: string }
 *               gpsLatitude: { type: number }
 *               gpsLongitude: { type: number }
 *               photoCount: { type: integer }
 *               visitDuration: { type: integer }
 *     responses:
 *       201: { description: Visit logged }
 */
router.post('/intermediary/:intermediaryId/visit', validate(logFieldVisitSchema), choiceController.logFieldVisit);

/**
 * @swagger
 * /choice/intermediary/{intermediaryId}/dashboard:
 *   get:
 *     tags: [Choice]
 *     summary: Get intermediary performance dashboard
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: intermediaryId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Performance KPIs }
 */
router.get('/intermediary/:intermediaryId/dashboard', choiceController.getPerformanceDashboard);

/**
 * @swagger
 * /choice/intermediaries:
 *   get:
 *     tags: [Choice]
 *     summary: List all intermediaries (paginated)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [bc, fpo_agent, agri_entrepreneur, bank_mitra] }
 *       - in: query
 *         name: districtId
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Paginated intermediary list with farmer and visit counts }
 */
router.get('/intermediaries', validate(listIntermediariesSchema, 'query'), choiceController.listIntermediaries);

// ─── Farmer-Facing Routes ──────────────────────────────────────────

/** GET /choice/available — List available intermediaries for farmer (village-mapped) */
router.get('/available', choiceController.getAvailable);

/** GET /choice/my-intermediary — Get current farmer's selected intermediary */
router.get('/my-intermediary', choiceController.getMy);

/** GET /choice/intermediary/:intermediaryId/profile — Full profile card */
router.get('/intermediary/:intermediaryId/profile', choiceController.getProfile);

/** POST /choice/select — Farmer selects intermediary */
router.post('/select', choiceController.selectIntermediary);

/** POST /choice/change-request — Request change of intermediary */
router.post('/change-request', choiceController.changeRequest);

/** POST /choice/escalate — Escalate issue with intermediary */
router.post('/escalate', choiceController.escalate);

/** POST /choice/rate — Rate and provide feedback */
router.post('/rate', choiceController.rate);

module.exports = router;
