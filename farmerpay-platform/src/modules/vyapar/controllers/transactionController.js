/**
 * Transaction Controller
 * Handles transactions, credit payments, loan utilization.
 */

const transactionService = require('../services/transactionService');
const { success } = require('../../../shared/utils/responseHelper');
const { User, VendorProfile } = require('../../../shared/models');

const resolveUserId = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) { const err = new Error('User not found'); err.statusCode = 404; err.errorCode = 'RES_001'; throw err; }
  return user.id;
};

const resolveVendorId = async (userId) => {
  const vendor = await VendorProfile.findOne({ where: { vendor_user_id: userId, is_active: true } });
  if (!vendor) { const err = new Error('Vendor profile not found'); err.statusCode = 404; err.errorCode = 'RES_001'; throw err; }
  return vendor.id;
};

/** POST /vyapar/transactions */
const createTransaction = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const vendorId = await resolveVendorId(userId);
    const result = await transactionService.createTransaction(vendorId, req.body);
    return success(res, { message: 'Transaction created', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

/** GET /vyapar/transactions */
const getTransactions = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const vendorId = await resolveVendorId(userId);
    const result = await transactionService.getTransactions(vendorId, req.query, req.query);
    return success(res, { message: 'Transactions retrieved', data: result.transactions, meta: result.meta });
  } catch (err) { next(err); }
};

/** GET /vyapar/loans */
const getLinkedLoans = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const vendorId = await resolveVendorId(userId);
    const result = await transactionService.getLinkedLoans(vendorId);
    return success(res, { message: 'Linked loans retrieved', data: result });
  } catch (err) { next(err); }
};

/** POST /vyapar/loans/:loanId/utilization */
const addLoanUtilization = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const vendorId = await resolveVendorId(userId);
    const result = await transactionService.addLoanUtilization(vendorId, parseInt(req.params.loanId, 10), req.body);
    return success(res, { message: 'Loan utilization recorded', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

module.exports = { createTransaction, getTransactions, getLinkedLoans, addLoanUtilization };
