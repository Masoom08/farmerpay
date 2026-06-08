/**
 * Farmer-facing Vendor Service
 *
 * Powers the "Krishi Bazaar" experience in the farmer app:
 *   - My vendors (from vendor_farmer_links)
 *   - Vendor detail + catalog + credit balance
 *   - Farmer-initiated purchases (wraps transactionService)
 *   - Rate vendor
 *   - Sathi↔vendor bridge check
 *   - Recent purchases across all vendors
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

/**
 * List vendors the farmer has transacted with.
 */
const getMyVendors = async (farmerId) => {
  const {
    VendorFarmerLink, VendorProfile, VendorShop, VendorCreditLedger, VendorRating,
    Sequelize,
  } = getDb();

  const links = await VendorFarmerLink.findAll({
    where: { farmer_id: farmerId, is_active: true },
    order: [['last_transaction_date', 'DESC']],
  });

  if (!links.length) return [];

  const vendorIds = links.map((l) => l.vendor_id);
  const [profiles, credits, ratings] = await Promise.all([
    VendorProfile.findAll({
      where: { id: vendorIds, is_active: true },
      include: [{ model: VendorShop, as: 'shops', where: { is_active: true }, required: false, limit: 1 }],
    }),
    VendorCreditLedger.findAll({
      where: { vendor_id: vendorIds, farmer_id: farmerId, is_active: true },
    }),
    VendorRating.findAll({
      where: { vendor_id: vendorIds, farmer_id: farmerId, is_active: true },
    }),
  ]);

  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const creditMap = Object.fromEntries(credits.map((c) => [c.vendor_id, c]));
  const ratingMap = Object.fromEntries(ratings.map((r) => [r.vendor_id, r]));

  return links.map((link) => {
    const p = profileMap[link.vendor_id];
    if (!p) return null;
    const shop = p.shops?.[0];
    const credit = creditMap[link.vendor_id];
    const myRating = ratingMap[link.vendor_id];

    return {
      vendorId: p.id,
      vendorUuid: p.vendor_uuid,
      name: p.vendor_name,
      shopName: p.shop_name || shop?.shop_name,
      vendorType: p.vendor_type,
      shopAddress: shop?.shop_address || null,
      phone: shop?.shop_contact_phone || null,
      linkType: link.link_type,
      totalPurchases: Number(link.total_value || 0),
      transactionCount: link.transaction_count || 0,
      lastTransactionDate: link.last_transaction_date,
      creditBalance: Number(credit?.current_balance || 0),
      creditLimit: Number(credit?.credit_limit || 0),
      myRating: myRating?.rating_score || null,
      vendorRating: Number(p.rating || 0),
    };
  }).filter(Boolean);
};

/**
 * Vendor detail for a farmer: profile + catalog + credit + rating.
 */
