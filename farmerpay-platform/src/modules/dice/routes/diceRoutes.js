/**
 * DICE Routes — Loan discovery, application, insurance, and origination.
 *
 * Authentication Strategy (Two-Tier):
 *   Tier-1 (authenticate): Mobile+password login — allows browsing products,
 *                          calculators, viewing own applications, bookmarks.
 *   Tier-2 (requireAadhaarAuth): Aadhaar OTP step-up — required for any financial
 *                                commitment: apply, enroll, disburse, repayment,
 *                                consent, sanction letter retrieval.
 *
 * @swagger
 * tags:
 *   name: DICE
 *   description: Loan matching, eligibility, application management, and insurance
 */
const express = require('express');
const router = express.Router();
const diceController = require('../controllers/diceController');
const postharvestController = require('../controllers/postharvestController');
const validate = require('../../../middleware/validate');
const { authenticate } = require('../../../middleware/auth');
const requireAadhaarAuth = require('../../../middleware/requireAadhaarAuth');
const roleCheck = require('../../../middleware/roleCheck');
const { applyLoanSchema, bookmarkSchema, consentSchema, repaymentSchema } = require('../validators/diceValidator');
const { applyTopupSchema, releaseTopupSchema } = require('../validators/postharvestValidator');
const inputCalcController = require('../controllers/inputCalculatorController');
const { calculateLoanSchema, inputDropdownSchema, extraInputsSchema, sofLookupSchema } = require('../validators/inputCalculatorValidator');
const goldLoanController = require('../controllers/goldLoanController');
const insuranceController = require('../controllers/insuranceController');
const losController = require('../controllers/losController');
const sofAdminController = require('../controllers/sofAdminController');
const loanDocumentController = require('../controllers/loanDocumentController');
const { createLimiter } = require('../../../middleware/rateLimiter');

// Document upload can spam 5MB files per request; cap to 10/hour per user
// so a single farmer or compromised token can't fill disk or bandwidth.
const docUploadLimiter = createLimiter({ windowMs: 60 * 60 * 1000, max: process.env.NODE_ENV !== 'production' ? 1000 : 10 });

// ════════════════════════════════════════════════════════════════════
// PUBLIC / TIER-1 ROUTES — browsing, calculators, view-only
// ════════════════════════════════════════════════════════════════════

// Public: browse products + Scale of Finance lookup
router.get('/products', diceController.getProducts);
router.get('/products/:productId', diceController.getProduct);
router.get('/scale-of-finance', validate(sofLookupSchema, 'query'), inputCalcController.getScaleOfFinance);
router.get('/warehouses', postharvestController.listWarehouses);

// Tier-1 authenticated: eligibility check, own applications view, bookmarks
router.get('/products/:productId/eligibility', authenticate, diceController.getEligibility);
router.get('/applications', authenticate, diceController.listApplications);
router.get('/applications/:applicationId', authenticate, diceController.getApplication);

// Loan application document upload + listing — Tier-1 because the
// farmer is just attaching their own KYC / land record / passbook
// images. Multer middleware writes to /uploads/loan-docs/{appId}/.
router.post(
  '/applications/:applicationId/documents',
  authenticate,
  docUploadLimiter,
  loanDocumentController.uploadMiddleware,
  loanDocumentController.uploadDocument,
);
router.get(
  '/applications/:applicationId/documents',
  authenticate,
  loanDocumentController.listDocuments,
);

// Unified loan feed — FarmerPay-originated + bank-imported loans (May 2026 pilot).
// Consumed by farmer-app Money tab + repayments screen.
router.get('/loans/me', authenticate, diceController.getMyLoansHandler);

router.post('/products/:productId/bookmark', authenticate, validate(bookmarkSchema), diceController.bookmarkProduct);
router.get('/bookmarked-products', authenticate, diceController.getBookmarks);

// Tier-1: input calculators (safe — no commitment)
router.get('/input-calculator/inputs', authenticate, validate(inputDropdownSchema, 'query'), inputCalcController.getInputDropdown);
router.get('/input-calculator/extra-inputs', authenticate, validate(extraInputsSchema, 'query'), inputCalcController.getExtraInputs);
router.post('/input-calculator/calculate', authenticate, validate(calculateLoanSchema), inputCalcController.calculateLoan);

