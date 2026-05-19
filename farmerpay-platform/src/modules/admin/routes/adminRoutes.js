/**
 * Admin Routes — bank-ops admin UI for the May 2026 pilot.
 *
 * Mounted at /admin in app.js. EJS server-rendered, browser-cookie auth
 * via express-session. Separate from the JSON API auth flow used by the
 * farmer-app.
 */

const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const loanInboxCtrl = require('../controllers/loanInboxController');
const { requireAdmin } = require('../middleware/adminAuth');
const { uploadDocument } = require('../../../middleware/upload');

// ─── Public (auth) ───────────────────────────────────────────────
router.get('/login', adminController.showLogin);
router.post('/login', adminController.doLogin);
router.post('/logout', adminController.doLogout);
router.get('/logout', adminController.doLogout); // convenience

// ─── Authenticated ───────────────────────────────────────────────
router.use(requireAdmin);

router.get('/', adminController.showDashboard);

// Imports
router.get('/imports', adminController.showImportsList);
router.get('/imports/new', adminController.showNewImport);
router.post('/imports', uploadDocument, adminController.submitNewImport);
router.get('/imports/:uuid', adminController.showImportStatus);

// Cohort reports
router.get('/reports/aggregate', adminController.showAggregateReport);
router.get('/reports/bank/:bankName', adminController.showBankReport);
router.get('/reports/district/:districtName', adminController.showDistrictReport);

// Loan Inbox — farmer-originated applications from /loan-journey.
// All auth is already in place (requireAdmin on line 23). Role
// refinement (bank_admin / pilot_ops / system_admin only) is a
// follow-up if the pilot needs per-role gating.
router.get('/loans', loanInboxCtrl.showList);
router.get('/loans/:applicationId', loanInboxCtrl.showDetail);
router.post('/loans/:applicationId/claim', loanInboxCtrl.doClaim);
router.post('/loans/:applicationId/approve', loanInboxCtrl.doApprove);
router.post('/loans/:applicationId/reject', loanInboxCtrl.doReject);

module.exports = router;
