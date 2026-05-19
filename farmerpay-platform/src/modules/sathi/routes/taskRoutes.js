/**
 * Task Routes
 * SATHI task management: agent tasks, task lifecycle, evidence bundles.
 * All routes require authentication.
 *
 * @swagger
 * tags:
 *   name: SATHI Tasks
 *   description: Field agent task management and evidence collection
 */

const express = require('express');
const router = express.Router();

const taskController = require('../controllers/taskController');
const validate = require('../../../middleware/validate');
const { authenticate } = require('../../../middleware/auth');
const roleCheck = require('../../../middleware/roleCheck');
const {
  getAgentTasksSchema,
  startTaskSchema,
  updateTaskSchema,
  completeTaskSchema,
} = require('../validators/sathiValidator');

router.use(authenticate);
router.use(roleCheck('AGENT', 'ADMIN'));

// ─── Agent Tasks ────────────────────────────────────────────────────

/**
 * @swagger
 * /sathi/agent/{agentId}/tasks:
 *   get:
 *     tags: [SATHI Tasks]
 *     summary: Get tasks assigned to a field agent
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [assigned, in_progress, completed, rejected, on_hold] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [low, medium, high, urgent] }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200: { description: List of agent tasks with meta }
 */
router.get('/agent/:agentId/tasks', validate(getAgentTasksSchema, 'query'), taskController.getAgentTasks);

// ─── Task Lifecycle ─────────────────────────────────────────────────

/**
 * @swagger
 * /sathi/tasks/{taskId}:
 *   get:
 *     tags: [SATHI Tasks]
 *     summary: Get task details with executions and evidence
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Full task details }
 */
router.get('/tasks/:taskId', taskController.getTaskDetail);

/**
 * @swagger
 * /sathi/tasks/{taskId}/start:
 *   post:
 *     tags: [SATHI Tasks]
 *     summary: Start task execution with GPS location
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Execution started }
 */
router.post('/tasks/:taskId/start', validate(startTaskSchema), taskController.startTask);

/**
 * @swagger
 * /sathi/tasks/{taskId}/update:
 *   post:
 *     tags: [SATHI Tasks]
 *     summary: Update in-progress task with notes and photos
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Execution updated }
 */
router.post('/tasks/:taskId/update', validate(updateTaskSchema), taskController.updateTask);

/**
 * @swagger
 * /sathi/tasks/{taskId}/complete:
 *   post:
 *     tags: [SATHI Tasks]
 *     summary: Complete task with end GPS, evidence bundle, and notes
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Task completed with evidence bundle }
 */
router.post('/tasks/:taskId/complete', validate(completeTaskSchema), taskController.completeTask);

// ─── Evidence ───────────────────────────────────────────────────────

/**
 * @swagger
 * /sathi/evidence/{bundleId}:
 *   get:
 *     tags: [SATHI Tasks]
 *     summary: Get evidence bundle with all items
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: bundleId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Evidence bundle details }
 */
router.get('/evidence/:bundleId', taskController.getEvidenceBundle);

module.exports = router;