const getVendorDetail = async (vendorId, farmerId) => {
  const {
    VendorProfile, VendorShop, VendorProductCatalog, VendorCreditLedger,
    VendorRating, VendorTransaction, VendorTransactionItem,
  } = getDb();

  const [profile, shops, catalog, credit, rating, recentTx] = await Promise.all([
    VendorProfile.findByPk(vendorId),
    VendorShop.findAll({ where: { vendor_id: vendorId, is_active: true } }),
    VendorProductCatalog.findAll({
      where: { vendor_id: vendorId, is_active: true, availability_status: ['in_stock', 'low_stock'] },
      order: [['vendor_selling_price', 'ASC']],
    }),
    VendorCreditLedger.findOne({ where: { vendor_id: vendorId, farmer_id: farmerId, is_active: true } }),
    VendorRating.findOne({ where: { vendor_id: vendorId, farmer_id: farmerId, is_active: true } }),
    VendorTransaction.findAll({
      where: { vendor_id: vendorId, farmer_id: farmerId, is_active: true },
      attributes: ['id', 'transaction_uuid', 'vendor_id', 'farmer_id', 'transaction_type', 'transaction_date', 'transaction_amount', 'transaction_status', 'payment_status', 'season'],
      order: [['transaction_date', 'DESC']],
      limit: 10,
      include: [{ model: VendorTransactionItem, as: 'items', attributes: ['id', 'input_item_id', 'input_pack_id', 'quantity', 'unit_price', 'line_total'] }],
    }),
  ]);

  if (!profile) return null;

  return {
    vendor: {
      id: profile.id,
      name: profile.vendor_name,
      shopName: profile.shop_name,
      vendorType: profile.vendor_type,
      phone: shops[0]?.shop_contact_phone || null,
      address: shops[0]?.shop_address || null,
      rating: Number(profile.rating || 0),
    },
    shops: shops.map((s) => ({
      name: s.shop_name,
      address: s.shop_address,
      phone: s.shop_contact_phone,
      isPhysical: s.is_physical_shop,
      isDelivery: s.is_home_delivery,
    })),
    catalog: catalog.map((c) => ({
      catalogId: c.id,
      inputItemId: c.input_item_id,
      inputPackId: c.input_pack_id,
      mrp: Number(c.mrp_rupees || 0),
      sellingPrice: Number(c.vendor_selling_price || 0),
      stock: c.stock_quantity,
      status: c.availability_status,
    })),
    credit: credit ? {
      balance: Number(credit.current_balance || 0),
      limit: Number(credit.credit_limit || 0),
    } : null,
    myRating: rating ? { score: rating.rating_score, feedback: rating.rating_feedback } : null,
    recentPurchases: recentTx.map((tx) => ({
      id: tx.id,
      date: tx.transaction_date,
      amount: Number(tx.transaction_amount || 0),
      type: tx.transaction_type,
      paymentStatus: tx.payment_status,
      season: tx.season,
      items: (tx.items || []).map((it) => ({
        itemId: it.input_item_id,
        quantity: it.quantity,
        unitPrice: Number(it.unit_price || 0),
        total: Number(it.line_total || 0),
      })),
    })),
  };
};

/**
 * Farmer's recent purchases across all vendors.
 */
const getMyPurchases = async (farmerId, limit = 20) => {
  const { VendorTransaction, VendorTransactionItem, VendorProfile } = getDb();

  const txs = await VendorTransaction.findAll({
    where: { farmer_id: farmerId, is_active: true },
    attributes: ['id', 'transaction_uuid', 'vendor_id', 'farmer_id', 'transaction_type', 'transaction_date', 'transaction_amount', 'transaction_status', 'payment_status', 'season'],
    order: [['transaction_date', 'DESC']],
    limit,
    include: [
      { model: VendorTransactionItem, as: 'items', attributes: ['id', 'input_item_id', 'input_pack_id', 'quantity', 'unit_price', 'line_total'] },
    ],
  });

  // Fetch vendor names
  const vendorIds = [...new Set(txs.map((t) => t.vendor_id))];
  const vendors = await VendorProfile.findAll({ where: { id: vendorIds }, attributes: ['id', 'vendor_name', 'shop_name'] });
  const vendorMap = Object.fromEntries(vendors.map((v) => [v.id, v]));

  return txs.map((tx) => {
    const v = vendorMap[tx.vendor_id];
    return {
      id: tx.id,
      transactionUuid: tx.transaction_uuid,
      vendorId: tx.vendor_id,
      vendorName: v?.vendor_name || 'Unknown',
      shopName: v?.shop_name || null,
      date: tx.transaction_date,
      amount: Number(tx.transaction_amount || 0),
      type: tx.transaction_type,
      paymentStatus: tx.payment_status,
      season: tx.season,
      itemCount: (tx.items || []).length,
      itemsSummary: (tx.items || []).slice(0, 3).map((it) => ({
        itemId: it.input_item_id,
        quantity: it.quantity,
        total: Number(it.line_total || 0),
      })),
    };
  });
};

/**
 * Record a farmer-initiated purchase.
 * Wraps the existing transactionService.createTransaction() but resolves
 * the vendor_id from the farmer context.
 */
