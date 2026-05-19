/**
 * Portfolio Routes
 * Portfolio overview for bank users.
 *
 * @swagger
 * tags:
 *   name: Sentinel Portfolio
 *   description: Bank portfolio monitoring and health metrics
 */

const express = require('express');
const router = express.Router();

const portfolioController = require('../controllers/portfolioController');
const validate = require('../../../middleware/validate');
const { authenticate } = require('../../../middleware/auth');
const roleCheck = require('../../../middleware/roleCheck');
const { getPortfolioSchema } = require('../validators/sentinelValidator');

router.use(authenticate);
router.use(roleCheck('BANK_OFFICER', 'ADMIN'));

/**
 * @swagger
 * /sentinel/portfolio:
 *   get:
 *     tags: [Sentinel Portfolio]
 *     summary: Get portfolio overview with aggregate health metrics
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: bankUserId
 *         schema: { type: integer }
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200: { description: Portfolio with NPA%, SMA%, health score }
 */
router.get('/portfolio', validate(getPortfolioSchema, 'query'), portfolioController.getPortfolio);

module.exports = router;
