/**
 * Soil Health Card Routes — OCR processing and management.
 * All routes require authentication.
 *
 * @swagger
 * tags:
 *   name: SoilHealth
 *   description: Soil health card OCR processing and record management
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/soilHealthController');
const validate = require('../../../../middleware/validate');
const { authenticate } = require('../../../../middleware/auth');
const roleCheck = require('../../../../middleware/roleCheck');
const v = require('../validators/soilHealthValidator');

router.use(authenticate);
router.use(roleCheck('FARMER', 'AGENT', 'ADMIN'));

/**
 * @swagger
 * /roots/soil-health:
 *   post:
 *     summary: Process OCR result from soil health card image
 *     tags: [SoilHealth]
 */
router.post('/soil-health', validate(v.uploadSoilHealthSchema), ctrl.uploadSoilHealth);

/**
 * @swagger
 * /roots/fields/{fieldId}/soil-health:
 *   get:
 *     summary: Get soil health record for a field
 *     tags: [SoilHealth]
 */
router.get('/fields/:fieldId/soil-health', ctrl.getFieldSoilHealth);

/**
 * @swagger
 * /roots/soil-health/{recordId}/verify:
 *   put:
 *     summary: Farmer verifies/corrects OCR-extracted soil health values
 *     tags: [SoilHealth]
 */
router.put('/soil-health/:recordId/verify', validate(v.verifySoilHealthSchema), ctrl.verifySoilHealth);

module.exports = router;
