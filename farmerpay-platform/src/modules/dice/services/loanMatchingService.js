/**
 * Loan Matching Service
 * Finds and ranks loan products that match a farmer's profile and needs.
 */

const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');
const { checkEligibility } = require('./eligibilityService');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

/**
 * Searches loan products with optional filters.
 * @param {Object} filters - { minAmount, maxAmount, category, state, providerId }
 * @param {Object} query - { page, limit }
 * @returns {Promise<Object>} { products, meta }
 */
const searchProducts = async (filters = {}, query = {}) => {
  const { LoanProduct, LoanProvider, LoanCategory, LoanSubcategory, LoanProductEligibilityRule } = getDb();
  const { parsePagination, buildMeta } = require('../../../shared/utils/paginationHelper');
  const { page, limit, offset } = parsePagination(query);

  const where = { is_active: true };

  if (filters.minAmount) {
    where.max_loan_amount = { [Op.gte]: parseFloat(filters.minAmount) };
  }
  if (filters.maxAmount) {
    where.min_loan_amount = { [Op.lte]: parseFloat(filters.maxAmount) };
  }

  const include = [
    { model: LoanProvider, as: 'provider', attributes: ['provider_name', 'provider_code'], where: { is_active: true } },
    { model: LoanCategory, as: 'category', attributes: ['category_name', 'category_code'] },
    { model: LoanSubcategory, as: 'subcategory', attributes: ['subcategory_name'], required: false },
  ];

  if (filters.category) {
    include[1].where = { category_code: filters.category };
  }

  const { count, rows } = await LoanProduct.findAndCountAll({
    where, include, limit, offset,
    order: [['min_interest_rate', 'ASC']],
  });

  const products = rows.map((p) => ({
    productId: p.id, productUuid: p.product_uuid,
    productName: p.product_name, productCode: p.product_code,
    description: p.product_description,
    provider: p.provider?.provider_name,
    providerCode: p.provider?.provider_code,
    category: p.category?.category_name,
    subcategory: p.subcategory?.subcategory_name,
    minAmount: p.min_loan_amount, maxAmount: p.max_loan_amount,
    minInterestRate: p.min_interest_rate, maxInterestRate: p.max_interest_rate,
    processingFee: p.processing_fee_percent,
    tenureMin: p.tenure_months_min, tenureMax: p.tenure_months_max,
    repaymentFrequency: p.repayment_frequency,
    moratoriumMonths: p.moratorium_period_months,
  }));

  return { products, meta: buildMeta(page, limit, count) };
};

/**
 * Gets detailed product info with eligibility rules.
 * @param {number} productId
 * @returns {Promise<Object>}
 */
const getProductDetail = async (productId) => {
  const { LoanProduct, LoanProvider, LoanProviderType, LoanCategory, LoanSubcategory, LoanProductEligibilityRule } = getDb();

  const product = await LoanProduct.findByPk(productId, {
    include: [
      { model: LoanProvider, as: 'provider', include: [{ model: LoanProviderType, as: 'providerType' }] },
      { model: LoanCategory, as: 'category' },
      { model: LoanSubcategory, as: 'subcategory' },
      { model: LoanProductEligibilityRule, as: 'eligibilityRules', where: { is_active: true }, required: false },
    ],
  });

  if (!product) {
    const err = new Error('Loan product not found');
    err.statusCode = 404; err.errorCode = 'RES_001';
    throw err;
  }

  return product;
};

module.exports = { searchProducts, getProductDetail };
