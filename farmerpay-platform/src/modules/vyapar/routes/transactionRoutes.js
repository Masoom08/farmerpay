/**
 * Transaction Routes
 * Cash/credit sales, transaction history, loan linkage.
 *
 * @swagger
 * tags:
 *   name: Vyapar Transactions
 *   description: Vendor transaction and credit management
 */

const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const validate = require('../../../middleware/validate');
const { authenticate } = require('../../../middleware/auth');
const roleCheck = require('../../../middleware/roleCheck');
const { createTransactionSchema, loanUtilizationSchema } = require('../validators/vyaparValidator');

router.use(authenticate);
router.use(roleCheck('FARMER', 'VENDOR', 'AGENT', 'ADMIN'));

/**
 * @swagger
 * /vyapar/transactions:
 *   post:
 *     tags: [Vyapar Transactions]
 *     summary: Create a new transaction (cash/credit sale)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Transaction created with line items }
 *   get:
 *     tags: [Vyapar Transactions]
 *     summary: List vendor transactions
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Paginated transactions }
 */
router.post('/transactions', validate(createTransactionSchema), transactionController.createTransaction);
router.get('/transactions', transactionController.getTransactions);

/**
 * @swagger
 * /vyapar/loans:
 *   get:
 *     tags: [Vyapar Transactions]
 *     summary: Get linked loan mappings with utilizations
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Loan mappings }
 */
router.get('/loans', transactionController.getLinkedLoans);

/**
 * @swagger
 * /vyapar/loans/{loanId}/utilization:
 *   post:
 *     tags: [Vyapar Transactions]
 *     summary: Record loan fund utilization
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Utilization recorded }
 */
router.post('/loans/:loanId/utilization', validate(loanUtilizationSchema), transactionController.addLoanUtilization);

module.exports = router;