const recordPurchase = async (farmerId, data) => {
  const transactionService = require('./transactionService');

  // data: { vendorId, items: [{ inputItemId, inputPackId, quantity }], paymentType, season }
  return transactionService.createTransaction(data.vendorId, {
    farmerId,
    transactionType: data.paymentType === 'credit' ? 'credit_sale' : 'cash_sale',
    transactionDate: new Date().toISOString().slice(0, 10),
    season: data.season || null,
    items: data.items.map((it) => ({
      inputItemId: it.inputItemId,
      inputPackId: it.inputPackId || null,
      quantity: it.quantity,
    })),
  });
};

/**
 * Rate a vendor (farmer-initiated).
 */
const rateVendor = async (farmerId, vendorId, score, feedback) => {
  const { VendorRating, VendorProfile, Sequelize } = getDb();

  // Upsert rating
  const [rating, created] = await VendorRating.findOrCreate({
    where: { vendor_id: vendorId, farmer_id: farmerId },
    defaults: {
      rating_score: score,
      rating_feedback: feedback || null,
      rated_on: new Date(),
      is_active: true,
    },
  });

  if (!created) {
    rating.rating_score = score;
    rating.rating_feedback = feedback || null;
    rating.rated_on = new Date();
    await rating.save();
  }

  // Recalculate vendor average
  const avg = await VendorRating.findOne({
    where: { vendor_id: vendorId, is_active: true },
    attributes: [[Sequelize.fn('AVG', Sequelize.col('rating_score')), 'avg']],
    raw: true,
  });
  if (avg?.avg) {
    await VendorProfile.update(
      { rating: parseFloat(avg.avg).toFixed(1) },
      { where: { id: vendorId } }
    );
  }

  return { score, feedback, created };
};

/**
 * Check if the farmer's current Sathi is also a registered vendor.
 * Joins: intermediary_assignments → vendor_crp_mappings → vendor_profiles.
 */
const getSathiVendorBridge = async (farmerId) => {
  const { IntermediaryAssignment, Intermediary, VendorCrpMapping, VendorProfile, VendorShop } = getDb();

  // Find active assignment
  const assignment = await IntermediaryAssignment.findOne({
    where: { farmer_id: farmerId, is_active: true, assignment_status: 'active' },
    include: [{ model: Intermediary, as: 'intermediary' }],
  });

  if (!assignment?.intermediary) return null;

  // Check if this intermediary's user is mapped as a vendor CRP
  // VendorCrpMapping links vendor_id → crp_id (field_agent_profiles.id)
  // But Intermediary has user_id. We need to check if there's a vendor with
  // the same user_id or a CRP mapping.
  const vendorProfile = await VendorProfile.findOne({
    where: { vendor_user_id: assignment.intermediary.user_id, is_active: true },
    include: [{ model: VendorShop, as: 'shops', where: { is_active: true }, required: false, limit: 1 }],
  });

  if (!vendorProfile) return null;

  return {
    isSathiVendor: true,
    sathiName: assignment.intermediary.name,
    sathiType: assignment.intermediary.type,
    vendor: {
      id: vendorProfile.id,
      name: vendorProfile.vendor_name,
      shopName: vendorProfile.shop_name || vendorProfile.shops?.[0]?.shop_name,
      vendorType: vendorProfile.vendor_type,
      rating: Number(vendorProfile.rating || 0),
    },
  };
};

/**
 * Farmer-initiated vendor registration.
 * Creates a user + vendor_profile + vendor_shop + optionally selects as Sathi.
 */
