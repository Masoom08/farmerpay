/**
 * Sathi Task Routes — TRUST v2 field-agent task queue.
 * Mounted at /sathi/trust-tasks (separate from existing /sathi routes).
 *
 * @swagger
 * tags:
 *   - name: Sathi Tasks
 *     description: TRUST v2 field-agent task queue
 */
const express = require('express');
const router = express.Router();
const trustController = require('../controllers/trustController');
const validate = require('../../../middleware/validate');
const { authenticate } = require('../../../middleware/auth');
const roleCheck = require('../../../middleware/roleCheck');
const {
  sathiTasksQuery,
  submitTaskParams,
  submitTaskBody,
} = require('../validators/trustValidator');

// All sathi task routes require authentication + sathi role
router.use(authenticate);
router.use(roleCheck('sathi'));

/**
 * @swagger
 * /sathi/trust-tasks:
 *   get:
 *     tags: [Sathi Tasks]
 *     summary: List assigned TRUST tasks for the authenticated Sathi
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [OPEN, IN_PROGRESS, DONE, CANCELLED] }
 *       - in: query
 *         name: village
 *         schema: { type: string }
 *       - in: query
 *         name: taskType
 *         schema: { type: string, enum: [COLLECT_HOUSEHOLD, VERIFY_LAND, UPLOAD_INSURANCE, PHOTO_GEOTAG, FARMER_REQUESTED] }
 *       - in: query
 *         name: dueBefore
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Paginated task list }
 */
router.get('/', validate(sathiTasksQuery, 'query'), trustController.getSathiTasks);

/**
 * @swagger
 * /sathi/trust-tasks/{taskId}/submit:
 *   post:
 *     tags: [Sathi Tasks]
 *     summary: Submit task completion data (answers, photos, geotag)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [answers]
 *             properties:
 *               answers: { type: object }
 *               photoRef: { type: string }
 *               geotag:
 *                 type: object
 *                 properties:
 *                   lat: { type: number }
 *                   lng: { type: number }
 *     responses:
 *       201: { description: Task submitted }
 */
router.post('/:taskId/submit', validate(submitTaskParams, 'params'), validate(submitTaskBody), trustController.submitSathiTask);

module.exports = router;
