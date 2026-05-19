/**
 * Banker Routes — Portfolio analytics dashboard for DICE analysts.
 * All routes require authentication + dice_analyst or system_admin role.
 */

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/bankerController');
const cohortCtrl = require('../controllers/bankerCohortController');
const loanInboxCtrl = require('../controllers/loanInboxController');
const insuranceCtrl = require('../controllers/insuranceController');
const { authenticate } = require('../../../middleware/auth');
const roleCheck = require('../../../middleware/roleCheck');
const validate = require('../../../middleware/validate');
const { farmerRiskListSchema, portfolioTrendsSchema } = require('../validators/bankerValidator');

router.use(authenticate);
router.use(roleCheck('dice_analyst', 'system_admin', 'FARMER')); // FARMER added for demo — remove in production

// Portfolio overview — aggregate stats
router.get('/portfolio/overview', ctrl.getPortfolioOverview);

// Farmer risk list — paginated, filterable
router.get('/portfolio/farmers', validate(farmerRiskListSchema, 'query'), ctrl.getFarmerRiskList);

// Individual farmer detail
router.get('/portfolio/farmers/:farmerId', ctrl.getFarmerDetail);

// Early warning alerts
router.get('/portfolio/early-warnings', ctrl.getEarlyWarnings);

// Portfolio trends over time
router.get('/portfolio/trends', validate(portfolioTrendsSchema, 'query'), ctrl.getPortfolioTrends);

// ROOTS Activity Analytics — full crop lifecycle + multi-activity data
router.get('/portfolio/roots-activity', ctrl.getRootsActivity);

// ─── Pilot Cohort Report (WS7) ─────────────────────────────────
// Surfaces the same cohort report data that the admin UI and bank
// module use, scoped under /banker so it's reachable from the
// existing banker-dashboard.html SPA without any route reshuffling.
// All 3 endpoints delegate to cohortReportBuilder (zero duplication).
router.get('/cohort-report/aggregate', cohortCtrl.getAggregate);
router.get('/cohort-report/bank/:bankName', cohortCtrl.getByBank);
router.get('/cohort-report/district/:districtName', cohortCtrl.getByDistrict);

// ─── Loan Inbox — banker review + approve/reject loan applications ──
// Closes the loop on the /loan-journey wizard: farmer submits an
// application, it lands here with status='submitted', the banker
// claims it → reviews → approves with sanction details or rejects
// with reason. Every transition writes a loan_application_status_history
// row and approvals also queue a loan_approval_push event for Finacle.
router.get('/loan-inbox', loanInboxCtrl.list);
router.get('/loan-inbox/:applicationId', loanInboxCtrl.detail);
router.post('/loan-inbox/:applicationId/claim', loanInboxCtrl.claim);
router.post('/loan-inbox/:applicationId/approve', loanInboxCtrl.approve);
router.post('/loan-inbox/:applicationId/reject', loanInboxCtrl.reject);

// ─── Insurance Portfolio (Insurance Phase 1 — read-only) ─────────
// Surfaces the insurance_enrollments + loan_insurance_bundled tables
// so bankers can see policy portfolio, premium subsidy tracking, and
// claim pipeline without having to leave the dashboard. All 3
// endpoints are read-only; claim approve/reject workflow is Phase 2.
router.get('/insurance/portfolio', insuranceCtrl.getPortfolioSummary);
router.get('/insurance/policies', insuranceCtrl.listPolicies);
router.get('/insurance/claims', insuranceCtrl.listClaims);

// Insurance Phase 2 — POS funnel + catalog admin view
router.get('/insurance/pos-products', insuranceCtrl.listPosProducts);
router.get('/insurance/referral-funnel', insuranceCtrl.getReferralFunnel);
router.get('/insurance/referrals', insuranceCtrl.listReferrals);

// ─── ROOTS Compliance Analytics (Variance Engine) ─────────────
const rootsCompCtrl = require('../controllers/rootsComplianceController');
const { rootsComplianceSchema, rootsRedFlagsSchema } = require('../validators/bankerValidator');
router.get('/portfolio/roots-compliance', validate(rootsComplianceSchema, 'query'), rootsCompCtrl.getPortfolioCompliance);
router.get('/portfolio/roots-red-flags', validate(rootsRedFlagsSchema, 'query'), rootsCompCtrl.getRedFlags);
router.get('/portfolio/roots-vs-repayment', rootsCompCtrl.getRootsVsRepayment);
router.get('/portfolio/branch-compliance', rootsCompCtrl.getBranchCompliance);
router.post('/portfolio/roots-red-flags/:flagId/acknowledge', rootsCompCtrl.acknowledgeRedFlag);

module.exports = router;