const addVendor = async (farmerId, data) => {
  const { User, VendorProfile, VendorShop, VendorKyc, Intermediary, IntermediaryAssignment } = getDb();
  const bcrypt = require('bcryptjs');

  const mobile = data.mobile.replace(/^\+?91/, '').replace(/[\s-]/g, '');
  const formattedMobile = `+91${mobile}`;

  // Check if vendor user exists
  let vendorUser = await User.findOne({ where: { mobile: formattedMobile } });
  if (!vendorUser) {
    // Create a user for the vendor (no MPIN — they'll register themselves later)
    vendorUser = await User.create({
      user_id: uuidv4(),
      mobile: formattedMobile,
      first_name: data.name.split(' ')[0] || data.name,
      last_name: data.name.split(' ').slice(1).join(' ') || '',
      is_mobile_verified: false,
      is_active: true,
    });
  }

  // Check if vendor profile exists
  let profile = await VendorProfile.findOne({ where: { vendor_user_id: vendorUser.id } });
  if (!profile) {
    profile = await VendorProfile.create({
      vendor_user_id: vendorUser.id,
      vendor_uuid: uuidv4(),
      vendor_code: `VND${Date.now().toString(36).toUpperCase()}`,
      vendor_type: data.vendorType || 'multipurpose_dealer',
      vendor_name: data.name,
      shop_name: data.shopName || data.name,
      is_active: true,
    });

    // Create shop
    await VendorShop.create({
      vendor_id: profile.id,
      shop_uuid: uuidv4(),
      shop_name: data.shopName || data.name,
      shop_address: data.address || null,
      is_physical_shop: true,
      is_active: true,
    });

    // Create KYC placeholder
    await VendorKyc.create({
      vendor_id: profile.id,
      kyc_status: 'pending',
      is_active: true,
    });
  }

  // If makeSathi, register as intermediary and assign to farmer
  if (data.makeSathi) {
    let intermediary = await Intermediary.findOne({ where: { user_id: vendorUser.id, is_active: true } });
    if (!intermediary) {
      intermediary = await Intermediary.create({
        intermediary_uuid: uuidv4(),
        name: data.name,
        mobile: formattedMobile,
        type: 'input_seller',
        user_id: vendorUser.id,
        is_available: true,
        is_active: true,
      });
    }
    // Assign to farmer
    const existing = await IntermediaryAssignment.findOne({
      where: { intermediary_id: intermediary.id, farmer_id: farmerId, is_active: true },
    });
    if (!existing) {
      await IntermediaryAssignment.create({
        assignment_uuid: uuidv4(),
        intermediary_id: intermediary.id,
        farmer_id: farmerId,
        assigned_at: new Date(),
        assignment_status: 'active',
        selected_by_farmer: true,
        is_active: true,
      });
    }
  }

  logger.info(`Vendor registered by farmer ${farmerId}: ${data.name} (${formattedMobile}), makeSathi=${!!data.makeSathi}`);

  return { vendorId: profile.id, name: profile.vendor_name, makeSathi: !!data.makeSathi };
};

/**
 * Make an existing vendor the farmer's Sathi.
 * Creates an Intermediary row (if needed) and an assignment.
 */
const makeSathi = async (farmerId, vendorId) => {
  const { VendorProfile, User, Intermediary, IntermediaryAssignment } = getDb();

  const profile = await VendorProfile.findByPk(vendorId);
  if (!profile) { const e = new Error('Vendor not found'); e.statusCode = 404; throw e; }

  const vendorUser = await User.findByPk(profile.vendor_user_id);
  if (!vendorUser) { const e = new Error('Vendor user not found'); e.statusCode = 404; throw e; }

  // Find or create intermediary
  let intermediary = await Intermediary.findOne({ where: { user_id: vendorUser.id, is_active: true } });
  if (!intermediary) {
    intermediary = await Intermediary.create({
      intermediary_uuid: uuidv4(),
      name: profile.vendor_name,
      mobile: vendorUser.mobile,
      type: 'input_seller',
      user_id: vendorUser.id,
      is_available: true,
      is_active: true,
    });
  }

  // Check if already assigned
  const existing = await IntermediaryAssignment.findOne({
    where: { intermediary_id: intermediary.id, farmer_id: farmerId, is_active: true, assignment_status: 'active' },
  });
  if (existing) {
    return { message: `${profile.vendor_name} is already your Sathi!`, alreadyAssigned: true };
  }

  await IntermediaryAssignment.create({
    assignment_uuid: uuidv4(),
    intermediary_id: intermediary.id,
    farmer_id: farmerId,
    assigned_at: new Date(),
    assignment_status: 'active',
    selected_by_farmer: true,
    is_active: true,
  });

  logger.info(`Vendor ${vendorId} (${profile.vendor_name}) made Sathi for farmer ${farmerId}`);

  return { message: `${profile.vendor_name} is now your Sathi!`, intermediaryId: intermediary.id };
};

