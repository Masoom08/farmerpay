/**
 * POS Referral Service — Phase 2
 *
 * Writes and queries the pos_insurance_referrals funnel table.
 *
 * Funnel stages (stored in the `action` column):
 *   1. viewed   — farmer opened the product detail modal
 *   2. quoted   — farmer entered sum insured + got a quote calculation
 *   3. referred — farmer tapped "Go to portal" / "Call" / "Branch"
 *
 * The `converted` boolean is set later by a banker (optional Phase 3 UI).
 */

const crypto = require('crypto');
const { Op, fn, col, literal } = require('sequelize');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

const uuid4 = () => {
  // Not using uuid package — deterministic enough for a POS referral ID.
  const b = crypto.randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};

const shapeReferral = (row) => ({
  referralId: row.id,
  referralUuid: row.referral_uuid,
  farmerId: row.farmer_id,
  productId: row.product_id,
  action: row.action,
  quotedSumInsured: row.quoted_sum_insured ? parseFloat(row.quoted_sum_insured) : null,
  quotedPremiumFarmer: row.quoted_premium_farmer ? parseFloat(row.quoted_premium_farmer) : null,
  quotedPremiumSubsidy: row.quoted_premium_subsidy ? parseFloat(row.quoted_premium_subsidy) : null,
  quotedAreaHectares: row.quoted_area_hectares ? parseFloat(row.quoted_area_hectares) : null,
  quotedCrop: row.quoted_crop,
  quotedSeason: row.quoted_season,
  cycleId: row.cycle_id,
  converted: row.converted,
  conversionNotes: row.conversion_notes,
  referredAt: row.referred_at,
});

/**
 * Log a single funnel action. Always creates a new row — we keep every
 * action so the funnel can be reconstructed exactly.
 */
