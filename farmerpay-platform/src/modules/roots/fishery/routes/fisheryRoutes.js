/**
 * Fishery Routes
 * Pond management, species stocking, water quality monitoring.
 *
 * @swagger
 * tags:
 *   name: ROOTS Fishery
 *   description: Aquaculture pond and production management
 */

const express = require('express');
const router = express.Router();

const fisheryController = require('../controllers/fisheryController');
const validate = require('../../../../middleware/validate');
const { authenticate } = require('../../../../middleware/auth');
const roleCheck = require('../../../../middleware/roleCheck');
const {
  createPondRegisterSchema,
  addPondSchema,
  addStockingSchema,
  getWaterQualitySchema,
} = require('../validators/fisheryValidator');

router.use(authenticate);
router.use(roleCheck('FARMER', 'AGENT', 'ADMIN'));

/**
 * @swagger
 * /roots/fishery/pond-register:
 *   post:
 *     tags: [ROOTS Fishery]
 *     summary: Create a new pond register
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [registerName]
 *             properties:
 *               registerName:
 *                 type: string
 *                 example: "My Fish Pond"
 *               totalPondArea:
 *                 type: number
 *                 example: 2.5
 *     responses:
 *       201: { description: Pond register created }
 */
router.post('/pond-register', validate(createPondRegisterSchema), fisheryController.createPondRegister);

/**
 * @swagger
 * /roots/fishery/pond/{registerId}/ponds:
 *   post:
 *     tags: [ROOTS Fishery]
 *     summary: Add a pond to a register
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Pond added }
 */
router.post('/pond/:registerId/ponds', validate(addPondSchema), fisheryController.addPond);

/**
 * @swagger
 * /roots/fishery/pond/{pondId}/stocking:
 *   post:
 *     tags: [ROOTS Fishery]
 *     summary: Record species stocking for a pond
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Stocking recorded }
 */
router.post('/pond/:pondId/stocking', validate(addStockingSchema), fisheryController.addStocking);

/**
 * @swagger
 * /roots/fishery/pond/{pondId}/water-quality:
 *   get:
 *     tags: [ROOTS Fishery]
 *     summary: Get water quality logs for a month
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
 *       200: { description: Water quality test results }
 */
router.get('/pond/:pondId/water-quality', validate(getWaterQualitySchema, 'query'), fisheryController.getWaterQuality);

module.exports = router;