/**
 * Vendor registers a new farmer customer.
 * Creates user if needed, creates vendor_farmer_link, optionally sets credit limit.
 */
const registerFarmer = async (vendorUserId, data) => {
  const { User, VendorProfile, VendorFarmerLink, VendorCreditLedger } = getDb();

  // Find vendor profile from the calling user
  const vendorProfile = await VendorProfile.findOne({ where: { vendor_user_id: vendorUserId } });
  if (!vendorProfile) { const e = new Error('Vendor profile not found'); e.statusCode = 404; throw e; }
  const vendorId = vendorProfile.id;

  const mobile = data.mobile.replace(/^\+?91/, '').replace(/[\s-]/g, '');
  const formattedMobile = `+91${mobile}`;

  // Find or create farmer user
  let farmerUser = await User.findOne({ where: { mobile: formattedMobile } });
  if (!farmerUser) {
    const nameParts = (data.name || '').split(' ');
    farmerUser = await User.create({
      user_id: uuidv4(),
      mobile: formattedMobile,
      first_name: nameParts[0] || data.name,
      last_name: nameParts.slice(1).join(' ') || '',
      is_mobile_verified: false,
      is_active: true,
    });
  }

  // Create or update farmer link
  const [link, created] = await VendorFarmerLink.findOrCreate({
    where: { vendor_id: vendorId, farmer_id: farmerUser.id },
    defaults: {
      link_type: data.giveCredit ? 'credit_customer' : 'regular_customer',
      transaction_count: 0,
      total_value: 0,
      is_active: true,
    },
  });

  // Set up credit if requested
  if (data.giveCredit && data.creditLimit > 0) {
    const [credit] = await VendorCreditLedger.findOrCreate({
      where: { vendor_id: vendorId, farmer_id: farmerUser.id },
      defaults: {
        current_balance: 0,
        credit_limit: data.creditLimit,
        total_credit_given: 0,
        total_payments_received: 0,
        is_active: true,
      },
    });
    if (!credit.isNewRecord) {
      credit.credit_limit = data.creditLimit;
      await credit.save();
    }
    // Update link type to credit_customer
    if (link.link_type !== 'credit_customer') {
      link.link_type = 'credit_customer';
      await link.save();
    }
  }

  logger.info(`Vendor ${vendorId} registered farmer ${farmerUser.id} (${formattedMobile}), credit=${!!data.giveCredit}`);

  return {
    farmerId: farmerUser.id,
    name: `${farmerUser.first_name || ''} ${farmerUser.last_name || ''}`.trim(),
    mobile: farmerUser.mobile,
    creditLimit: data.giveCredit ? data.creditLimit : 0,
    isNew: created,
  };
};

/**
 * List farmers linked to the vendor, with credit and transaction summary.
 */
