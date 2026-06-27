/**
 * Vendor Service — Registration, profile, KYC, catalog, inventory management.
 */
const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');
const { generateUUID } = require('../../../shared/utils/uuidHelper');
const { parsePagination, buildMeta } = require('../../../shared/utils/paginationHelper');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

const registerVendor = async (userId, data) => {
  const { VendorProfile, VendorShop, VendorKyc, VendorServiceArea } = getDb();

  const existing = await VendorProfile.findOne({ where: { vendor_user_id: userId } });
  if (existing) { const err = new Error('Vendor profile already exists'); err.statusCode = 409; throw err; }

  const vendorCode = `VND${Date.now().toString(36).toUpperCase()}`;
  const vendor = await VendorProfile.create({
    vendor_user_id: userId, vendor_uuid: generateUUID(),
    vendor_name: data.vendorName, vendor_code: vendorCode,
    vendor_type: data.vendorType, business_pan: data.businessPan || null,
    shop_name: data.shopName,
  });

  // Create default shop
  await VendorShop.create({
    vendor_id: vendor.id, shop_uuid: generateUUID(),
    shop_name: data.shopName, lgd_state_id: data.stateId,
    lgd_district_id: data.districtId, lgd_block_id: data.blockId || null,
  });

  // Create KYC record (pending)
  await VendorKyc.create({ vendor_id: vendor.id });

  // Create service area
  await VendorServiceArea.create({
    vendor_id: vendor.id, lgd_state_id: data.stateId,
    lgd_district_id: data.districtId, lgd_block_id: data.blockId || null,
    is_primary_service_area: true,
  });

  logger.info(`Vendor registered: ${vendor.vendor_uuid}`);
  return { vendorId: vendor.id, vendorUuid: vendor.vendor_uuid, status: 'pending_kyc' };
};

const getProfile = async (vendorId) => {
  const { VendorProfile, VendorKyc, VendorShop, VendorServiceArea } = getDb();
  const profile = await VendorProfile.findByPk(vendorId, {
    include: [
      { model: VendorKyc, as: 'kyc' },
      { model: VendorShop, as: 'shops', where: { is_active: true }, required: false },
      { model: VendorServiceArea, as: 'serviceAreas', where: { is_active: true }, required: false },
    ],
  });
  if (!profile) { const err = new Error('Vendor not found'); err.statusCode = 404; throw err; }
  return { profile, kycStatus: profile.kyc?.kyc_status || 'pending', shops: profile.shops, serviceAreas: profile.serviceAreas };
};

const updateProfile = async (vendorId, data) => {
  const {
    VendorProfile,
    VendorShop,
    VendorServiceArea
  } = getDb();

  const profile = await VendorProfile.findByPk(vendorId);

  if (!profile) {
    const err = new Error("Vendor not found");
    err.statusCode = 404;
    throw err;
  }

  await profile.update({
    vendor_name: data.vendorName ?? profile.vendor_name,
  });

  const shop = await VendorShop.findOne({
    where: {
      vendor_id: vendorId,
      is_active: true
    }
  });

  if (shop) {
    await shop.update({
      shop_address: data.shopAddress ?? shop.shop_address,
      lgd_state_id: data.stateId ?? shop.lgd_state_id,
      lgd_district_id: data.districtId ?? shop.lgd_district_id,
      lgd_block_id: data.blockId ?? shop.lgd_block_id,
    });
  }

  const serviceArea = await VendorServiceArea.findOne({
    where: {
      vendor_id: vendorId,
      is_active: true
    }
  });

  if (serviceArea) {
    await serviceArea.update({
      lgd_state_id: data.stateId ?? serviceArea.lgd_state_id,
      lgd_district_id: data.districtId ?? serviceArea.lgd_district_id,
      lgd_block_id: data.blockId ?? serviceArea.lgd_block_id,
    });
  }

  return {
    vendorId,
    updated: true
  };
};

const getCatalog = async (vendorId, filters = {}, query = {}) => {
  const { VendorProductCatalog } = getDb();
  const { page, limit, offset } = parsePagination(query);
  const where = { vendor_id: vendorId, is_active: true };

  const { count, rows } = await VendorProductCatalog.findAndCountAll({ where, limit, offset });
  return { catalog: rows, meta: buildMeta(page, limit, count) };
};

const addCatalogItem = async (vendorId, data) => {
  const { VendorProductCatalog } = getDb();
  const item = await VendorProductCatalog.create({
    vendor_id: vendorId, input_item_id: data.itemId, input_pack_id: data.packId,
    mrp_rupees: data.mrp, vendor_selling_price: data.sellingPrice,
    stock_quantity: data.stock, last_stock_update_date: new Date(),
  });
  return { catalogId: item.id };
};

