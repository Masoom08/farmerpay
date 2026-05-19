/**
 * Pulse Routes
 * Market prices, mandis, forecasts, MSP, alerts, and sell recommendations.
 *
 * @swagger
 * tags:
 *   name: PULSE
 *   description: Market price intelligence and sell recommendations
 */

const express = require('express');
const router = express.Router();
const pulseController = require('../controllers/pulseController');
const validate = require('../../../middleware/validate');
const { authenticate } = require('../../../middleware/auth');
const roleCheck = require('../../../middleware/roleCheck');
const {
  getMandisSchema, getLatestPricesSchema, getPriceChartSchema,
  getMspSchema, createFarmerPriceAlertSchema, getSellRecommendationsSchema,
} = require('../validators/pulseValidator');

// Public endpoints (no auth required for commodity/mandi/price lookups)

/** @swagger /pulse/commodities GET */
router.get('/commodities', pulseController.getCommodities);

/** @swagger /pulse/mandis GET */
router.get('/mandis', validate(getMandisSchema, 'query'), pulseController.getMandis);

/** @swagger /pulse/prices/latest GET */
router.get('/prices/latest', validate(getLatestPricesSchema, 'query'), pulseController.getLatestPrices);

/** @swagger /pulse/prices/chart GET */
router.get('/prices/chart', validate(getPriceChartSchema, 'query'), pulseController.getPriceChart);

/** @swagger /pulse/price-forecast/:commodityId GET */
router.get('/price-forecast/:commodityId', pulseController.getPriceForecast);

/** @swagger /pulse/msp/:commodityId GET */
router.get('/msp/:commodityId', validate(getMspSchema, 'query'), pulseController.getMsp);

// Authenticated endpoints
router.use(authenticate);
router.use(roleCheck('FARMER', 'AGENT', 'ADMIN'));

/** @swagger /pulse/farmer-price-alert POST */
router.post('/farmer-price-alert', validate(createFarmerPriceAlertSchema), pulseController.createFarmerPriceAlert);

/** @swagger /pulse/sell-recommendations/:farmerId GET */
router.get('/sell-recommendations/:farmerId', validate(getSellRecommendationsSchema, 'query'), pulseController.getSellRecommendations);

/** @swagger /pulse/price-realisation/:farmerId GET — PULSE x DICE Bridge */
router.get('/price-realisation/:farmerId', pulseController.getPriceRealisation);

// ─── Sell-Store Advisor (Dual Loan Decision Engine) ─────────────────

/**
 * @swagger
 * /pulse/warehouse-presets:
 *   get:
 *     tags: [PULSE]
 *     summary: Get warehouse type presets (mandi/WDRA/silo) with default rates
 *     responses:
 *       200: { description: Warehouse presets with storage/handling/transport rates }
 */
router.get('/warehouse-presets', pulseController.warehousePresets);

/**
 * @swagger
 * /pulse/sell-store-defaults/{farmerId}:
 *   get:
 *     tags: [PULSE]
 *     summary: Get smart defaults from DB (prices, MSP, loans, warehouses) for advisor
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: farmerId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: commodityId
 *         schema: { type: string }
 *       - in: query
 *         name: mandiId
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Smart defaults for sell-store advisor }
 */
router.get('/sell-store-defaults/:farmerId', pulseController.sellStoreDefaults);

/**
 * @swagger
 * /pulse/sell-store-advisor:
 *   post:
 *     tags: [PULSE]
 *     summary: Full sell-vs-store analysis with dual loans (5 scenarios)
 *     description: >
 *       Calculates 5 scenarios (sell now, sell MSP, store 21d/45d/60d) with
 *       pre-sowing KCC loan + WR pledge loan repayment tracking.
 *       Returns net per qtl, total, and after-loan earnings for each.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantityQuintals, openMarketPrice, mspPrice]
 *             properties:
 *               crop: { type: string, example: "Paddy" }
 *               quantityQuintals: { type: number, example: 100 }
 *               openMarketPrice: { type: number, example: 2350 }
 *               mspPrice: { type: number, example: 2300 }
 *               priceChange21d: { type: number, example: 4 }
 *               priceChange45d: { type: number, example: 7 }
 *               priceChange60d: { type: number, example: 10 }
 *               warehouseType: { type: string, enum: [mandi, wdra, silo], example: "wdra" }
 *               annualInterestRate: { type: number, example: 12 }
 *               insuranceRate: { type: number, example: 0.15 }
 *               wastageRate: { type: number, example: 0.25 }
 *               mandiFeePercent: { type: number, example: 2 }
 *               usePreSowing: { type: boolean, example: true }
 *               preSowingAmount: { type: number, example: 80000 }
 *               preSowingRate: { type: number, example: 12 }
 *               preSowingProcFee: { type: number, example: 0 }
 *               preSowingElapsedDays: { type: number, example: 90 }
 *               useWrLoan: { type: boolean, example: true }
 *               wrLtvPercent: { type: number, example: 70 }
 *               wrRate: { type: number, example: 10.5 }
 *               wrProcFee: { type: number, example: 0.5 }
 *               wrValuationBasis: { type: string, enum: [open, msp, custom], example: "open" }
 *               wrCustomValuation: { type: number }
 *     responses:
 *       200: { description: Full analysis with 5 scenarios, recommendation, and breakeven }
 */
router.post('/sell-store-advisor', pulseController.sellStoreAnalysis);

/**
 * @swagger
 * /pulse/cashflow-timeline:
 *   post:
 *     tags: [PULSE]
 *     summary: Cashflow timeline events for a specific sell/store scenario
 *     description: >
 *       Returns event-based cashflow with cumulative position tracking.
 *       Events include loan disbursements, storage costs, sale proceeds, and repayments.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [scenarioKey, quantityQuintals, openMarketPrice, mspPrice]
 *             properties:
 *               scenarioKey: { type: string, enum: [now, msp, d21, d45, d60], example: "d21" }
 *     responses:
 *       200: { description: Cashflow events + cumulative series for charting }
 */
router.post('/cashflow-timeline', pulseController.cashflowTimeline);

// ─── Phase 1 — Sell-or-Store farmer wizard endpoints ─────────────
//
// /sell-store-defaults-enriched — same shape as /sell-store-defaults
// but ALSO returns the auto-pulled cycle, costOfCultivation,
// quantityQuintals, harvestDate, nextEmi, activeLoanApplicationId.
// Lets the wizard open with everything pre-filled from ROOTS + DICE.
//
// /sell-store-recommendations — persists a chosen recommendation to
// pulse_sell_recommendations after the farmer clicks "I'll sell now"
// or "I'll store for X days" on Step 6 of the wizard.
router.get(
  '/sell-store-defaults-enriched/:farmerId',
  pulseController.sellStoreDefaultsEnriched,
);
router.post('/sell-store-recommendations', pulseController.saveSellRecommendation);

// ─── Phase 2 — Nudges + feedback ────────────────────────────────
//
// /nudges/me — the farmer-app persona home polls this on focus and
// renders the highest-severity nudge as an amber banner under the
// welcome strip. Returns sorted list (highest severity first).
//
// /sell-recommendations/:id/feedback — farmer reports back whether
// they actually followed the recommendation and what price they got.
router.get('/nudges/me', pulseController.getNudges);
router.post(
  '/sell-recommendations/:recommendationId/feedback',
  pulseController.saveRecommendationFeedback,
);

// ROOTS × PULSE personalized sell recommendation
router.get('/farmer/me/sell-recommendation', pulseController.getPersonalizedSellRecommendation);

module.exports = router;