const getMyFarmers = async (vendorUserId) => {
  const {
    User,
    VendorProfile,
    VendorFarmerLink,
    VendorCreditLedger,
  } = getDb();

  // Find vendor profile
  const vendorProfile = await VendorProfile.findOne({
    where: { vendor_user_id: vendorUserId },
  });

  if (!vendorProfile) {
    const e = new Error('Vendor profile not found');
    e.statusCode = 404;
    throw e;
  }

  const vendorId = vendorProfile.id;

  // Get all linked farmers
  const farmers = await VendorFarmerLink.findAll({
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
          'first_name',
          'last_name',
          'mobile',
        ],
      },
    ],

    order: [['created_at', 'DESC']],
  });

  // Get all credit ledgers for this vendor
  const credits = await VendorCreditLedger.findAll({
    where: {
      vendor_id: vendorId,
      is_active: true,
    },
  });

  // Create lookup map
  const creditMap = Object.fromEntries(
    credits.map((c) => [c.farmer_id, c])
  );

  return farmers.map((item) => {
    const credit = creditMap[item.farmer_id];

    return {
      farmerId: item.farmer?.id,
      name: `${item.farmer?.first_name || ''} ${item.farmer?.last_name || ''}`.trim(),
      mobile: item.farmer?.mobile,
      linkType: item.link_type,
      transactionCount: item.transaction_count || 0,
      totalValue: Number(item.total_value || 0),
      currentBalance: Number(
        credit?.current_balance || 0
      ),
      creditLimit: Number(
        credit?.credit_limit || 0
      ),
      totalCreditGiven: Number(
        credit?.total_credit_given || 0
      ),
      linkedAt: item.created_at,
    };
  });
};

/**
 * Vendor extends credit to a farmer.
 * Updates vendor_credit_ledger (increases current_balance and total_credit_given).
 */
const giveCredit = async (vendorUserId, data) => {
  const { User, VendorProfile, VendorCreditLedger, VendorFarmerLink } = getDb();

  const vendorProfile = await VendorProfile.findOne({ where: { vendor_user_id: vendorUserId } });
  if (!vendorProfile) { const e = new Error('Vendor profile not found'); e.statusCode = 404; throw e; }
  const vendorId = vendorProfile.id;

  // Resolve farmer
  let farmerId = data.farmerId;
  if (!farmerId && data.farmerMobile) {
    const mobile = data.farmerMobile.replace(/^\+?91/, '');
    const farmer = await User.findOne({ where: { mobile: `+91${mobile}` } });
    if (!farmer) { const e = new Error('Farmer not found. Register them first.'); e.statusCode = 404; throw e; }
    farmerId = farmer.id;
  }
  if (!farmerId) { const e = new Error('Farmer ID or mobile required'); e.statusCode = 400; throw e; }

  const amount = parseFloat(data.amount);
  if (!amount || amount <= 0) { const e = new Error('Amount must be positive'); e.statusCode = 400; throw e; }

  // Upsert credit ledger
  const [credit, created] = await VendorCreditLedger.findOrCreate({
    where: { vendor_id: vendorId, farmer_id: farmerId },
    defaults: {
      current_balance: 0,
      credit_limit: amount,
      total_credit_given: 0,
      total_payments_received: 0,
      is_active: true,
    },
  });

  if (!created) {
    credit.credit_limit = parseFloat(credit.credit_limit || 0) + amount;

    // credit.current_balance = parseFloat(credit.current_balance) + amount;
    // credit.total_credit_given = parseFloat(credit.total_credit_given) + amount;
    await credit.save();
  }

  // Ensure farmer link exists and is credit_customer
  await VendorFarmerLink.findOrCreate({
    where: { vendor_id: vendorId, farmer_id: farmerId },
    defaults: { link_type: 'credit_customer', transaction_count: 0, total_value: 0, is_active: true },
  }).then(([link]) => {
    if (link.link_type !== 'credit_customer') {
      link.link_type = 'credit_customer';
      return link.save();
    }
  });

  logger.info(`Vendor ${vendorId} gave credit ${amount} to farmer ${farmerId}, reason=${data.reason}`);

  return {
    farmerId,
    amount,
    // newBalance: parseFloat(credit.current_balance),
    newCreditLimit: parseFloat(credit.credit_limit),
    reason: data.reason,
  };
};

module.exports = {
  getMyVendors,
  getVendorDetail,
  getMyPurchases,
  recordPurchase,
  rateVendor,
  getSathiVendorBridge,
  addVendor,
  makeSathi,
  registerFarmer,
  giveCredit,
  getMyFarmers,
};
