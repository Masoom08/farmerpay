/**
 * Premium Quote Service — Phase 2 POS
 *
 * Pure computation layer that turns (product + sumInsured + context)
 * into a farmer-facing quote. Does NOT write to the DB — callers that
 * want to log the quote must hand the result to posReferralService.
 *
 * Formula:
 *   - Government subsidized products use the product's farmer_premium_rate
 *     directly (e.g. 2% for PMFBY Kharif, 5% for PMFBY Horticulture).
 *     Government subsidy = actuarial − farmer share, where actuarial is
 *     conservatively estimated at 10% for crop products and 8% for
 *     livestock if the product's subsidy_pct is set to 100%.
 *   - Non-subsidized products: farmer pays 100% of the farmer_premium_rate,
 *     no subsidy.
 *
 * This mirrors the existing dice/insuranceService.calculatePremium() but
 * keeps the POS computation decoupled from the legacy enroll/claim code.
 */

const productCatalogService = require('./productCatalogService');

// Conservative actuarial-rate assumption per category when the product's
// subsidy_pct = 100 (govt. covers everything above farmer share).
const ACTUARIAL_FALLBACK = {
  crop: 0.10,         // 10%
  horticulture: 0.12, // 12%
  livestock: 0.08,    // 8%
  fisheries: 0.05,    // 5% (PMMSY is usually govt-funded end-to-end)
  multi: 0.10,
};

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Compute a farmer-facing quote for a given product and sum insured.
 *
 * @param {object} params
 * @param {number} params.productId
 * @param {number} params.sumInsured   - total cover in INR
 * @param {string} [params.season]     - kharif | rabi (for labeling only)
 * @param {number} [params.areaHectares]
 * @param {string} [params.crop]
 * @returns {Promise<object>}
 */
const quote = async ({ productId, sumInsured, season, areaHectares, crop }) => {
  if (!sumInsured || sumInsured < 1000) {
    const err = new Error('sumInsured must be at least INR 1,000');
    err.statusCode = 400;
    err.errorCode = 'VAL_001';
    throw err;
  }

  const product = await productCatalogService.getProductById(productId);

  const farmerRate = (product.farmerPremiumRate || 0) / 100;
  const farmerPremium = round2(sumInsured * farmerRate);

  let actuarialPremium = null;
  let subsidyAmount = 0;

  if (product.subsidyType === 'government') {
    const fallbackRate = ACTUARIAL_FALLBACK[product.category] || 0.10;
    actuarialPremium = round2(sumInsured * fallbackRate);
    subsidyAmount = Math.max(0, round2(actuarialPremium - farmerPremium));
  } else {
    actuarialPremium = farmerPremium; // non-subsidized: farmer pays the posted rate
  }

  const totalCost = farmerPremium; // farmer pays only their share
  const savings = subsidyAmount;

  return {
    productId,
    productCode: product.productCode,
    productName: product.productName,
    subsidyType: product.subsidyType,
    insurerName: product.insurerName,
    inputs: {
      sumInsured: round2(sumInsured),
      season: season || null,
      areaHectares: areaHectares ? round2(areaHectares) : null,
      crop: crop || null,
    },
    farmerPremiumRate: product.farmerPremiumRate,
    actuarialPremium,
    farmerPremium,
    subsidyAmount,
    totalCost,
    savings,
    currency: 'INR',
    rateBreakdown: {
      farmerSharePct: product.farmerPremiumRate,
      subsidyPct: product.subsidyPct,
    },
    disclosure:
      product.subsidyType === 'government'
        ? 'Government-subsidized scheme. Farmer pays only the capped share; balance is borne by central + state governments.'
        : 'Market-rate product. No government subsidy. Premium is the full actuarial cost.',
  };
};

module.exports = {
  quote,
  ACTUARIAL_FALLBACK,
};
