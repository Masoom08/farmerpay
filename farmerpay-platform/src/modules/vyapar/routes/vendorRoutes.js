/**
 * Vendor Routes
 * Registration, profile, KYC, catalog, performance, and ratings.
 *
 * @swagger
 * tags:
 *   name: Vyapar
 *   description: Vendor marketplace management
 */

const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const validate = require('../../../middleware/validate');
const { authenticate } = require('../../../middleware/auth');
const roleCheck = require('../../../middleware/roleCheck');
const {
  registerVendorSchema, updateProfileSchema, catalogItemSchema, updateCatalogSchema,
  creditPaymentSchema,
} = require('../validators/vyaparValidator');

router.use(authenticate);
router.use(roleCheck('VENDOR', 'ADMIN'));

/**
 * @swagger
 * /vyapar/register:
 *   post:
 *     tags: [Vyapar]
 *     summary: Register as a vendor with shop and service area
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Vendor registered }
 */
router.post('/register', validate(registerVendorSchema), vendorController.register);

/**
 * @swagger
 * /vyapar/profile:
 *   get:
 *     tags: [Vyapar]
 *     summary: Get vendor profile with KYC, shops, service areas
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Full vendor profile }
 */
router.get('/profile', vendorController.getProfile);

/**
 * @swagger
 * /vyapar/catalog:
 *   get:
 *     tags: [Vyapar]
 *     summary: Get vendor product catalog
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated catalog }
 *   post:
 *     tags: [Vyapar]
 *     summary: Add item to catalog
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Catalog item added }
 */
router.get('/catalog', vendorController.getCatalog);
router.post('/catalog', validate(catalogItemSchema), vendorController.addCatalogItem);

/**
 * @swagger
 * /vyapar/catalog/{catalogId}:
 *   put:
 *     tags: [Vyapar]
 *     summary: Update catalog item (price, stock)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Catalog item updated }
 */
router.put('/catalog/:catalogId', validate(updateCatalogSchema), vendorController.updateCatalogItem);

/**
 * @swagger
 * /vyapar/performance:
 *   get:
 *     tags: [Vyapar]
 *     summary: Get vendor performance metrics
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Performance KPIs }
 */
router.get('/performance', vendorController.getPerformance);

/**
 * @swagger
 * /vyapar/ratings:
 *   get:
 *     tags: [Vyapar]
 *     summary: Get vendor ratings and reviews
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Ratings with average }
 */
router.get('/ratings', vendorController.getRatings);

// ─── Inventory ──────────────────────────────────────────────────

/** @swagger /vyapar/inventory GET - Get vendor inventory */
router.get('/inventory', vendorController.getInventory);

// ─── Credit Ledger ──────────────────────────────────────────────

/** @swagger /vyapar/credit-ledger GET - Get credit ledger for all farmers */
router.get('/credit-ledger', vendorController.getCreditLedger);

/** @swagger /vyapar/credit-ledger/:farmerId GET - Get farmer credit detail */
router.get('/credit-ledger/:farmerId', vendorController.getFarmerCreditDetail);

/** @swagger /vyapar/credit-ledger/:farmerId/payment POST - Record credit payment */
router.post('/credit-ledger/:farmerId/payment', validate(creditPaymentSchema), vendorController.recordCreditPayment);

module.exports = router;
