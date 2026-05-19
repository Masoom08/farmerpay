/**
 * DRISHTI Routes
 * All endpoints for the Digital Twin / Scenario Simulation Engine.
 * All routes require authentication. Role-based access applied per group.
 *
 * @swagger
 * tags:
 *   name: Drishti
 *   description: Farmer Digital Twin — scenario simulation and financial decision-support
 */

const express = require('express');
const router = express.Router();

const controller = require('../controllers/drishtiController');
const validate = require('../../../middleware/validate');
const { authenticate } = require('../../../middleware/auth');
const roleCheck = require('../../../middleware/roleCheck');

// Validators — Engines
const { runPreLoanSchema } = require('../validators/preLoanValidator');
const { runHouseholdPortfolioSchema } = require('../validators/householdPortfolioValidator');
const { runClimateStressSchema } = require('../validators/climateStressValidator');
const { runInsuranceSchema } = require('../validators/insuranceValidator');
const { runMarketTimingSchema } = require('../validators/marketTimingValidator');
const { runBankerPortfolioSchema } = require('../validators/bankerPortfolioValidator');

// Validators — Queries & CRUD
const { getScenarioRunsSchema, compareSchema, getTemplatesSchema } = require('../validators/scenarioValidator');
const { createIncomeSourceSchema, createExpenseSchema, getHouseholdQuerySchema } = require('../validators/snapshotValidator');

// All routes require authentication
router.use(authenticate);

// ─── Templates (all authenticated roles) ────────────────────────────

/**
 * @swagger
 * /drishti/templates:
 *   get:
 *     summary: Get available scenario templates
 *     tags: [Drishti]
 */
router.get('/templates', validate(getTemplatesSchema, 'query'), controller.getTemplates);

/**
 * @swagger
 * /drishti/templates/{engineType}:
 *   get:
 *     summary: Get templates for a specific engine type
 *     tags: [Drishti]
 */
router.get('/templates/:engineType', controller.getTemplatesByEngine);

// ─── Benchmarks (all authenticated roles) ───────────────────────────

/**
 * @swagger
 * /drishti/benchmarks/{districtId}:
 *   get:
 *     summary: Get district-level benchmarks
 *     tags: [Drishti]
 */
router.get('/benchmarks/:districtId', controller.getBenchmarks);

// ─── Scenario Engines (farmer, sathi, banker) ───────────────────────

/**
 * @swagger
 * /drishti/scenarios/pre-loan:
 *   post:
 *     summary: Run Pre-Loan Scenario Modeling
 *     tags: [Drishti]
 */
router.post(
  '/scenarios/pre-loan',
  roleCheck('FARMER', 'AGENT', 'BANK_OFFICER', 'ADMIN'),
  validate(runPreLoanSchema),
  controller.runPreLoan
);

/**
 * @swagger
 * /drishti/scenarios/household-portfolio:
 *   post:
 *     summary: Run Household & Activity Portfolio Optimizer
 *     tags: [Drishti]
 */
router.post(
  '/scenarios/household-portfolio',
  roleCheck('FARMER', 'AGENT', 'ADMIN'),
  validate(runHouseholdPortfolioSchema),
  controller.runHouseholdPortfolio
);

/**
 * @swagger
 * /drishti/scenarios/climate-stress:
 *   post:
 *     summary: Run Climate Stress Testing
 *     tags: [Drishti]
 */
router.post(
  '/scenarios/climate-stress',
  roleCheck('FARMER', 'AGENT', 'BANK_OFFICER', 'ADMIN'),
  validate(runClimateStressSchema),
  controller.runClimateStress
);

/**
 * @swagger
 * /drishti/scenarios/insurance:
 *   post:
 *     summary: Run Insurance Decision Engine
 *     tags: [Drishti]
 */
router.post(
  '/scenarios/insurance',
  roleCheck('FARMER', 'AGENT', 'ADMIN'),
  validate(runInsuranceSchema),
  controller.runInsurance
);

/**
 * @swagger
 * /drishti/scenarios/market-timing:
 *   post:
 *     summary: Run Post-Harvest Market Timing simulation
 *     tags: [Drishti]
 */
router.post(
  '/scenarios/market-timing',
  roleCheck('FARMER', 'AGENT', 'ADMIN'),
  validate(runMarketTimingSchema),
  controller.runMarketTiming
);

/**
 * @swagger
 * /drishti/scenarios/banker-portfolio:
 *   post:
 *     summary: Run Banker Portfolio Simulation (async via queue)
 *     tags: [Drishti]
 */
router.post(
  '/scenarios/banker-portfolio',
  roleCheck('BANK_OFFICER', 'ADMIN'),
  validate(runBankerPortfolioSchema),
  controller.runBankerPortfolio
);

// ─── Scenario Queries (farmer, sathi, banker) ───────────────────────

/**
 * @swagger
 * /drishti/scenarios/compare:
 *   post:
 *     summary: Compare 2-3 scenario runs side by side
 *     tags: [Drishti]
 */
