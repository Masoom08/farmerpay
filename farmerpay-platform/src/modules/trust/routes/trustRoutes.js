/**
 * Trust Routes — TRUST scoring engine endpoints.
 * @swagger
 * tags:
 *   - name: Trust
 *     description: TRUST credit scoring engine
 *   - name: Trust Admin
 *     description: Admin appeal management
 */
const express = require('express');
const router = express.Router();
const trustController = require('../controllers/trustController');
const validate = require('../../../middleware/validate');
const { authenticate } = require('../../../middleware/auth');
const roleCheck = require('../../../middleware/roleCheck');
const {
  saveResponsesSchema,
  submitAppealSchema,
  upsertActivitiesSchema,
  createLiabilitySchema,
  updateLiabilitySchema,
  logRepaymentSchema,
  upsertExpenseSchema,
  // TRUST v2
  getSnapshotParams,
  recomputeParams,
  recomputeBody,
  createDecisionBody,
  portfolioQuery,
  exportPdfBody,
  requestDataParams,
  requestDataBody,
} = require('../validators/trustValidator');

// All trust routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /trust/home:
 *   get:
 *     tags: [Trust]
 *     summary: One-call dashboard payload (score + profile + activities + next nudge)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Combined dashboard payload }
 */
router.get('/home', trustController.getHome);

/**
 * @swagger
 * /trust/activities:
 *   get:
 *     tags: [Trust]
 *     summary: Get farmer livelihood activities and income mix
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Active subscriptions and latest year mix }
 *   put:
 *     tags: [Trust]
 *     summary: Upsert farmer activity subscriptions and (optional) annual income mix
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [activities]
 *             properties:
 *               activities:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type: { type: string, enum: [CROP, DAIRY, FISHERY, HORTI, LABOUR, OFF_FARM, AGRI_BIZ] }
 *                     isPrimary: { type: boolean }
 *                     startedYear: { type: integer }
 *               mix:
 *                 type: object
 *                 properties:
 *                   referenceYear: { type: integer }
 *                   items:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         type: { type: string }
 *                         sharePercent: { type: number }
 *                         estimatedAnnualIncomeInr: { type: number }
 *                         confidence: { type: string, enum: [LOW, MEDIUM, HIGH] }
 *     responses:
 *       200: { description: Activities updated }
 */
router.get('/activities', trustController.getActivities);
router.put('/activities', validate(upsertActivitiesSchema), trustController.upsertActivities);

/**
 * @swagger
 * /trust/sections:
 *   get:
 *     tags: [Trust]
 *     summary: Get all scoring sections
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of scoring sections with weights }
 */
router.get('/sections', trustController.getSections);

/**
 * @swagger
 * /trust/sections/{sectionId}/questions:
 *   get:
 *     tags: [Trust]
 *     summary: Get questions for a section
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: sectionId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: List of questions with choices }
 */
router.get('/sections/:sectionId/questions', trustController.getSectionQuestions);

/**
 * @swagger
 * /trust/responses:
 *   post:
 *     tags: [Trust]
 *     summary: Submit responses for a section
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sectionId, responses]
 *             properties:
 *               sectionId: { type: integer }
 *               responses:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionId: { type: integer }
 *                     response: {}
 *     responses:
 *       201: { description: Responses saved, score recalculated }
 */
router.post('/responses', validate(saveResponsesSchema), trustController.saveResponses);

/**
 * @swagger
 * /trust/progress:
 *   get:
 *     tags: [Trust]
 *     summary: Get overall questionnaire progress
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Section-by-section progress with overall percentage }
 */
router.get('/progress', trustController.getProgress);

/**
 * @swagger
 * /trust/score:
 *   get:
 *     tags: [Trust]
 *     summary: Get current TRUST score
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Total score, band, section breakdown }
 */
router.get('/score', trustController.getScore);