const updateCatalogItem = async (vendorId, catalogId, data) => {
  const { VendorProductCatalog } = getDb();
  const item = await VendorProductCatalog.findOne({ where: { id: catalogId, vendor_id: vendorId, is_active: true } });
  if (!item) { const err = new Error('Catalog item not found'); err.statusCode = 404; throw err; }

  const updates = {};
  if (data.mrp !== undefined) updates.mrp_rupees = data.mrp;
  if (data.sellingPrice !== undefined) updates.vendor_selling_price = data.sellingPrice;
  if (data.stock !== undefined) { updates.stock_quantity = data.stock; updates.last_stock_update_date = new Date(); }
  await item.update(updates);
  return { catalogId: item.id };
};

const getInventory = async (vendorId) => {
  const { VendorInventory } = getDb();
  return VendorInventory.findAll({ where: { vendor_id: vendorId, is_active: true } });
};

const getPerformance = async (vendorId, month, year) => {
  const { VendorPerformance } = getDb();
  const where = { vendor_id: vendorId, is_active: true };
  if (month) where.performance_month = month;
  if (year) where.performance_year = year;
  return VendorPerformance.findAll({ where, order: [['performance_year', 'DESC'], ['performance_month', 'DESC']] });
};

const getRatings = async (vendorId) => {
  const { VendorRating, User } = getDb();
  const ratings = await VendorRating.findAll({
    where: { vendor_id: vendorId, is_active: true },
    include: [{ model: User, as: 'farmer', attributes: ['first_name', 'last_name'] }],
    order: [['rated_on', 'DESC']],
  });
  const avg = ratings.length ? Math.round(ratings.reduce((s, r) => s + r.rating_score, 0) / ratings.length * 10) / 10 : 0;
  return { ratings, averageRating: avg, totalRatings: ratings.length };
};

const getCreditLedger = async (vendorId, query = {}) => {
  const { VendorCreditLedger, User } = getDb();
  const { page, limit, offset } = parsePagination(query);

  const { count, rows } =
    await VendorCreditLedger.findAndCountAll({
      where: {
        vendor_id: vendorId,
        is_active: true,
      },
      include: [
        {
          model: User,
          as: 'farmer',
          attributes: [
            'id',
            'user_id',
            'mobile',
            'first_name',
            'last_name',
          ],
        },
      ],
      order: [['updated_at', 'DESC']],
      limit,
      offset,
    });

  return {
    ledgers: rows,
    meta: buildMeta(page, limit, count),
  };
};

const getFarmerCreditDetail = async (
  vendorId,
  farmerId
) => {
  const { VendorCreditLedger, User } = getDb();

  const ledger =
    await VendorCreditLedger.findOne({
      where: {
        vendor_id: vendorId,
        farmer_id: farmerId,
        is_active: true,
      },
      include: [
        {
          model: User,
          as: 'farmer',
          attributes: [
            'id',
            'user_id',
            'mobile',
            'first_name',
            'last_name',
          ],
        },
      ],
    });

  if (!ledger) {
    const err = new Error(
      'Credit ledger not found'
    );
    err.statusCode = 404;
    throw err;
  }

  return ledger;
};

const recordCreditPayment = async (
  vendorId,
  farmerId,
  data
) => {
  const { VendorCreditLedger } = getDb();

  const ledger =
    await VendorCreditLedger.findOne({
      where: {
        vendor_id: vendorId,
        farmer_id: farmerId,
        is_active: true,
      },
    });

  if (!ledger) {
    const err = new Error(
      'Credit ledger not found'
    );
    err.statusCode = 404;
    throw err;
  }

  const paymentAmount = Number(data.paymentAmount);

  if (!paymentAmount || paymentAmount <= 0) {
    const err = new Error('Invalid payment amount');
    err.statusCode = 400;
    throw err;
  }

  const outstanding = Number(ledger.current_balance || 0);

  if (paymentAmount > outstanding) {
    const err = new Error(
      `Payment exceeds outstanding balance ₹${outstanding}`
    );
    err.statusCode = 400;
    throw err;
  }

  await ledger.update({
    current_balance:
      Number(ledger.current_balance) - paymentAmount,

    total_payments_received:
      Number( ledger.total_payments_received || 0) + paymentAmount,

    last_payment_amount: paymentAmount,
    last_payment_date: new Date(),
  });

  return {
    farmerId,
    paymentAmount,
    currentBalance:
      ledger.current_balance,
  };
};

module.exports = { 
  registerVendor, 
  getProfile, 
  updateProfile,
  getCatalog, 
  addCatalogItem, 
  updateCatalogItem, 
  getInventory, 
  getPerformance, 
  getRatings,
  getCreditLedger,
  getFarmerCreditDetail,
  recordCreditPayment, 
};
