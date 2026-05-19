/**
 * Horticulture Routes
 * Orchard management, planting, harvest with grading, health, inputs, irrigation.
 *
 * @swagger
 * tags:
 *   name: ROOTS Horticulture
 *   description: Orchard and plantation management
 */

const express = require('express');
const router = express.Router();
const horticultureController = require('../controllers/horticultureController');
const validate = require('../../../../middleware/validate');
const { authenticate } = require('../../../../middleware/auth');
const roleCheck = require('../../../../middleware/roleCheck');
const {
  createOrchardSchema, addPlantingSchema, addHarvestSchema,
  addHealthRecordSchema, addInputLogSchema, addIrrigationLogSchema,
  getProductionSchema,
} = require('../validators/horticultureValidator');

router.use(authenticate);
router.use(roleCheck('FARMER', 'AGENT', 'ADMIN'));

// ─── Orchard CRUD ───────────────────────────────────────────────

/**
 * @swagger
 * /roots/horticulture/orchards:
 *   post:
 *     tags: [ROOTS Horticulture]
 *     summary: Create a new orchard
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orchardName]
 *             properties:
 *               orchardName:
 *                 type: string
 *                 example: "Mango Garden"
 *               cropName:
 *                 type: string
 *                 example: "Mango"
 *               variety:
 *                 type: string
 *                 example: "Alphonso"
 *               areaHectares:
 *                 type: number
 *                 example: 1.5
 *               infrastructureType:
 *                 type: string
 *                 enum: [open_field, polyhouse, shade_net, low_tunnel, greenhouse]
 *                 example: "open_field"
 *     responses:
 *       201: { description: Orchard created }
 */
router.post('/orchards', validate(createOrchardSchema), horticultureController.createOrchard);

/** @swagger /roots/horticulture/orchards GET - List farmer orchards */
router.get('/orchards', horticultureController.getOrchards);

/** @swagger /roots/horticulture/orchards/:orchardId GET - Orchard detail */
router.get('/orchards/:orchardId', horticultureController.getOrchardDetail);

// ─── Planting ───────────────────────────────────────────────────

/** @swagger /roots/horticulture/orchards/:orchardId/plantings POST */
router.post('/orchards/:orchardId/plantings', validate(addPlantingSchema), horticultureController.addPlanting);

// ─── Harvest with Grading ───────────────────────────────────────

/** @swagger /roots/horticulture/orchards/:orchardId/harvests POST */
router.post('/orchards/:orchardId/harvests', validate(addHarvestSchema), horticultureController.addHarvest);

// ─── Health Monitoring ──────────────────────────────────────────

/** @swagger /roots/horticulture/orchards/:orchardId/health POST */
router.post('/orchards/:orchardId/health', validate(addHealthRecordSchema), horticultureController.addHealthRecord);

// ─── Input Application ──────────────────────────────────────────

/** @swagger /roots/horticulture/orchards/:orchardId/inputs POST */
router.post('/orchards/:orchardId/inputs', validate(addInputLogSchema), horticultureController.addInputLog);

// ─── Irrigation ─────────────────────────────────────────────────

/** @swagger /roots/horticulture/orchards/:orchardId/irrigation POST */
router.post('/orchards/:orchardId/irrigation', validate(addIrrigationLogSchema), horticultureController.addIrrigationLog);

// ─── Production Summary ─────────────────────────────────────────

/** @swagger /roots/horticulture/orchards/:orchardId/production GET */
router.get('/orchards/:orchardId/production', validate(getProductionSchema, 'query'), horticultureController.getProductionSummary);

module.exports = router;