/**
 * @swagger
 * /trust/score/history:
 *   get:
 *     tags: [Trust]
 *     summary: Get score history
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200: { description: Paginated score history }
 */
router.get('/score/history', trustController.getScoreHistory);

/**
 * @swagger
 * /trust/appeal:
 *   post:
 *     tags: [Trust]
 *     summary: Submit a score appeal
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [appealReason]
 *             properties:
 *               appealReason: { type: string, minLength: 10 }
 *               additionalContext: { type: string }
 *     responses:
 *       201: { description: Appeal submitted }
 */
router.post('/appeal', validate(submitAppealSchema), trustController.submitAppeal);

/**
 * @swagger
 * /trust/appeal/{appealId}:
 *   get:
 *     tags: [Trust]
 *     summary: Get appeal status
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: appealId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Appeal details }
 */
router.get('/appeal/:appealId', trustController.getAppeal);

/**
 * @swagger
 * /admin/trust/appeals:
 *   get:
 *     tags: [Trust Admin]
 *     summary: Admin - Get all appeals
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, approved, rejected, under_review] }
 *     responses:
 *       200: { description: Paginated appeals list }
 */
// Admin route is mounted separately in index.js

// ─── Loan Liabilities & Repayments ──────────────────────────────────

/**
 * @swagger
 * /trust/liabilities:
 *   get:
 *     tags: [Trust]
 *     summary: List all loan liabilities + summary stats
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Liabilities + summary }
 *   post:
 *     tags: [Trust]
 *     summary: Create a new loan liability
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Liability created }
 */
router.get('/liabilities', trustController.listLiabilities);
router.post('/liabilities', validate(createLiabilitySchema), trustController.createLiability);

/**
 * @swagger
 * /trust/liabilities/{loanUuid}:
 *   put:
 *     tags: [Trust]
 *     summary: Update a loan liability
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     tags: [Trust]
 *     summary: Soft-delete a loan liability
 *     security: [{ bearerAuth: [] }]
 */
router.put('/liabilities/:loanUuid', validate(updateLiabilitySchema), trustController.updateLiability);
router.delete('/liabilities/:loanUuid', trustController.deleteLiability);

/**
 * @swagger
 * /trust/liabilities/{loanUuid}/repayments:
 *   get:
 *     tags: [Trust]
 *     summary: List repayments for a loan
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     tags: [Trust]
 *     summary: Log a repayment installment
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Repayment logged }
 */
router.get('/liabilities/:loanUuid/repayments', trustController.listRepayments);
router.post('/liabilities/:loanUuid/repayments', validate(logRepaymentSchema), trustController.logRepayment);

// ─── Household Expenses ─────────────────────────────────────────────

/**
 * @swagger
 * /trust/expenses:
 *   get:
 *     tags: [Trust]
 *     summary: List recent monthly expense snapshots
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     tags: [Trust]
 *     summary: Upsert this month's household expense snapshot
 *     security: [{ bearerAuth: [] }]
 */
router.get('/expenses', trustController.listExpenses);
router.post('/expenses', validate(upsertExpenseSchema), trustController.upsertMonthlyExpense);

/**
 * @swagger
 * /trust/expenses/current:
 *   get:
 *     tags: [Trust]
 *     summary: Get the current calendar month's expense snapshot (or null)
 *     security: [{ bearerAuth: [] }]
 */
router.get('/expenses/current', trustController.getCurrentMonthExpense);

/**
 * @swagger
 * /trust/expenses/summary:
 *   get:
 *     tags: [Trust]
 *     summary: 3/6-month rolling averages + current-month nudge state
 *     security: [{ bearerAuth: [] }]
 */
router.get('/expenses/summary', trustController.getExpenseSummary);

// ─── L5: Leverage ────────────────────────────────────────────────────

/**
 * @swagger
 * /trust/leverage:
 *   get:
 *     tags: [Trust]
 *     summary: L5 — Compute borrowing capacity (FOIR-based) + reference loan offers
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Leverage payload with EMI headroom + per-purpose offers }
 */
