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
  const { VendorTransaction, VendorTransactionItem, VendorProductCatalog, VendorCreditLedger, VendorFarmerLink, sequelize: seq } = getDb();
  const transaction = await seq.transaction();

  try {
    // Calculate totals from catalog prices
    let totalAmount = 0;
    const lineItems = [];

    for (const item of data.items) {
      const catalog = await VendorProductCatalog.findOne({
        where: { vendor_id: vendorId, input_item_id: item.itemId, input_pack_id: item.packId, is_active: true },
      });

      const unitPrice = catalog ? parseFloat(catalog.vendor_selling_price) : 0;
      const lineTotal = unitPrice * item.quantity;
      totalAmount += lineTotal;
      lineItems.push({ input_item_id: item.itemId, input_pack_id: item.packId, quantity: item.quantity, unit_price: unitPrice, line_total: lineTotal });

      // Update stock
      if (catalog) {
        const newStock = Math.max(0, catalog.stock_quantity - item.quantity);
        await catalog.update({ stock_quantity: newStock, availability_status: newStock === 0 ? 'out_of_stock' : newStock < 10 ? 'low_stock' : 'in_stock' }, { transaction });
      }
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
      const [ledger] = await VendorCreditLedger.upsert({
        vendor_id: vendorId, farmer_id: data.farmerId,
        current_balance: seq.literal(`COALESCE(current_balance, 0) + ${totalAmount}`),
      }, { transaction });
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

  const { count, rows } = await VendorTransaction.findAndCountAll({
    where, limit, offset,
    include: [{ model: User, as: 'farmer', attributes: ['first_name', 'last_name', 'mobile'] }],
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

module.exports = { createTransaction, getTransactions, getLinkedLoans, addLoanUtilization };