const logReferral = async ({
  farmerId,
  productId,
  action,
  quoteSnapshot = null,
  cycleId = null,
}) => {
  const { InsurancePosReferral, InsuranceProduct } = getDb();

  // Verify product exists (cheap FK check before insert)
  const product = await InsuranceProduct.findByPk(productId, { attributes: ['id'], raw: true });
  if (!product) {
    const err = new Error(`Insurance product ${productId} not found`);
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const payload = {
    referral_uuid: uuid4(),
    farmer_id: farmerId,
    product_id: productId,
    action,
    referred_at: new Date(),
    is_active: true,
  };

  if (quoteSnapshot) {
    payload.quoted_sum_insured = quoteSnapshot.sumInsured ?? null;
    payload.quoted_premium_farmer = quoteSnapshot.farmerPremium ?? null;
    payload.quoted_premium_subsidy = quoteSnapshot.subsidyAmount ?? null;
    payload.quoted_area_hectares = quoteSnapshot.areaHectares ?? null;
    payload.quoted_crop = quoteSnapshot.crop ?? null;
    payload.quoted_season = quoteSnapshot.season ?? null;
  }
  if (cycleId) payload.cycle_id = cycleId;

  const created = await InsurancePosReferral.create(payload);
  return shapeReferral(created.toJSON());
};

/**
 * Paginated list of a single farmer's referrals, newest first. Used by
 * the "My Referrals" tab in the farmer app.
 */
const getReferralsForFarmer = async (farmerId, { limit = 50, offset = 0 } = {}) => {
  const { InsurancePosReferral, InsuranceProduct } = getDb();

  const rows = await InsurancePosReferral.findAll({
    where: { farmer_id: farmerId, is_active: true },
    include: [
      {
        model: InsuranceProduct,
        as: 'product',
        attributes: ['id', 'product_code', 'product_name', 'subsidy_type', 'insurer_name', 'deep_link_url', 'contact_phone'],
      },
    ],
    order: [['referred_at', 'DESC']],
    limit: Math.min(limit, 100),
    offset,
  });

  return rows.map((r) => {
    const plain = r.toJSON();
    return {
      ...shapeReferral(plain),
      product: plain.product
        ? {
            productId: plain.product.id,
            productCode: plain.product.product_code,
            productName: plain.product.product_name,
            subsidyType: plain.product.subsidy_type,
            insurerName: plain.product.insurer_name,
            deepLinkUrl: plain.product.deep_link_url,
            contactPhone: plain.product.contact_phone,
          }
        : null,
    };
  });
};

/**
 * Conversion funnel stats across the whole portfolio. Used by the
 * banker dashboard POS Referrals tab.
 */
const getFunnelStats = async ({ fromDate = null, toDate = null, productId = null } = {}) => {
  const { InsurancePosReferral, InsuranceProduct } = getDb();

  const where = { is_active: true };
  if (productId) where.product_id = productId;
  if (fromDate || toDate) {
    where.referred_at = {};
    if (fromDate) where.referred_at[Op.gte] = new Date(fromDate);
    if (toDate) where.referred_at[Op.lte] = new Date(`${toDate}T23:59:59`);
  }

  // Top-level counts per action (one COUNT per action via GROUP BY)
  const grouped = await InsurancePosReferral.findAll({
    where,
    attributes: ['action', [fn('COUNT', col('id')), 'count']],
    group: ['action'],
    raw: true,
  });
  const counts = { viewed: 0, quoted: 0, referred: 0 };
  for (const g of grouped) counts[g.action] = parseInt(g.count, 10);

  // Converted count (non-null = finalised either way, true = positive)
  const convertedTrue = await InsurancePosReferral.count({
    where: { ...where, converted: true },
  });

  // Top products by referral action count
  const byProduct = await InsurancePosReferral.findAll({
    where,
    attributes: [
      'product_id',
      [fn('COUNT', col('InsurancePosReferral.id')), 'count'],
    ],
    group: ['product_id'],
    order: [[literal('count'), 'DESC']],
    limit: 10,
    raw: true,
  });

  // Enrich with product names
  const productIds = byProduct.map((r) => r.product_id);
  let productMap = new Map();
  if (productIds.length > 0) {
    const products = await InsuranceProduct.findAll({
      where: { id: { [Op.in]: productIds } },
      attributes: ['id', 'product_name', 'subsidy_type', 'sub_scheme'],
      raw: true,
    });
    productMap = new Map(products.map((p) => [p.id, p]));
  }

  const topProducts = byProduct.map((r) => {
    const p = productMap.get(r.product_id);
    return {
      productId: r.product_id,
      productName: p ? p.product_name : `Product #${r.product_id}`,
      subsidyType: p ? p.subsidy_type : null,
      subScheme: p ? p.sub_scheme : null,
      count: parseInt(r.count, 10),
    };
  });

  const conversionRate =
    counts.referred > 0 ? Math.round((convertedTrue / counts.referred) * 100) : 0;
  const quotedToReferredRate =
    counts.quoted > 0 ? Math.round((counts.referred / counts.quoted) * 100) : 0;
  const viewedToQuotedRate =
    counts.viewed > 0 ? Math.round((counts.quoted / counts.viewed) * 100) : 0;

  return {
    counts,
    convertedTrue,
    conversionRate,
    viewedToQuotedRate,
    quotedToReferredRate,
    topProducts,
    windowFromDate: fromDate,
    windowToDate: toDate,
  };
};

/**
 * Paginated referral list for the banker dashboard's recent-activity
 * table. Joins with users + products for a rich render.
 */
const listReferralsWithFarmerJoin = async ({
  action = null,
  productId = null,
  search = null,
  limit = 25,
  offset = 0,
} = {}) => {
  const { InsurancePosReferral, InsuranceProduct, User } = getDb();

  const where = { is_active: true };
  if (action) where.action = action;
  if (productId) where.product_id = productId;

  // Farmer search requires a pre-filter on users
  if (search && search.trim().length > 0) {
    const q = search.trim();
    const matchedUsers = await User.findAll({
      where: {
        [Op.or]: [
          { first_name: { [Op.like]: `%${q}%` } },
          { last_name: { [Op.like]: `%${q}%` } },
          { mobile: { [Op.like]: `%${q}%` } },
        ],
      },
      attributes: ['id'],
      raw: true,
    });
    const farmerIds = matchedUsers.map((u) => u.id);
    if (farmerIds.length === 0) {
      return { rows: [], total: 0, page: Math.floor(offset / limit) + 1, pageSize: limit };
    }
    where.farmer_id = { [Op.in]: farmerIds };
  }

  const total = await InsurancePosReferral.count({ where });
  const rows = await InsurancePosReferral.findAll({
    where,
    include: [
      {
        model: InsuranceProduct,
        as: 'product',
        attributes: ['id', 'product_name', 'subsidy_type', 'sub_scheme', 'insurer_name'],
      },
      {
        model: User,
        as: 'farmer',
        attributes: ['id', 'first_name', 'last_name', 'mobile'],
      },
    ],
    order: [['referred_at', 'DESC']],
    limit: Math.min(limit, 100),
    offset,
  });

  const enriched = rows.map((r) => {
    const plain = r.toJSON();
    const farmerName =
      `${plain.farmer?.first_name || ''} ${plain.farmer?.last_name || ''}`.trim() ||
      plain.farmer?.mobile ||
      `Farmer #${plain.farmer_id}`;
    return {
      ...shapeReferral(plain),
      farmerName,
      farmerMobile: plain.farmer?.mobile || null,
      productName: plain.product?.product_name || null,
      productSubsidyType: plain.product?.subsidy_type || null,
      productSubScheme: plain.product?.sub_scheme || null,
      insurerName: plain.product?.insurer_name || null,
    };
  });

  return {
    rows: enriched,
    total,
    page: Math.floor(offset / limit) + 1,
    pageSize: limit,
  };
};

/**
 * Banker-side: mark a referral as converted (policy actually issued by
 * the insurer) or not converted. Exposed but not wired to UI in v1.
 */
const markConverted = async (referralId, { converted, notes = null }) => {
  const { InsurancePosReferral } = getDb();
  const row = await InsurancePosReferral.findByPk(referralId);
  if (!row) {
    const err = new Error(`Referral ${referralId} not found`);
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }
  row.converted = converted;
  row.conversion_notes = notes;
  await row.save();
  return shapeReferral(row.toJSON());
};

module.exports = {
  logReferral,
  getReferralsForFarmer,
  getFunnelStats,
  listReferralsWithFarmerJoin,
  markConverted,
};
