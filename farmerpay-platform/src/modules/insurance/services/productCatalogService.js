/**
 * Insurance Product Catalog Service — Phase 2 POS
 *
 * Read-only queries over pos_insurance_products. The catalog is seeded
 * from seeders/20260416000001-seed-insurance-products.js and refreshed
 * via re-running that seeder (no admin CRUD UI in v1).
 */

const { Op } = require('sequelize');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

const SUB_SCHEME_LABELS = {
  pmfby: 'PMFBY — Crop Insurance',
  rwbcis: 'RWBCIS — Weather Based',
  nlm: 'NLM — Livestock',
  pmmsy: 'PMMSY — Fisheries',
  private: 'Private Insurance',
};

const CATEGORY_LABELS = {
  crop: 'Crop',
  horticulture: 'Horticulture',
  livestock: 'Livestock',
  fisheries: 'Fisheries',
  multi: 'Multi-line',
};

const shapeProduct = (row) => ({
  id: row.id,
  productCode: row.product_code,
  productName: row.product_name,
  category: row.category,
  categoryLabel: CATEGORY_LABELS[row.category] || row.category,
  subsidyType: row.subsidy_type,
  subScheme: row.sub_scheme,
  subSchemeLabel: SUB_SCHEME_LABELS[row.sub_scheme] || row.sub_scheme,
  insurerName: row.insurer_name,
  farmerPremiumRate: row.farmer_premium_rate ? parseFloat(row.farmer_premium_rate) : null,
  subsidyPct: row.subsidy_pct ? parseFloat(row.subsidy_pct) : null,
  coverageDescription: row.coverage_description,
  eligibilityRules: (() => {
    if (!row.eligibility_rules) return null;
    if (typeof row.eligibility_rules === 'object') return row.eligibility_rules;
    try {
      return JSON.parse(row.eligibility_rules);
    } catch {
      return null;
    }
  })(),
  deepLinkUrl: row.deep_link_url,
  portalUrl: row.portal_url,
  contactPhone: row.contact_phone,
  branchHint: row.branch_hint,
  displayOrder: row.display_order,
});

/**
 * List all active products, optionally filtered by subsidy type + category.
 */
const listProducts = async ({ subsidyType = null, category = null } = {}) => {
  const { InsuranceProduct } = getDb();
  const where = { is_active: true };
  if (subsidyType) where.subsidy_type = subsidyType;
  if (category) where.category = category;

  const rows = await InsuranceProduct.findAll({
    where,
    order: [['display_order', 'ASC'], ['id', 'ASC']],
    raw: true,
  });

  return rows.map(shapeProduct);
};

/**
 * Get one product by id — throws if not found.
 */
const getProductById = async (id) => {
  const { InsuranceProduct } = getDb();
  const row = await InsuranceProduct.findByPk(id, { raw: true });
  if (!row || !row.is_active) {
    const err = new Error(`Insurance product ${id} not found`);
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }
  return shapeProduct(row);
};

/**
 * Get one product by product_code — used by internal callers that want
 * a stable reference (e.g. "PMFBY-KHARIF") rather than a numeric id.
 */
const getProductByCode = async (productCode) => {
  const { InsuranceProduct } = getDb();
  const row = await InsuranceProduct.findOne({
    where: { product_code: productCode, is_active: true },
    raw: true,
  });
  if (!row) return null;
  return shapeProduct(row);
};

/**
 * Grouped view for the farmer-app tab layout: { pmfby: [...], rwbcis: [...],
 * nlm: [...], pmmsy: [...], private: [...] }.
 */
const groupedByScheme = async ({ subsidyType = null } = {}) => {
  const rows = await listProducts({ subsidyType });
  const groups = { pmfby: [], rwbcis: [], nlm: [], pmmsy: [], private: [] };
  for (const p of rows) {
    if (p.subScheme in groups) groups[p.subScheme].push(p);
  }
  return groups;
};

module.exports = {
  listProducts,
  getProductById,
  getProductByCode,
  groupedByScheme,
  SUB_SCHEME_LABELS,
  CATEGORY_LABELS,
};
