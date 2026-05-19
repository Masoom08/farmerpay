/**
 * Ecosystem Routes — Phase 3 planned features.
 * Marketplace, finance, insurance, DigiLocker, e-RUPI, CRIF, hedging.
 *
 * @swagger
 * tags:
 *   name: Vyapar-Ecosystem
 *   description: Phase 3 ecosystem integrations (mock data)
 */

const express = require('express');
const router = express.Router();
const ecosystemController = require('../controllers/ecosystemController');
const { authenticate } = require('../../../middleware/auth');

router.use(authenticate);

// ─── Input Marketplace ─────────────────────────────────────────────

/**
 * @swagger
 * /vyapar/marketplace/inputs:
 *   get:
 *     tags: [Vyapar-Ecosystem]
 *     summary: Browse agricultural input sellers (fertilisers, seeds, pesticides)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: cropId
 *         schema: { type: string }
 *       - in: query
 *         name: districtId
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Paginated list of input sellers }
 */
router.get('/marketplace/inputs', ecosystemController.getInputMarketplace);

// ─── Supply-Chain Finance ──────────────────────────────────────────

/**
 * @swagger
 * /vyapar/supply-chain-finance/{farmerId}:
 *   get:
 *     tags: [Vyapar-Ecosystem]
 *     summary: Get supply-chain finance eligibility and invoices for a farmer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: farmerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Supply chain finance details }
 */
router.get('/supply-chain-finance/:farmerId', ecosystemController.getSupplyChainFinance);

// ─── Warehouse Receipt Finance ─────────────────────────────────────

/**
 * @swagger
 * /vyapar/warehouse-finance/{farmerId}:
 *   get:
 *     tags: [Vyapar-Ecosystem]
 *     summary: Get warehouse receipt finance details for a farmer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: farmerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Warehouse receipts and finance availability }
 */
router.get('/warehouse-finance/:farmerId', ecosystemController.getWarehouseReceiptFinance);

// ─── FPO Lending ───────────────────────────────────────────────────

/**
 * @swagger
 * /vyapar/fpo-lending/{fpoId}:
 *   get:
 *     tags: [Vyapar-Ecosystem]
 *     summary: Get FPO lending portfolio status and member loans
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: fpoId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: FPO lending portfolio details }
 */
router.get('/fpo-lending/:fpoId', ecosystemController.getFpoLendingStatus);

// ─── Livestock Insurance ───────────────────────────────────────────

/**
 * @swagger
 * /vyapar/livestock-insurance/{farmerId}:
 *   get:
 *     tags: [Vyapar-Ecosystem]
 *     summary: Get livestock insurance policies for a farmer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: farmerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Livestock insurance policies and coverage }
 */
router.get('/livestock-insurance/:farmerId', ecosystemController.getLivestockInsurance);

// ─── Weather Insurance ─────────────────────────────────────────────

/**
 * @swagger
 * /vyapar/weather-insurance:
 *   get:
 *     tags: [Vyapar-Ecosystem]
 *     summary: Get parametric weather insurance products for a district/season
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: districtId
 *         schema: { type: string }
 *       - in: query
 *         name: season
 *         schema: { type: string, enum: [kharif, rabi, zaid] }
 *     responses:
 *       200: { description: Weather insurance product list }
 */
router.get('/weather-insurance', ecosystemController.getWeatherInsuranceProducts);

// ─── DigiLocker ────────────────────────────────────────────────────

/**
 * @swagger
 * /vyapar/digilocker/{farmerId}:
 *   get:
 *     tags: [Vyapar-Ecosystem]
 *     summary: Get DigiLocker document status for a farmer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: farmerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: DigiLocker connection and document status }
 */
router.get('/digilocker/:farmerId', ecosystemController.getDigiLockerDocuments);

// ─── e-RUPI Vouchers ──────────────────────────────────────────────

/**
 * @swagger
 * /vyapar/erupi/{farmerId}:
 *   get:
 *     tags: [Vyapar-Ecosystem]
 *     summary: Get e-RUPI voucher status for a farmer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: farmerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: e-RUPI voucher list with redemption status }
 */
router.get('/erupi/:farmerId', ecosystemController.getErupiVoucherStatus);

// ─── CRIF HighMark Score ───────────────────────────────────────────

/**
 * @swagger
 * /vyapar/crif-score/{farmerId}:
 *   get:
 *     tags: [Vyapar-Ecosystem]
 *     summary: Get CRIF HighMark credit score for a farmer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: farmerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Credit score with factors and loan history }
 */
router.get('/crif-score/:farmerId', ecosystemController.getCrifHighMarkScore);

// ─── Commodity Hedging Advisory ────────────────────────────────────

/**
 * @swagger
 * /vyapar/commodity-hedging/{commodityId}:
 *   get:
 *     tags: [Vyapar-Ecosystem]
 *     summary: Get commodity hedging advisory with spot/futures analysis
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: commodityId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Hedging recommendation with contract details }
 */
router.get('/commodity-hedging/:commodityId', ecosystemController.getCommodityHedgingAdvisory);

module.exports = router;
