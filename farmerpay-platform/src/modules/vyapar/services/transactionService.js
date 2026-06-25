/**
 * Transaction Service — Cash/credit sales, evidence, loan linkage.
 */
const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');
const { generateUUID } = require('../../../shared/utils/uuidHelper');
const { parsePagination, buildMeta } = require('../../../shared/utils/paginationHelper');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

const createTransaction = async (vendorId, data) => {
  console.log("FULL DATA:", data);
console.log("cashAmount raw:", data.cashAmount);
console.log("creditAmount raw:", data.creditAmount);
console.log("transactionType raw:", data.transactionType);
  const { VendorTransaction, VendorTransactionItem, VendorCreditLedger, VendorFarmerLink, sequelize: seq } = getDb();
  const transaction = await seq.transaction();

  try {
    let totalAmount = 0;
    const lineItems = [];

    for (const item of data.items) {
     
      const unitPrice = Number(item.unitPrice);

      totalAmount += unitPrice;
      lineItems.push({ 
        category: item.category,
        quantity: null,
        unit_price: unitPrice, 
        line_total: unitPrice 
      });
    }

    console.log("STEP 1 totalAmount:", totalAmount);

    let cashAmount = 0;
let creditAmount = 0;

if (data.transactionType === 'cash_sale') {
  cashAmount = totalAmount;
}
else if (data.transactionType === 'credit_sale') {
  creditAmount = totalAmount;
}
else if (data.transactionType === 'cash_credit_sale') {
  cashAmount = Number(data.cashAmount || 0);
  creditAmount = Number(data.creditAmount || 0);

  if (cashAmount <= 0 || creditAmount <= 0) {
    const err = new Error(
      "cashAmount and creditAmount are required for cash_credit_sale"
    );
    err.statusCode = 400;
    throw err;
  }

  if (Math.abs((cashAmount + creditAmount) - totalAmount) > 0.01) {
    const err = new Error(
      `Cash + Credit (${cashAmount + creditAmount}) must equal total (${totalAmount})`
    );
    err.statusCode = 400;
    throw err;
  }
}
else {
  const err = new Error("Invalid transactionType");
  err.statusCode = 400;
  throw err;
}

    console.log({
      totalAmount,
      cashAmount,
      creditAmount
    });

    if (cashAmount < 0 || creditAmount < 0) {
      const err = new Error("Invalid payment split");
      err.statusCode = 400;
      throw err;
    }

    if (Math.abs((cashAmount + creditAmount) - totalAmount) > 0.01) {
      const err = new Error(
        `Cash + Credit (${cashAmount + creditAmount}) must equal total (${totalAmount})`
      );
      err.statusCode = 400;
      throw err;
    }
    let transactionStatus = 'completed';
    let paymentStatus = 'paid';

    if (data.transactionType === 'credit_sale') {
      transactionStatus = 'pending';
      paymentStatus = 'credit_given';
    }

    if (data.transactionType === 'cash_credit_sale') {
      transactionStatus = 'pending';
      paymentStatus = 'partial_paid';
    }

    const txn = await VendorTransaction.create({
      transaction_uuid: generateUUID(), 
      vendor_id: vendorId, 
      farmer_id: data.farmerId,
      transaction_type: data.transactionType, 
      transaction_date: new Date(),
      transaction_amount: totalAmount,

      cash_amount: cashAmount,
      credit_amount: creditAmount,

      transaction_status: transactionStatus,
      payment_status: paymentStatus,

      loan_application_id: data.loanApplicationId || null,
    }, { transaction });

    console.log("STEP 2 txn created:", txn.id);

    // Create line items
    await VendorTransactionItem.bulkCreate(
      lineItems.map((li) => ({ transaction_id: txn.id, ...li })),
      { transaction }
    );

    // Update credit ledger for credit sales
    if (creditAmount > 0) {

    const ledger =
      await VendorCreditLedger.findOne({
        where: {
          vendor_id: vendorId,
          farmer_id: data.farmerId,
        },
        transaction,
      });

      if (!ledger) {
        const err = new Error('Credit limit not configured for farmer');
        err.statusCode = 400; // or 400
        throw err;
      }

      console.log("STEP 3 entered credit block");
      console.log("LEDGER:", ledger?.toJSON());

      const creditLimit = Number(ledger.credit_limit);
      const outstanding = Number(ledger.current_balance);
      const availableCredit = creditLimit - outstanding;

      console.log({
        creditLimit,
        outstanding,
        availableCredit,
        creditAmount,
      });
      if (creditAmount > availableCredit) {
        const err = new Error(
          `Credit limit exceeded. Available: ₹${availableCredit}`
        );
        err.statusCode = 400;
        throw err;
      }

      ledger.current_balance = Number(ledger.current_balance || 0) + creditAmount;
      ledger.total_credit_given = Number(ledger.total_credit_given || 0) + creditAmount;
      await ledger.save({ transaction });
    }

    console.log("STEP 4 before farmer link upsert");
    console.time("farmerLinkUpsert");
    // Update farmer link
    await VendorFarmerLink.upsert({
      vendor_id: vendorId, farmer_id: data.farmerId,
      link_type: creditAmount > 0 ? 'credit_customer' : 'regular_customer',
      last_transaction_date: new Date(),
      transaction_count: seq.literal('COALESCE(transaction_count, 0) + 1'),
      total_value: seq.literal(`COALESCE(total_value, 0) + ${totalAmount}`),
    }, { transaction });
    console.timeEnd("farmerLinkUpsert");

    console.log("STEP 5 after farmer link upsert");

    await transaction.commit();

    logger.info(`Transaction created: ${txn.transaction_uuid}, vendor: ${vendorId}, amount: ${totalAmount}`);
    return { transactionId: txn.id, transactionUuid: txn.transaction_uuid, amount: totalAmount };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

const getTransactions = async (vendorId, filters = {}, query = {}) => {
  const { VendorTransaction, User } = getDb();
  const { page, limit, offset } = parsePagination(query);

  const where = { vendor_id: vendorId, is_active: true };
  if (filters.startDate) where.transaction_date = { [Op.gte]: filters.startDate };
  if (filters.endDate) where.transaction_date = { ...where.transaction_date, [Op.lte]: filters.endDate };

  const count = await VendorTransaction.count({
    where
  });

  const rows = await VendorTransaction.findAll({
    where,
    limit,
    offset,
    order: [['transaction_date', 'DESC']],

    include: [
      {
        model: User,
        as: 'farmer',
        attributes: [
          'id',
          'first_name',
          'last_name',
          'mobile',
        ],
      },
    ],
  });

  return {
    transactions: rows.map((t) => ({
      transactionId: t.id, transactionUuid: t.transaction_uuid,
      farmerId: t.farmer_id, farmerName: [t.farmer?.first_name, t.farmer?.last_name].filter(Boolean).join(' '),
      amount: t.transaction_amount, type: t.transaction_type,
      status: t.transaction_status, paymentStatus: t.payment_status, date: t.transaction_date,
    })),
    meta: buildMeta(page, limit, count),
  };
};

const getLinkedLoans = async (vendorId) => {
  const { VendorLoanMapping, VendorLoanUtilization } = getDb();
  return VendorLoanMapping.findAll({
    where: { vendor_id: vendorId, is_active: true },
    include: [{ model: VendorLoanUtilization, as: 'utilizations', where: { is_active: true }, required: false }],
  });
};

const addLoanUtilization = async (vendorId, loanId, data) => {
  const { VendorLoanMapping, VendorLoanUtilization } = getDb();
  const mapping = await VendorLoanMapping.findOne({ where: { vendor_id: vendorId, loan_application_id: loanId, is_active: true } });
  if (!mapping) { const err = new Error('Loan mapping not found'); err.statusCode = 404; throw err; }

  const util = await VendorLoanUtilization.create({
    mapping_id: mapping.id, utilization_date: data.utilisationDate,
    utilized_amount: data.utilisationAmount, utilization_description: data.description || null,
  });

  return { utilisationId: util.id };
};

const uploadEvidence = async (
  vendorId,
  transactionId,
  data
) => {
  const {
    VendorTransaction,
    VendorTransactionEvidence,
  } = getDb();

  const txn =
    await VendorTransaction.findOne({
      where: {
        id: transactionId,
        vendor_id: vendorId,
        is_active: true,
      },
    });

  if (!txn) {
    const err = new Error(
      'Transaction not found'
    );
    err.statusCode = 404;
    throw err;
  }

  const evidence =
    await VendorTransactionEvidence.create({
      transaction_id: txn.id,
      document_id:
        data.documentId || null,
      evidence_type:
        data.evidenceType || 'receipt',
    });

  logger.info(
    `Evidence uploaded for transaction ${txn.id}`
  );

  return {
    evidenceId: evidence.id,
    transactionId: txn.id,
  };
};

const cancelTransaction = async (
  vendorId,
  transactionId
) => {
  const {
    VendorTransaction,
  } = getDb();

  const txn =
    await VendorTransaction.findOne({
      where: {
        id: transactionId,
        vendor_id: vendorId,
        is_active: true,
      },
    });

  if (!txn) {
    const err = new Error(
      'Transaction not found'
    );
    err.statusCode = 404;
    throw err;
  }

  if (
    txn.transaction_status ===
    'cancelled'
  ) {
    const err = new Error(
      'Transaction already cancelled'
    );
    err.statusCode = 400;
    throw err;
  }

  await txn.update({
    transaction_status: 'cancelled',
    payment_status: 'pending',
  });

  logger.info(
    `Transaction cancelled: ${txn.transaction_uuid}`
  );

  return {
    transactionId: txn.id,
    transactionUuid:
      txn.transaction_uuid,
    status: 'cancelled',
  };
};

module.exports = { 
  createTransaction, 
  getTransactions, 
  getLinkedLoans, 
  addLoanUtilization,
  uploadEvidence,
  cancelTransaction,
 };
