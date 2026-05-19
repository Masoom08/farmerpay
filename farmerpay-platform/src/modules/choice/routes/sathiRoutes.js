/**
 * Sathi Routes (extensions to the CHOICE module)
 *
 * Mounted at /sathi in app.js. All routes require authentication.
 * The controllers resolve the calling Sathi from the JWT subject.
 *
 * @swagger
 * tags:
 *   name: Sathi
 *   description: CRP / Sathi assist, commissions, issues, nudges, and dashboard
 */

const express = require('express');
const router = express.Router();

const sathiController = require('../controllers/sathiController');
const validate = require('../../../middleware/validate');
const { authenticate } = require('../../../middleware/auth');
const {
  assistLoanSchema,
  assistInsuranceSchema,
  assistDataEntrySchema,
  raiseIssueSchema,
  updateIssueSchema,
  scheduleNudgeSchema,
  commissionQuerySchema,
} = require('../validators/sathiValidator');

router.use(authenticate);

// ─── Assist (hand-hold farmer on application filling) ───────────────
/**
 * @swagger
 * /sathi/assist/loan:
 *   post:
 *     tags: [Sathi]
 *     summary: Initiate a loan application on behalf of an assigned farmer
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Loan draft created }
 */
router.post('/assist/loan', validate(assistLoanSchema), sathiController.assistLoan);

/**
 * @swagger
 * /sathi/assist/insurance:
 *   post:
 *     tags: [Sathi]
 *     summary: Initiate an insurance referral for an assigned farmer
 *     security: [{ bearerAuth: [] }]
 */
router.post('/assist/insurance', validate(assistInsuranceSchema), sathiController.assistInsurance);

/**
 * @swagger
 * /sathi/assist/data-entry:
 *   post:
 *     tags: [Sathi]
 *     summary: Patch farmer profile fields on their behalf
 *     security: [{ bearerAuth: [] }]
 */
router.post('/assist/data-entry', validate(assistDataEntrySchema), sathiController.assistDataEntry);

// ─── Commissions & Incentives ───────────────────────────────────────
/**
 * @swagger
 * /sathi/commissions:
 *   get:
 *     tags: [Sathi]
 *     summary: List the calling Sathi's commission ledger
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, example: "2026-04" }
 */
router.get(
  '/commissions',
  validate(commissionQuerySchema, 'query'),
  sathiController.listCommissions
);

/**
 * @swagger
 * /sathi/incentives:
 *   get:
 *     tags: [Sathi]
 *     summary: List milestone incentive rows for the calling Sathi
 *     security: [{ bearerAuth: [] }]
 */
router.get('/incentives', sathiController.listIncentives);

// ─── Issues ─────────────────────────────────────────────────────────
/**
 * @swagger
 * /sathi/issues:
 *   post:
 *     tags: [Sathi]
 *     summary: Raise an issue flag for banker intervention
 *     security: [{ bearerAuth: [] }]
 *   get:
 *     tags: [Sathi]
 *     summary: List the calling Sathi's issue flags
 *     security: [{ bearerAuth: [] }]
 */
router.post('/issues', validate(raiseIssueSchema), sathiController.raiseIssue);
router.get('/issues', sathiController.listMyIssues);

/**
 * @swagger
 * /sathi/issues/banker-queue:
 *   get:
 *     tags: [Sathi]
 *     summary: Banker view of open Sathi-raised issues
 *     security: [{ bearerAuth: [] }]
 */
router.get('/issues/banker-queue', sathiController.listBankerIssues);

/**
 * @swagger
 * /sathi/issues/{issueId}:
 *   patch:
 *     tags: [Sathi]
 *     summary: Update issue status (acknowledge / resolve / dismiss)
 *     security: [{ bearerAuth: [] }]
 */
router.patch(
  '/issues/:issueId',
  validate(updateIssueSchema),
  sathiController.updateIssue
);

// ─── Nudges ─────────────────────────────────────────────────────────
/**
 * @swagger
 * /sathi/nudges:
 *   post:
 *     tags: [Sathi]
 *     summary: Schedule a nudge (SMS / push / WhatsApp / IVR)
 *     security: [{ bearerAuth: [] }]
 *   get:
 *     tags: [Sathi]
 *     summary: List the calling Sathi's nudges
 *     security: [{ bearerAuth: [] }]
 */
router.post('/nudges', validate(scheduleNudgeSchema), sathiController.scheduleNudge);
router.get('/nudges', sathiController.listNudges);

// ─── Dashboard ──────────────────────────────────────────────────────
/**
 * @swagger
 * /sathi/dashboard/overview:
 *   get:
 *     tags: [Sathi]
 *     summary: KPI overview for the Sathi dashboard
 *     security: [{ bearerAuth: [] }]
 */
router.get('/dashboard/overview', sathiController.getDashboardOverview);
router.get('/dashboard/loans', sathiController.getDashboardLoans);
router.get('/dashboard/insurance', sathiController.getDashboardInsurance);
router.get('/dashboard/farmers', sathiController.getDashboardFarmers);

module.exports = router;
