/**
 * Bank Routes
 * Portfolio CSV import, loan account management, manual data entry.
 *
 * @swagger
 * tags:
 *   name: Bank Integration
 *   description: Finacle Pathway 1 — CSV import and manual data entry for bank staff
 */

const express = require('express');
const router = express.Router();
const bankController = require('../controllers/bankController');
const scaleController = require('../controllers/scaleController');
const cohortReportController = require('../controllers/cohortReportController');
const validate = require('../../../middleware/validate');
const { authenticate } = require('../../../middleware/auth');
const roleCheck = require('../../../middleware/roleCheck');
const { uploadDocument } = require('../../../middleware/upload');
const {
  importMetadataSchema, getLoanAccountsSchema, linkFarmerSchema,
  addDataEntrySchema, manualLoanEntrySchema,
} = require('../validators/bankValidator');

router.use(authenticate);
router.use(roleCheck('BANK_OFFICER', 'ADMIN'));

// ─── Portfolio Import ───────────────────────────────────────────

/**
 * @swagger
 * /bank/portfolio/import:
 *   post:
 *     tags: [Bank Integration]
 *     summary: Upload CSV/Excel of gold loan portfolio from Finacle extract
 *     security: [{ bearerAuth: [] }]
 *     consumes: [multipart/form-data]
 *     parameters:
 *       - in: formData
 *         name: file
 *         type: file
 *         required: true
 *         description: CSV or Excel file
 *     responses:
 *       201: { description: Portfolio imported with auto-match results }
 */
router.post('/portfolio/import', uploadDocument, bankController.importPortfolio);

/**
 * @swagger
 * /bank/portfolio/bulk-import:
 *   post:
 *     tags: [Bank Integration]
 *     summary: Upload 3-tab xlsx workbook (Loans + Schedules + Payments) — May 2026 pilot
 *     description: |
 *       Kicks off a transactional bulk import of a bank partner's farmer loan
 *       data. Returns the import_uuid immediately; processing runs in the
 *       background. Poll /bank/portfolio/bulk-import/:importUuid for status.
 *       See docs/BANK_IMPORT_TEMPLATE.md for the workbook schema.
 *     security: [{ bearerAuth: [] }]
 *     consumes: [multipart/form-data]
 *     parameters:
 *       - in: formData
 *         name: file
 *         type: file
 *         required: true
 *         description: 3-tab .xlsx workbook
 *       - in: formData
 *         name: bankName
 *         type: string
 *         required: true
 *       - in: formData
 *         name: branchCode
 *         type: string
 *       - in: formData
 *         name: district
 *         type: string
 *       - in: formData
 *         name: dataAsOfDate
 *         type: string
 *         format: date
 *     responses:
 *       202: { description: Import accepted and processing started }
 */
router.post('/portfolio/bulk-import', uploadDocument, bankController.bulkImport);

/**
 * @swagger
 * /bank/portfolio/bulk-import/{importUuid}:
 *   get:
 *     tags: [Bank Integration]
 *     summary: Poll bulk import status
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: importUuid
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Import status and counters }
 */
router.get('/portfolio/bulk-import/:importUuid', bankController.getBulkImportStatus);

// ─── Cohort Report (May 2026 pilot) ────────────────────────────
//
// Three slices of the same underlying bank_loan_account_histories
// roll-up. Query params for all three: fromDate, toDate (YYYY-MM-DD).
//
// `GET /bank/cohort-report/aggregate`
//    Pilot-wide: all banks × all districts × both cohorts + per-bank KPI breakdown
//
// `GET /bank/cohort-report/bank/:bankName`
//    Single bank + its district breakdown. What each bank partner reviews
//    in their weekly meeting with FarmerPay.
//
// `GET /bank/cohort-report/district/:districtName`
//    Single district + its bank breakdown. Isolates geography effects.
router.get('/cohort-report/aggregate', cohortReportController.getAggregate);
router.get('/cohort-report/bank/:bankName', cohortReportController.getByBank);
router.get('/cohort-report/district/:districtName', cohortReportController.getByDistrict);

/**
 * @swagger
 * /bank/portfolio/imports:
 *   get:
 *     tags: [Bank Integration]
 *     summary: Get import history
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of past imports }
 */
router.get('/portfolio/imports', bankController.getImportHistory);

// ─── Loan Accounts ──────────────────────────────────────────────

/**
 * @swagger
 * /bank/loan-accounts:
 *   get:
 *     tags: [Bank Integration]
 *     summary: List imported loan accounts with SMA/type/linkage filtering
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated loan accounts }
 */
router.get('/loan-accounts', validate(getLoanAccountsSchema, 'query'), bankController.getLoanAccounts);

/**
 * @swagger
 * /bank/loan-accounts/manual:
 *   post:
 *     tags: [Bank Integration]
 *     summary: Manual single loan account entry
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Loan account created }
 */
router.post('/loan-accounts/manual', validate(manualLoanEntrySchema), bankController.manualLoanEntry);

/**
 * @swagger
 * /bank/loan-accounts/{accountId}:
 *   get:
 *     tags: [Bank Integration]
 *     summary: Get loan account detail with data entries
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Full account detail }
 */
router.get('/loan-accounts/:accountId', bankController.getLoanAccountDetail);

/**
 * @swagger
 * /bank/loan-accounts/{accountId}/link:
 *   post:
 *     tags: [Bank Integration]
 *     summary: Link bank loan account to FarmerPay farmer
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Account linked }
 */
router.post('/loan-accounts/:accountId/link', validate(linkFarmerSchema), bankController.linkToFarmer);

/**
 * @swagger
 * /bank/loan-accounts/{accountId}/data-entry:
 *   post:
 *     tags: [Bank Integration]
 *     summary: Manual data entry (repayment, SMA update, collateral, etc.)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Data entry recorded }
 */
router.post('/loan-accounts/:accountId/data-entry', validate(addDataEntrySchema), bankController.addDataEntry);

// ─── Scale Platform (Phase 4) ──────────────────────────────────

/** GET /bank/multi-bank/config — Multi-bank white-label configuration */
router.get('/multi-bank/config', scaleController.getMultiBankConfig);

/** GET /bank/open-api/marketplace — Open API marketplace listing */
router.get('/open-api/marketplace', scaleController.getOpenApiMarketplace);

/** GET /bank/account-aggregator/:farmerId — AA connection status */
router.get('/account-aggregator/:farmerId', scaleController.getAccountAggregatorStatus);

/** GET /bank/ocen/network — OCEN lending network status */
router.get('/ocen/network', scaleController.getOcenLendingNetwork);

/** GET /bank/cbs/integrations — CBS integration pathways */
router.get('/cbs/integrations', scaleController.getCbsIntegrationStatus);

/** GET /bank/state-customization — State-level customization config */
router.get('/state-customization', scaleController.getStateCustomization);

/** GET /bank/regulatory-reports — Regulatory report status and downloads */
router.get('/regulatory-reports', scaleController.getRegulatoryReports);

/** GET /bank/benchmarks — Cross-bank performance benchmarks */
router.get('/benchmarks', scaleController.getBenchmarkAnalytics);

module.exports = router;
