/**
 * Recovery Routes
 * Recovery case management and action logging.
 *
 * @swagger
 * tags:
 *   name: Sentinel Recovery
 *   description: Loan recovery case management
 */

const express = require('express');
const router = express.Router();

const recoveryController = require('../controllers/recoveryController');
const validate = require('../../../middleware/validate');
const { authenticate } = require('../../../middleware/auth');
const roleCheck = require('../../../middleware/roleCheck');
const {
  getRecoveryCasesSchema,
  createRecoveryActionSchema,
} = require('../validators/sentinelValidator');

router.use(authenticate);
router.use(roleCheck('BANK_OFFICER', 'ADMIN'));

/**
 * @swagger
 * /sentinel/recovery/cases:
 *   get:
 *     tags: [Sentinel Recovery]
 *     summary: List recovery cases with filtering
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: caseStage
 *         schema: { type: string, enum: [early_recovery, intensive_recovery, legal_recovery, writeoff] }
 *     responses:
 *       200: { description: Paginated recovery cases }
 */
router.get('/recovery/cases', validate(getRecoveryCasesSchema, 'query'), recoveryController.getRecoveryCases);

/**
 * @swagger
 * /sentinel/recovery/case/{caseId}:
 *   get:
 *     tags: [Sentinel Recovery]
 *     summary: Get recovery case details with action logs
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: caseId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Case details with action history }
 */
router.get('/recovery/case/:caseId', recoveryController.getRecoveryCase);

/**
 * @swagger
 * /sentinel/recovery/case/{caseId}/action:
 *   post:
 *     tags: [Sentinel Recovery]
 *     summary: Log a recovery action
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Recovery action logged }
 */
router.post('/recovery/case/:caseId/action', validate(createRecoveryActionSchema), recoveryController.createRecoveryAction);

module.exports = router;