router.post(
  '/scenarios/compare',
  roleCheck('FARMER', 'AGENT', 'BANK_OFFICER', 'ADMIN'),
  validate(compareSchema),
  controller.compareScenarios
);

/**
 * @swagger
 * /drishti/scenarios/comparison/{compUuid}:
 *   get:
 *     summary: Get a stored scenario comparison
 *     tags: [Drishti]
 */
router.get(
  '/scenarios/comparison/:compUuid',
  roleCheck('FARMER', 'AGENT', 'BANK_OFFICER', 'ADMIN'),
  controller.getComparison
);

/**
 * @swagger
 * /drishti/scenarios/farmer/{farmerId}:
 *   get:
 *     summary: List scenario runs for a farmer
 *     tags: [Drishti]
 */
router.get(
  '/scenarios/farmer/:farmerId',
  roleCheck('FARMER', 'AGENT', 'BANK_OFFICER', 'ADMIN'),
  validate(getScenarioRunsSchema, 'query'),
  controller.getScenariosByFarmer
);

/**
 * @swagger
 * /drishti/scenarios/{runUuid}/share:
 *   get:
 *     summary: Generate a shareable summary for WhatsApp/SMS
 *     tags: [Drishti]
 *     parameters:
 *       - name: language
 *         in: query
 *         schema: { type: string, default: 'en' }
 *       - name: send_sms
 *         in: query
 *         schema: { type: string, enum: ['true', 'false'], default: 'false' }
 *       - name: phone
 *         in: query
 *         schema: { type: string }
 */
router.get(
  '/scenarios/:runUuid/share',
  roleCheck('FARMER', 'AGENT', 'BANK_OFFICER', 'ADMIN'),
  controller.getShareableSummary
);

/**
 * @swagger
 * /drishti/scenarios/{runUuid}:
 *   get:
 *     summary: Get a specific scenario run result
 *     tags: [Drishti]
 */
router.get(
  '/scenarios/:runUuid',
  roleCheck('FARMER', 'AGENT', 'BANK_OFFICER', 'ADMIN'),
  controller.getScenarioByUuid
);

// ─── Household Income/Expense CRUD (farmer, sathi, banker) ──────────

/**
 * @swagger
 * /drishti/household/{farmerId}/income:
 *   get:
 *     summary: Get household income sources for a farmer
 *     tags: [Drishti]
 */
router.get(
  '/household/:farmerId/income',
  roleCheck('FARMER', 'AGENT', 'BANK_OFFICER', 'ADMIN'),
  validate(getHouseholdQuerySchema, 'query'),
  controller.getHouseholdIncome
);

/**
 * @swagger
 * /drishti/household/{farmerId}/income:
 *   post:
 *     summary: Add or update a household income source
 *     tags: [Drishti]
 */
router.post(
  '/household/:farmerId/income',
  roleCheck('FARMER', 'AGENT', 'ADMIN'),
  validate(createIncomeSourceSchema),
  controller.upsertHouseholdIncome
);

/**
 * @swagger
 * /drishti/household/{farmerId}/expenses:
 *   get:
 *     summary: Get household expenses for a farmer
 *     tags: [Drishti]
 */
router.get(
  '/household/:farmerId/expenses',
  roleCheck('FARMER', 'AGENT', 'BANK_OFFICER', 'ADMIN'),
  validate(getHouseholdQuerySchema, 'query'),
  controller.getHouseholdExpenses
);

/**
 * @swagger
 * /drishti/household/{farmerId}/expenses:
 *   post:
 *     summary: Add or update a household expense
 *     tags: [Drishti]
 */
router.post(
  '/household/:farmerId/expenses',
  roleCheck('FARMER', 'AGENT', 'ADMIN'),
  validate(createExpenseSchema),
  controller.upsertHouseholdExpense
);

/**
 * @swagger
 * /drishti/household/{farmerId}/summary:
 *   get:
 *     summary: Get complete household financial profile
 *     tags: [Drishti]
 */
router.get(
  '/household/:farmerId/summary',
  roleCheck('FARMER', 'AGENT', 'BANK_OFFICER', 'ADMIN'),
  controller.getHouseholdSummary
);

// ─── Portfolio Runs (banker only) ───────────────────────────────────

/**
 * @swagger
 * /drishti/portfolio-runs/{runUuid}:
 *   get:
 *     summary: Get portfolio batch simulation status and results
 *     tags: [Drishti]
 */
router.get(
  '/portfolio-runs/:runUuid',
  roleCheck('BANK_OFFICER', 'ADMIN'),
  controller.getPortfolioRun
);

/**
 * @swagger
 * /drishti/portfolio-runs/{runUuid}/farmers:
 *   get:
 *     summary: Get individual farmer results from a portfolio simulation
 *     tags: [Drishti]
 */
router.get(
  '/portfolio-runs/:runUuid/farmers',
  roleCheck('BANK_OFFICER', 'ADMIN'),
  controller.getPortfolioRunFarmers
);

module.exports = router;
