/**
 * Insurance Service — PMFBY + Multi-Type Insurance
 *
 * Now uses InsuranceEnrollment model (insurance_enrollments table) which has
 * the full schema: policy_number, subsidy, claim lifecycle, multi-type support.
 *
 * Supports: PMFBY crop, livestock, aquaculture, polyhouse, weather index.
 * Includes: POSP channel routing, subsidy calculation, policy number generation,
 * claims workflow (filed → under_review → approved/rejected → settled).
 */

const { Op } = require('sequelize');
const { generateUUID } = require('../../../shared/utils/uuidHelper');
const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

// ─── Premium Rates (PMFBY norms) ────────────────────────────────────

const PREMIUM_RATES = {
  kharif: { farmerRate: 0.02, maxActuarial: 0.15 },    // Farmer 2%, govt subsidizes remainder up to 15%
  rabi:   { farmerRate: 0.015, maxActuarial: 0.12 },   // Farmer 1.5%, govt subsidizes up to 12%
  commercial: { farmerRate: 0.05, maxActuarial: 0.05 }, // No subsidy
};

// ─── Insurance Product Catalog ──────────────────────────────────────

const INSURANCE_PRODUCTS = [
  {
    productCode: 'PMFBY_CROP',
    productName: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
    insuranceType: 'pmfby_crop',
    description: 'Government crop insurance scheme covering yield losses, prevented sowing, post-harvest, and localized calamities.',
    insurer: 'Agriculture Insurance Company of India (AIC)',
    seasons: ['kharif', 'rabi'],
    minSumInsured: 10000,
    maxSumInsured: 5000000,
    claimTypes: ['yield_loss', 'prevented_sowing', 'mid_season', 'post_harvest', 'localized'],
    subsidized: true,
    channel: 'bancassurance',
  },
  {
    productCode: 'WBCIS',
    productName: 'Weather Based Crop Insurance Scheme (WBCIS)',
    insuranceType: 'weather_index',
    description: 'Weather index-based insurance covering rainfall deficit, excess rainfall, temperature, and humidity deviations.',
    insurer: 'HDFC Ergo / ICICI Lombard',
    seasons: ['kharif', 'rabi'],
    minSumInsured: 5000,
    maxSumInsured: 2000000,
    claimTypes: ['rainfall_deficit', 'excess_rainfall', 'temperature', 'humidity'],
    subsidized: true,
    channel: 'insurer_direct',
  },
  {
    productCode: 'LIVESTOCK',
    productName: 'Livestock Insurance Scheme',
    insuranceType: 'livestock',
    description: 'Insurance for cattle, buffalo, goats, and sheep covering death due to disease, accident, or natural calamity.',
    insurer: 'United India Insurance',
    seasons: ['kharif', 'rabi', 'commercial'],
    minSumInsured: 5000,
    maxSumInsured: 500000,
    claimTypes: ['animal_death', 'permanent_disability'],
    subsidized: false,
    channel: 'broker',
  },
  {
    productCode: 'AQUACULTURE',
    productName: 'Aquaculture Insurance',
    insuranceType: 'aquaculture',
    description: 'Insurance for fish, shrimp, and prawn farming covering disease, natural calamity, and water quality events.',
    insurer: 'National Insurance / NFDB Partner',
    seasons: ['kharif', 'rabi', 'commercial'],
    minSumInsured: 10000,
    maxSumInsured: 1000000,
    claimTypes: ['disease_outbreak', 'natural_calamity', 'water_quality'],
    subsidized: false,
    channel: 'insurer_direct',
  },
];

// ─── POSP Channel Routing ───────────────────────────────────────────

const CHANNEL_CONFIG = {
  bancassurance: { name: 'Bank (Bancassurance)', pospRequired: false, commissionRate: 0 },
  insurer_direct: { name: 'Insurer Direct', pospRequired: false, commissionRate: 0 },
  broker: { name: 'Broker / Partner', pospRequired: true, commissionRate: 0.025 }, // 2.5% POSP commission
};

/**
 * Route to appropriate channel based on product + farmer context.
 */