// Tier-1: gold loan price/LTV lookups (reference data)
router.get('/gold-loan/ibja-price', authenticate, goldLoanController.getPrice);
router.get('/gold-loan/ltv-cap', authenticate, goldLoanController.getLtvCap);
router.post('/gold-loan/calculate-value', authenticate, goldLoanController.calcValue);

// Tier-1: insurance catalog + premium calculator
router.get('/insurance/products', authenticate, insuranceController.products);
router.post('/insurance/calculate-premium', authenticate, insuranceController.calcPremium);
router.get('/insurance/status', authenticate, insuranceController.status);

// Tier-1: post-harvest view endpoints
router.get('/postharvest-topup/farmer/:farmerId', authenticate, postharvestController.listFarmerTopups);
router.get('/postharvest-topup/:topupId', authenticate, postharvestController.getTopup);

// Tier-1: LOS status view
router.get('/los/:applicationId/status', authenticate, losController.originationStatus);

// ════════════════════════════════════════════════════════════════════
// TIER-2 ROUTES — require Aadhaar step-up (financial commitment)
// ════════════════════════════════════════════════════════════════════

// ─── Loan Application (write operations) ─────────────────────────
router.post('/apply', authenticate, requireAadhaarAuth, validate(applyLoanSchema), diceController.apply);
router.put('/applications/:applicationId/withdraw', authenticate, requireAadhaarAuth, diceController.withdraw);
router.post('/applications/:applicationId/resubmit', authenticate, requireAadhaarAuth, diceController.resubmit);

// ─── Consent + Repayment (money movement) ────────────────────────
router.post('/consent', authenticate, requireAadhaarAuth, validate(consentSchema), diceController.consent);
router.post('/repayment', authenticate, requireAadhaarAuth, validate(repaymentSchema), diceController.repayment);

// ─── Post-Harvest Top-Up (commitment) ─────────────────────────────
router.post('/postharvest-topup/apply', authenticate, requireAadhaarAuth, validate(applyTopupSchema), postharvestController.applyTopup);
router.post('/postharvest-topup/:topupId/release', authenticate, requireAadhaarAuth, validate(releaseTopupSchema), postharvestController.releaseTopup);

// ─── Gold Loan (sensitive application docs) ──────────────────────
router.get('/gold-loan/checklist/:applicationId', authenticate, requireAadhaarAuth, goldLoanController.getChecklist);

// ─── Insurance (financial commitment) ─────────────────────────────
router.post('/insurance/enroll', authenticate, requireAadhaarAuth, insuranceController.enroll);
router.post('/insurance/claim', authenticate, requireAadhaarAuth, insuranceController.claim);

// ─── LOS (Loan Origination System) — all writes require step-up ───
router.post('/los/initiate', authenticate, requireAadhaarAuth, losController.initiate);
router.post('/los/:applicationId/submit', authenticate, requireAadhaarAuth, losController.submit);
router.post('/los/:applicationId/review', authenticate, requireAadhaarAuth, roleCheck('dice_analyst', 'system_admin'), losController.review);
router.post('/los/:applicationId/checker-approval', authenticate, requireAadhaarAuth, roleCheck('dice_analyst', 'system_admin'), losController.checker);
router.get('/los/:applicationId/sanction-letter', authenticate, requireAadhaarAuth, losController.sanctionLetter);
router.post('/los/:applicationId/disburse', authenticate, requireAadhaarAuth, roleCheck('dice_analyst', 'system_admin'), losController.disburse);

// ─── SoF Admin Routes (admin role — no farmer Aadhaar needed) ───
router.get('/sof-admin', authenticate, roleCheck('system_admin', 'super_admin'), sofAdminController.list);
router.get('/sof-admin/history', authenticate, roleCheck('system_admin', 'super_admin'), sofAdminController.history);
router.post('/sof-admin', authenticate, roleCheck('system_admin', 'super_admin'), sofAdminController.create);
router.put('/sof-admin/:sofId', authenticate, roleCheck('system_admin', 'super_admin'), sofAdminController.update);

module.exports = router;
