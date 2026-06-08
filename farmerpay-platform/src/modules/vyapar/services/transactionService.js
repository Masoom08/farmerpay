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
  const { VendorTransaction, VendorTransactionItem, VendorCreditLedger, VendorFarmerLink, sequelize: seq } = getDb();
  const transaction = await seq.transaction();

  try {
    // Calculate totals from catalog prices
    let totalAmount = 0;
    const lineItems = [];

    for (const item of data.items) {
      // const catalog = await VendorProductCatalog.findOne({
      //   where: { vendor_id: vendorId, input_item_id: item.itemId, input_pack_id: item.packId, is_active: true },
      // });

      //const unitPrice = catalog ? parseFloat(catalog.vendor_selling_price) : 0;
      //const lineTotal = quantity * unitPrice;
      const unitPrice = Number(item.unitPrice);

      totalAmount += unitPrice;
      lineItems.push({ 
        category: item.category,
        // input_item_id: item.itemId, 
        // input_pack_id: item.packId, 
        quantity: null,
        unit_price: unitPrice, 
        line_total: unitPrice 
      });

      // Update stock
      // if (catalog) {
      //   const newStock = Math.max(0, catalog.stock_quantity - item.quantity);
      //   await catalog.update({ stock_quantity: newStock, availability_status: newStock === 0 ? 'out_of_stock' : newStock < 10 ? 'low_stock' : 'in_stock' }, { transaction });
      // }
    }

    const txn = await VendorTransaction.create({
      transaction_uuid: generateUUID(), vendor_id: vendorId, farmer_id: data.farmerId,
      transaction_type: data.transactionType, transaction_date: new Date(),
      transaction_amount: totalAmount,
      transaction_status: data.transactionType === 'cash_sale' ? 'completed' : 'pending',
      payment_status: data.transactionType === 'cash_sale' ? 'paid' : 'credit_given',
      loan_application_id: data.loanApplicationId || null,
    }, { transaction });

    // Create line items
    await VendorTransactionItem.bulkCreate(
      lineItems.map((li) => ({ transaction_id: txn.id, ...li })),
      { transaction }
    );

    // Update credit ledger for credit sales
    if (data.transactionType === 'credit_sale') {

    const ledger =
      await VendorCreditLedger.findOne({
        where: {
          vendor_id: vendorId,
          farmer_id: data.farmerId,
        },
        transaction,
      });

    if (!ledger) {
      throw new Error( 'Credit limit not configured for farmer' );
    }

    const creditLimit = Number(ledger.credit_limit);
    const outstanding = Number(ledger.current_balance);
    const availableCredit = creditLimit - outstanding;

    if (totalAmount > availableCredit) {
      throw new Error( `Credit limit exceeded. Available: ₹${availableCredit}` );
    }

    ledger.current_balance = outstanding + totalAmount;
    ledger.total_credit_given = Number(ledger.total_credit_given || 0) + totalAmount;
    await ledger.save({ transaction });
  }

    // Update farmer link
    await VendorFarmerLink.upsert({
      vendor_id: vendorId, farmer_id: data.farmerId,
      link_type: data.transactionType === 'credit_sale' ? 'credit_customer' : 'regular_customer',
      last_transaction_date: new Date(),
      transaction_count: seq.literal('COALESCE(transaction_count, 0) + 1'),
      total_value: seq.literal(`COALESCE(total_value, 0) + ${totalAmount}`),
    }, { transaction });

    await transaction.commit();

    // Publish event for VYAPAR-ROOTS bridge (non-blocking)
    try {
      const { getChannel } = require('../../../config/rabbitmq');
      const config = require('../../../config');
      const channel = await getChannel();
      if (channel) {
        channel.publish(
          config.rabbitmq.exchange,
          'vyapar.transaction.created',
          Buffer.from(JSON.stringify({ transactionId: txn.id, vendorId, farmerId: data.farmerId, amount: totalAmount })),
          { persistent: true }
        );
      }
    } catch (pubErr) {
      logger.warn('Failed to publish vyapar.transaction.created event', { error: pubErr.message });
    }

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