function routeToChannel(product, farmerId) {
  const config = CHANNEL_CONFIG[product.channel] || CHANNEL_CONFIG.bancassurance;
  return {
    channel: product.channel,
    channelName: config.name,
    pospRequired: config.pospRequired,
    commissionRate: config.commissionRate,
    insurer: product.insurer,
  };
}

// ─── Policy Number Generation ───────────────────────────────────────

function generatePolicyNumber(insuranceType, season, farmerId) {
  const typeCode = {
    pmfby_crop: 'PMFBY', weather_index: 'WBCI', livestock: 'LVST',
    aquaculture: 'AQUA', polyhouse: 'POLY',
  }[insuranceType] || 'INS';
  const seasonCode = (season || 'XX').substring(0, 2).toUpperCase();
  const year = new Date().getFullYear().toString().slice(-2);
  const seq = String(Date.now()).slice(-6);
  return `${typeCode}-${seasonCode}-${year}-${farmerId}-${seq}`;
}

// ─── Service Functions ──────────────────────────────────────────────

/**
 * Get available insurance products catalog.
 */
const getProducts = () => {
  return INSURANCE_PRODUCTS.map(p => ({
    ...p,
    routing: routeToChannel(p, null),
  }));
};

/**
 * Calculate premium with PMFBY subsidy breakdown.
 */
const calculatePremium = ({ sumInsured, season, insuranceType }) => {
  const normalizedSeason = (season || '').toLowerCase();
  const rates = PREMIUM_RATES[normalizedSeason];
  if (!rates) {
    const err = new Error(`Invalid season: ${season}. Must be kharif, rabi, or commercial`);
    err.statusCode = 400; err.errorCode = 'INS_001'; throw err;
  }
  if (!sumInsured || sumInsured <= 0) {
    const err = new Error('Sum insured must be a positive number');
    err.statusCode = 400; err.errorCode = 'INS_002'; throw err;
  }

  const actuarialPremium = parseFloat((sumInsured * rates.maxActuarial).toFixed(2));
  const farmerPremium = parseFloat((sumInsured * rates.farmerRate).toFixed(2));
  const govtSubsidy = parseFloat((actuarialPremium - farmerPremium).toFixed(2));

  return {
    sumInsured,
    season: normalizedSeason,
    insuranceType: insuranceType || 'pmfby_crop',
    actuarialPremium,
    farmerPremium,
    govtSubsidy,
    farmerRate: rates.farmerRate,
    subsidyRate: rates.maxActuarial - rates.farmerRate,
    totalRate: rates.maxActuarial,
  };
};

/**
 * Enroll farmer in insurance — creates InsuranceEnrollment record with policy number.
 * Uses the PROPER insurance_enrollments table (not loan_insurance_bundled).
 */
const enrollFarmer = async ({ farmerId, loanApplicationId, cropId, areaHectares, season, sumInsured, insuranceType }) => {
  const { InsuranceEnrollment } = getDb();

  const type = insuranceType || 'pmfby_crop';
  const premiumCalc = calculatePremium({ sumInsured, season, insuranceType: type });
  const policyNumber = generatePolicyNumber(type, season, farmerId);

  // Determine insurer from product catalog
  const product = INSURANCE_PRODUCTS.find(p => p.insuranceType === type);
  const routing = product ? routeToChannel(product, farmerId) : { channel: 'bancassurance', insurer: 'Agriculture Insurance Co' };

  const enrollment = await InsuranceEnrollment.create({
    enrollment_uuid: generateUUID(),
    farmer_id: farmerId,
    insurance_type: type,
    insurer_name: routing.insurer || product?.insurer || 'Agriculture Insurance Co',
    policy_number: policyNumber,
    sum_insured: sumInsured,
    premium_paid: premiumCalc.farmerPremium,
    premium_subsidy: premiumCalc.govtSubsidy,
    crop_insured: cropId || null,
    area_insured_hectares: areaHectares || null,
    season: (season || '').toLowerCase(),
    enrollment_date: new Date(),
    policy_expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    claim_filed: false,
    claim_status: 'none',
    linked_loan_id: loanApplicationId || null,
    is_active: true,
  });

  logger.info(`Insurance enrolled: farmer ${farmerId}, policy ${policyNumber}, type ${type}, premium Rs ${premiumCalc.farmerPremium}`);

  return {
    enrollmentId: enrollment.id,
    enrollmentUuid: enrollment.enrollment_uuid,
    policyNumber,
    farmerId,
    insuranceType: type,
    insurer: routing.insurer,
    season: (season || '').toLowerCase(),
    sumInsured,
    farmerPremium: premiumCalc.farmerPremium,
    govtSubsidy: premiumCalc.govtSubsidy,
    totalPremium: premiumCalc.actuarialPremium,
    channel: routing.channel,
    channelName: routing.channelName,
    policyStatus: 'enrolled',
    enrollmentDate: enrollment.enrollment_date,
    expiryDate: enrollment.policy_expiry_date,
  };
};