router.get('/leverage', trustController.getLeverage);

// ─── TRUST v2 — Snapshot, Decision, Portfolio ────────────────────

/**
 * @swagger
 * /trust/farmer/{farmerId}/snapshot:
 *   get:
 *     tags: [Trust v2]
 *     summary: Get the latest active TRUST v2 snapshot for a farmer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: farmerId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Full snapshot DTO with pillars, groups, evidence }
 *       404: { description: No active snapshot found }
 */
router.get('/farmer/:farmerId/snapshot', validate(getSnapshotParams, 'params'), trustController.getSnapshot);

/**
 * @swagger
 * /trust/farmer/{farmerId}/recompute:
 *   post:
 *     tags: [Trust v2]
 *     summary: Trigger a TRUST v2 snapshot recomputation for a farmer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: farmerId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string, maxLength: 200 }
 *     responses:
 *       201: { description: New snapshot created }
 *       422: { description: Incomplete — missing pillars returned }
 */
router.post(
  '/farmer/:farmerId/recompute',
  roleCheck('banker', 'admin'),
  validate(recomputeParams, 'params'),
  validate(recomputeBody),
  trustController.recomputeSnapshot,
);

/**
 * @swagger
 * /trust/decisions:
 *   post:
 *     tags: [Trust v2]
 *     summary: Record a banker lending decision (SANCTION / RECONSIDER / REJECT)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [snapshotUuid, decision]
 *             properties:
 *               snapshotUuid: { type: string, format: uuid }
 *               decision: { type: string, enum: [SANCTION, RECONSIDER, REJECT] }
 *               reasonCode: { type: string }
 *               reasonText: { type: string, minLength: 40 }
 *               cibilAcknowledged: { type: boolean }
 *     responses:
 *       201: { description: Decision recorded }
 *       404: { description: Snapshot UUID not found }
 *       409: { description: Decision already recorded by this banker }
 *       410: { description: Snapshot is no longer active }
 */
router.post('/decisions', roleCheck('banker'), validate(createDecisionBody), trustController.recordDecision);

/**
 * @swagger
 * /trust/portfolio:
 *   get:
 *     tags: [Trust v2]
 *     summary: Banker portfolio view — paginated farmer list with TRUST scores + filters
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: scoreBand
 *         schema: { type: string, enum: [SANCTION, RECONSIDER, REJECT, ALL] }
 *       - in: query
 *         name: maxDataAgeDays
 *         schema: { type: integer, minimum: 1, maximum: 365 }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 25 }
 *     responses:
 *       200: { description: Paginated portfolio with meta }
 */
router.get('/portfolio', roleCheck('banker'), validate(portfolioQuery, 'query'), trustController.getPortfolio);

/**
 * @swagger
 * /trust/export/pdf:
 *   post:
 *     tags: [Trust v2]
 *     summary: Request PDF export of a TRUST snapshot
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [snapshotUuid]
 *             properties:
 *               snapshotUuid: { type: string, format: uuid }
 *     responses:
 *       200: { description: PDF generation initiated }
 */
router.post('/export/pdf', roleCheck('banker'), validate(exportPdfBody), trustController.exportPdf);

/**
 * @swagger
 * /trust/farmer/{farmerId}/request-data:
 *   post:
 *     tags: [Trust v2]
 *     summary: Banker requests Sathi to collect missing pillar data
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: farmerId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [missingPillars]
 *             properties:
 *               missingPillars:
 *                 type: array
 *                 items: { type: string, enum: [P1, P2, P3, P4, P5, P6] }
 *     responses:
 *       201: { description: Sathi tasks created }
 */
router.post(
  '/farmer/:farmerId/request-data',
  roleCheck('banker'),
  validate(requestDataParams, 'params'),
  validate(requestDataBody),
  trustController.requestMoreData,
);

module.exports = router;
