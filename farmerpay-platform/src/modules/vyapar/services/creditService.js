/**
 * Credit Service — Credit ledger management, payments, and summaries.
 */

const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

/**
 * Gets credit ledger entries for a vendor with farmer details.
 */
const getCreditLedger = async (vendorId) => {
  const { VendorCreditLedger, User } = getDb();

  const ledgers = await VendorCreditLedger.findAll({
    where: { vendor_id: vendorId, is_active: true },
    include: [{ model: User, as: 'farmer', attributes: ['id', 'first_name', 'last_name', 'mobile'] }],
    order: [['current_balance', 'DESC']],
  });

  const totalBalance = ledgers.reduce((s, l) => s + parseFloat(l.current_balance || 0), 0);

  return {
    ledger: ledgers.map((l) => ({
      farmerId: l.farmer_id,
      farmerName: l.farmer ? `${l.farmer.first_name || ''} ${l.farmer.last_name || ''}`.trim() : null,
      balance: l.current_balance,
      creditLimit: l.credit_limit,
      daysOverdue: l.days_past_due,
      lastPaymentDate: l.last_payment_date,
      nextDueDate: l.next_payment_due_date,
    })),
    total: ledgers.length,
    totalBalance: totalBalance.toFixed(2),
  };
};

/**
 * Gets credit ledger detail for a specific farmer with recent transactions.
 */
const getFarmerCreditDetail = async (vendorId, farmerId) => {
  const { VendorCreditLedger, VendorTransaction } = getDb();

  const ledger = await VendorCreditLedger.findOne({
    where: { vendor_id: vendorId, farmer_id: farmerId, is_active: true },
  });
  if (!ledger) {
    const err = new Error('Credit ledger not found for this farmer');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const recentTransactions = await VendorTransaction.findAll({
    where: { vendor_id: vendorId, farmer_id: farmerId, is_active: true },
    order: [['transaction_date', 'DESC']],
    limit: 10,
  });

  return {
    ledger: {
      currentBalance: ledger.current_balance,
      creditLimit: ledger.credit_limit,
      totalCreditGiven: ledger.total_credit_given,
      totalPaymentsReceived: ledger.total_payments_received,
      daysOverdue: ledger.days_past_due,
      lastPaymentDate: ledger.last_payment_date,
    },
    recentTransactions: recentTransactions.map((t) => ({
      transactionId: t.id,
      type: t.transaction_type,
      amount: t.transaction_amount,
      date: t.transaction_date,
      status: t.payment_status,
    })),
  };
};

/**
 * Records a credit payment from a farmer.
 */
const recordPayment = async (vendorId, farmerId, data) => {
  const { VendorCreditLedger } = getDb();

  const ledger = await VendorCreditLedger.findOne({
    where: { vendor_id: vendorId, farmer_id: farmerId, is_active: true },
  });
  if (!ledger) {
    const err = new Error('Credit ledger not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const newBalance = Math.max(0, parseFloat(ledger.current_balance) - data.paymentAmount);
  const totalReceived = parseFloat(ledger.total_payments_received || 0) + data.paymentAmount;

  await ledger.update({
    current_balance: newBalance,
    total_payments_received: totalReceived,
    last_payment_date: data.paymentDate,
    last_payment_amount: data.paymentAmount,
    days_past_due: newBalance === 0 ? 0 : ledger.days_past_due,
  });

  const remainingCredit = ledger.credit_limit
    ? parseFloat(ledger.credit_limit) - newBalance
    : null;

  logger.info(`Credit payment ${data.paymentAmount} received from farmer ${farmerId} to vendor ${vendorId}`);
  return { ledger, newBalance: newBalance.toFixed(2), remainingCredit };
};

module.exports = { getCreditLedger, getFarmerCreditDetail, recordPayment };