/**
 * File an insurance claim with proper workflow.
 * Claim lifecycle: none → filed → under_review → approved/rejected → settled
 */
const fileClaim = async ({ farmerId, insuranceId, claimType, lossPercentage, description }) => {
  const { InsuranceEnrollment } = getDb();

  const policy = await InsuranceEnrollment.findOne({
    where: { id: insuranceId, farmer_id: farmerId, is_active: true },
  });
  if (!policy) {
    const err = new Error('Insurance policy not found');
    err.statusCode = 404; err.errorCode = 'INS_003'; throw err;
  }
  if (policy.claim_status !== 'none' && policy.claim_filed) {
    const err = new Error(`Claim already ${policy.claim_status} for this policy`);
    err.statusCode = 400; err.errorCode = 'INS_004'; throw err;
  }

  const claimAmount = parseFloat(((lossPercentage / 100) * parseFloat(policy.sum_insured)).toFixed(2));

  await policy.update({
    claim_filed: true,
    claim_amount: claimAmount,
    claim_status: 'filed',
  });

  logger.info(`Claim filed: policy ${policy.policy_number}, type ${claimType}, loss ${lossPercentage}%, amount Rs ${claimAmount}`);

  return {
    insuranceId: policy.id,
    policyNumber: policy.policy_number,
    claimType,
    lossPercentage,
    claimAmount,
    claimStatus: 'filed',
  };
};

/**
 * Get all insurance policies for a farmer — from InsuranceEnrollment (standalone).
 * Includes both loan-linked and standalone policies.
 */
const getInsuranceStatus = async (farmerId) => {
  const { InsuranceEnrollment } = getDb();

  const policies = await InsuranceEnrollment.findAll({
    where: { farmer_id: farmerId, is_active: true },
    order: [['enrollment_date', 'DESC']],
    raw: true,
  });

  const data = policies.map(p => ({
    insuranceId: p.id,
    enrollmentUuid: p.enrollment_uuid,
    policyNumber: p.policy_number,
    insuranceType: p.insurance_type,
    insurerName: p.insurer_name,
    season: p.season,
    cropInsured: p.crop_insured,
    areaHectares: parseFloat(p.area_insured_hectares || 0),
    sumInsured: parseFloat(p.sum_insured || 0),
    premiumPaid: parseFloat(p.premium_paid || 0),
    premiumSubsidy: parseFloat(p.premium_subsidy || 0),
    enrollmentDate: p.enrollment_date,
    expiryDate: p.policy_expiry_date,
    linkedLoanId: p.linked_loan_id,
    claimFiled: p.claim_filed,
    claimAmount: parseFloat(p.claim_amount || 0),
    claimStatus: p.claim_status,
    claimPayout: parseFloat(p.claim_payout || 0),
  }));

  return {
    farmerId,
    policies: data,
    totalPolicies: data.length,
    activePolicies: data.filter(p => !p.claimFiled).length,
    claimedPolicies: data.filter(p => p.claimFiled).length,
    totalCoverage: data.reduce((s, p) => s + p.sumInsured, 0),
    totalPremiumPaid: data.reduce((s, p) => s + p.premiumPaid, 0),
    totalSubsidy: data.reduce((s, p) => s + p.premiumSubsidy, 0),
  };
};

module.exports = {
  getProducts,
  calculatePremium,
  enrollFarmer,
  fileClaim,
  getInsuranceStatus,
  INSURANCE_PRODUCTS,
  CHANNEL_CONFIG,
};
