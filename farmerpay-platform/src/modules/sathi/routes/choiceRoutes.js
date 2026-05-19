/**
 * Choice Routes
 * CRP/intermediary profiles, assigned farmers, interactions, and performance KPIs.
 * All routes require authentication.
 *
 * @swagger
 * tags:
 *   name: Choice
 *   description: CRP/intermediary management and performance tracking
 */

const express = require('express');
const router = express.Router();

const choiceController = require('../controllers/choiceController');
const validate = require('../../../middleware/validate');
const { authenticate } = require('../../../middleware/auth');
const roleCheck = require('../../../middleware/roleCheck');
const {
  createInteractionSchema,
  getPerformanceSchema,
  getAssignedFarmersSchema,
} = require('../validators/sathiValidator');

router.use(authenticate);
router.use(roleCheck('AGENT', 'ADMIN'));

// ─── Intermediary Profile ───────────────────────────────────────────

/**
 * @swagger
 * /choice/intermediaries/{choiceId}/profile:
 *   get:
 *     tags: [Choice]
 *     summary: Get full intermediary profile with farmers, ratings, KPIs, and badges
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: choiceId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Full intermediary profile }
 */
router.get('/intermediaries/:choiceId/profile', choiceController.getProfile);

/**
 * @swagger
 * /choice/intermediaries/{choiceId}/tasks:
 *   get:
 *     tags: [Choice]
 *     summary: Get tasks for an intermediary
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Intermediary tasks }
 */
router.get('/intermediaries/:choiceId/tasks', choiceController.getTasks);

// ─── Assigned Farmers ───────────────────────────────────────────────

/**
 * @swagger
 * /choice/intermediaries/{choiceId}/assigned-farmers:
 *   get:
 *     tags: [Choice]
 *     summary: Get paginated list of farmers assigned to intermediary
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200: { description: Assigned farmers with last interaction }
 */
router.get('/intermediaries/:choiceId/assigned-farmers', validate(getAssignedFarmersSchema, 'query'), choiceController.getAssignedFarmers);

// ─── Interactions ───────────────────────────────────────────────────

/**
 * @swagger
 * /choice/intermediaries/{choiceId}/interaction:
 *   post:
 *     tags: [Choice]
 *     summary: Log an interaction with a farmer
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Interaction logged }
 */
router.post('/intermediaries/:choiceId/interaction', validate(createInteractionSchema), choiceController.createInteraction);

// ─── Performance KPIs ───────────────────────────────────────────────

/**
 * @swagger
 * /choice/intermediaries/{choiceId}/performance:
 *   get:
 *     tags: [Choice]
 *     summary: Get monthly performance KPIs
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: year
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Performance KPIs }
 */
router.get('/intermediaries/:choiceId/performance', validate(getPerformanceSchema, 'query'), choiceController.getPerformance);

module.exports = router;
