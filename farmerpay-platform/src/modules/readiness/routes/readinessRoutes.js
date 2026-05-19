/**
 * Readiness Routes
 * @swagger
 * tags:
 *   name: Readiness
 *   description: Loan readiness — role-projected TRUST + FHS composition
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/readinessController');
const validate = require('../../../middleware/validate');
const { authenticate } = require('../../../middleware/auth');
const roleCheck = require('../../../middleware/roleCheck');
const config = require('../../../config');
const {
  farmerUuidParamSchema, readinessQuerySchema,
  updateThresholdsSchema, getConfigQuerySchema,
} = require('../validators/readinessValidator');

router.use(authenticate);

// ─── Readiness feature flag endpoint ────────────────────────────────
// Frontends call this to decide whether to render readiness surfaces.

/**
 * @swagger
 * /readiness/flags:
 *   get:
 *     summary: Get readiness feature flags for the caller's role
 *     tags: [Readiness]
 *     responses:
 *       200:
 *         description: Feature flags object
 */
router.get('/flags', (req, res) => {
  return res.json({
    success: true,
    data: {
      farmerBadge: !!config.features.readiness.farmerBadge,
      sathiCoachingPriority: !!config.features.readiness.sathiCoachingPriority,
      bankerMatrix: !!config.features.readiness.bankerMatrix,
      sathiShadowLog: !!config.features.readiness.sathiShadowLog,
    },
  });
});

/**
 * @swagger
 * /readiness/telemetry:
 *   post:
 *     summary: Log field accesses from Sathi shadow release
 *     description: |
 *       Accepts a batch of field-access records from the Sathi dashboard.
 *       Only active when sathiShadowLog flag is on. Fire-and-forget from frontend.
 *     tags: [Readiness]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               entries:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     field: { type: string }
 *                     path: { type: string }
 *                     source: { type: string }
 *                     ts: { type: number }
 *     responses:
 *       200:
 *         description: Accepted
 *       404:
 *         description: Shadow logging not enabled
 */
router.post('/telemetry', controller.receiveTelemetry);

// ─── Role-aware readiness gate ──────────────────────────────────────
// Maps the caller's JWT role to the appropriate feature flag.
// Returns 404 when the flag for the caller's persona is off.

const ROLE_TO_FLAG = {
  farmer: 'farmerBadge',
  sathi: 'sathiCoachingPriority',
  sathi_agent: 'sathiCoachingPriority',
  banker: 'bankerMatrix',
  admin: 'bankerMatrix',
  super_admin: 'bankerMatrix',
  system_admin: 'bankerMatrix',
  dice_admin: 'bankerMatrix',
  dice_analyst: 'bankerMatrix',
};

const readinessFeatureGate = (req, res, next) => {
  const userRole = req.user?.role;
  const flagKey = ROLE_TO_FLAG[userRole];

  // Unknown role → let the controller handle it (will 400)
  if (!flagKey) return next();

  if (config.features.readiness[flagKey]) return next();

  return res.status(404).json({
    success: false,
    message: 'Not found',
    errorCode: 'FEATURE_NOT_AVAILABLE',
  });
};

// ─── Admin: Threshold config ────────────────────────────────────

/**
 * @swagger
 * /readiness/admin/thresholds:
 *   get:
 *     summary: Get active threshold config for a bank/product
 *     tags: [Readiness]
 *     parameters:
 *       - in: query
 *         name: bankId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: productId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Active threshold config or system defaults
 */
router.get(
  '/admin/thresholds',
  roleCheck('admin', 'super_admin', 'system_admin'),
  validate(getConfigQuerySchema, 'query'),
  controller.getActiveConfig,
);

/**
 * @swagger
 * /readiness/admin/thresholds/history:
 *   get:
 *     summary: Get version history of threshold changes
 *     tags: [Readiness]
 *     parameters:
 *       - in: query
 *         name: bankId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: productId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Threshold change history
 */
router.get(
  '/admin/thresholds/history',
  roleCheck('admin', 'super_admin', 'system_admin'),
  validate(getConfigQuerySchema, 'query'),
  controller.getThresholdHistory,
);

/**
 * @swagger
 * /readiness/admin/thresholds:
 *   put:
 *     summary: Update threshold cutoffs for a bank/product pair
 *     description: |
 *       Creates a new versioned config row, deactivating the previous one.
 *       Requires admin or bankPolicy role. At least one of trustCutoff or fhsCutoff must be provided.
 *     tags: [Readiness]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bankId]
 *             properties:
 *               bankId: { type: integer }
 *               productId: { type: integer, nullable: true }
 *               trustCutoff: { type: number, minimum: 0, maximum: 100 }
 *               fhsCutoff: { type: number, minimum: 0, maximum: 100 }
 *               reason: { type: string, maxLength: 500 }
 *     responses:
 *       200:
 *         description: New threshold config created
 *       400:
 *         description: Validation error
 *       403:
 *         description: Insufficient role
 */
router.put(
  '/admin/thresholds',
  roleCheck('admin', 'super_admin', 'system_admin'),
  validate(updateThresholdsSchema),
  controller.updateThresholds,
);

// ─── Farmer readiness endpoints ─────────────────────────────────

/**
 * @swagger
 * /readiness/{farmerUuid}:
 *   get:
 *     summary: Get loan readiness for a farmer (role-projected)
 *     description: |
 *       Returns the loan-readiness state projected for the caller's role.
 *       - **Farmer**: traffic-light badge (state + bands). May only query own UUID (403 otherwise).
 *       - **Sathi**: TRUST-only with coaching priority. FHS fields are completely absent.
 *       - **Banker**: full 2×2 decisioning matrix with both scores, bands, and recommended action.
 *     tags: [Readiness]
 *     parameters:
 *       - in: path
 *         name: farmerUuid
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The farmer's external UUID (user_id)
 *       - in: query
 *         name: showNumericScores
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Show raw numeric scores (farmer role only, ignored for other roles)
 *     responses:
 *       200:
 *         description: Role-projected readiness state
 *       403:
 *         description: Farmer querying another farmer's UUID, or insufficient role
 *       404:
 *         description: Farmer UUID not found
 */
router.get(
  '/:farmerUuid',
  readinessFeatureGate,
  validate(farmerUuidParamSchema, 'params'),
  validate(readinessQuerySchema, 'query'),
  controller.getReadiness,
);

/**
 * @swagger
 * /readiness/{farmerUuid}/why:
 *   get:
 *     summary: Get readiness drill-down (reasons, components, next steps)
 *     description: |
 *       Returns the detailed breakdown behind the readiness state:
 *       - **reasons**: which criteria are met, below threshold, or missing
 *       - **components**: score component contributions (role-gated)
 *       - **nextSteps**: actionable guidance appropriate to the caller's role
 *     tags: [Readiness]
 *     parameters:
 *       - in: path
 *         name: farmerUuid
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The farmer's external UUID (user_id)
 *     responses:
 *       200:
 *         description: Readiness drill-down
 *       403:
 *         description: Farmer querying another farmer's UUID, or insufficient role
 *       404:
 *         description: Farmer UUID not found or no readiness data
 */
router.get(
  '/:farmerUuid/why',
  readinessFeatureGate,
  validate(farmerUuidParamSchema, 'params'),
  controller.getReadinessWhy,
);

module.exports = router;
