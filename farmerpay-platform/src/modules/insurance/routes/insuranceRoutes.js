/**
 * Insurance Phase 2 POS — Routes.
 *
 *   Public (no auth):
 *     GET  /products             — list, optional ?subsidyType=&category=
 *     GET  /products/grouped     — grouped by sub_scheme for the farmer tabs
 *     GET  /products/:id         — single product detail
 *
 *   Authenticated (farmer):
 *     POST /quote                — returns farmer-facing quote breakdown
 *     POST /referrals            — log a viewed/quoted/referred action
 *     GET  /referrals/me         — farmer's own referral history
 */

const express = require('express');
const router = express.Router();

const productController = require('../controllers/productController');
const quoteController = require('../controllers/quoteController');
const referralController = require('../controllers/referralController');

const { authenticate } = require('../../../middleware/auth');
const validate = require('../../../middleware/validate');
const {
  productListQuerySchema,
  quoteBodySchema,
  referralBodySchema,
} = require('../validators/insuranceValidator');

// ─── Public product catalog ────────────────────────────────────────
router.get('/products', validate(productListQuerySchema, 'query'), productController.listProducts);
router.get('/products/grouped', validate(productListQuerySchema, 'query'), productController.getGroupedProducts);
router.get('/products/:id', productController.getProduct);

// ─── Authenticated quote + referral log ───────────────────────────
router.use(authenticate);

router.post('/quote', validate(quoteBodySchema), quoteController.quote);
router.post('/referrals', validate(referralBodySchema), referralController.log);
router.get('/referrals/me', referralController.listMine);

module.exports = router;
