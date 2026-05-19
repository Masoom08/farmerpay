/**
 * Insurance Portfolio Service — Banker-facing read-only aggregation.
 *
 * Surfaces the existing insurance_enrollments + loan_insurance_bundled
 * tables to DICE analysts so they can answer:
 *   - "How many of my farmers are insured?"
 *   - "How much premium did we collect this season?"
 *   - "Which claims are stuck in review?"
 *
 * NOTE: This is READ-ONLY in Insurance Phase 1. Claim workflow actions
 * (approve / reject / settle) and loan-bundling triggers live in a
 * future Phase 2.
 */

const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

const PRODUCT_LABELS = {
  pmfby_crop: 'PMFBY Crop',
  livestock: 'Livestock',
  aquaculture: 'Aquaculture',
  polyhouse: 'Polyhouse',
  weather_index: 'Weather Index',
};

const CLAIM_STATUSES = ['none', 'filed', 'under_review', 'approved', 'rejected', 'settled'];

// ─── Helpers ────────────────────────────────────────────────────────

const safeNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const buildFarmerNameMap = async (farmerIds) => {
  if (!farmerIds || farmerIds.length === 0) return new Map();
  const { User } = getDb();
  const users = await User.findAll({
    where: { id: { [Op.in]: [...farmerIds] } },
    attributes: ['id', 'first_name', 'last_name', 'mobile'],
    raw: true,
  });
  const map = new Map();
  for (const u of users) {
    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    map.set(u.id, {
      name: name || u.mobile || `Farmer #${u.id}`,
      mobile: u.mobile || null,
    });
  }
  return map;
};

// ─── 1. Portfolio Summary ───────────────────────────────────────────

const getPortfolioSummary = async () => {
  const { InsuranceEnrollment, LoanInsuranceBundled } = getDb();

  const allActive = await InsuranceEnrollment.findAll({
    where: { is_active: true },
    raw: true,
  });

  const totalPolicies = allActive.length;
  let totalSumInsured = 0;
  let totalPremiumPaid = 0;
  let totalPremiumSubsidy = 0;
  const byProductMap = new Map();
  const claimCounts = { none: 0, filed: 0, under_review: 0, approved: 0, rejected: 0, settled: 0 };
  let totalClaimAmount = 0;
  let totalClaimPayout = 0;
  let policiesLinkedToLoans = 0;

  const today = new Date();
  const expiryCutoff = new Date();
  expiryCutoff.setDate(today.getDate() + 30);
  const expiringSoon = [];

  for (const row of allActive) {
    totalSumInsured += safeNum(row.sum_insured);
    totalPremiumPaid += safeNum(row.premium_paid);
    totalPremiumSubsidy += safeNum(row.premium_subsidy);

    const productKey = row.insurance_type || 'unknown';
    if (!byProductMap.has(productKey)) {
      byProductMap.set(productKey, {
        product: productKey,
        label: PRODUCT_LABELS[productKey] || productKey,
        count: 0,
        sumInsured: 0,
        premium: 0,
      });
    }
    const entry = byProductMap.get(productKey);
    entry.count += 1;
    entry.sumInsured += safeNum(row.sum_insured);
    entry.premium += safeNum(row.premium_paid);

    const cs = row.claim_status || 'none';
    if (cs in claimCounts) claimCounts[cs] += 1;
    if (row.claim_filed) {
      totalClaimAmount += safeNum(row.claim_amount);
      totalClaimPayout += safeNum(row.claim_payout);
    }

    if (row.linked_loan_id) policiesLinkedToLoans += 1;

    if (row.policy_expiry_date) {
      const exp = new Date(row.policy_expiry_date);
      if (exp >= today && exp <= expiryCutoff) {
        expiringSoon.push({
          enrollmentId: row.id,
          enrollmentUuid: row.enrollment_uuid,
          farmerId: row.farmer_id,
          product: productKey,
          productLabel: PRODUCT_LABELS[productKey] || productKey,
          policyNumber: row.policy_number,
          expiryDate: row.policy_expiry_date,
          daysUntilExpiry: Math.ceil((exp - today) / (1000 * 60 * 60 * 24)),
          sumInsured: safeNum(row.sum_insured),
        });
      }
    }
  }

  // Sort expiring soon by days ascending, keep top 5
  expiringSoon.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  const expiringIn30Days = expiringSoon.slice(0, 5);

  // Enrich expiring rows with farmer names (tiny batch)
  if (expiringIn30Days.length > 0) {
    const nameMap = await buildFarmerNameMap(expiringIn30Days.map((e) => e.farmerId));
    for (const row of expiringIn30Days) {
      const farmer = nameMap.get(row.farmerId);
      row.farmerName = farmer ? farmer.name : `Farmer #${row.farmerId}`;
    }
  }

  const netPremiumFarmer = totalPremiumPaid - totalPremiumSubsidy;

  // Settlement ratio: payout / claim amount. Only meaningful if claims were filed.
  const settlementRatio =
    totalClaimAmount > 0 ? Math.round((totalClaimPayout / totalClaimAmount) * 100) : 0;

  // Loan-bundled count — from the separate LoanInsuranceBundled table.
  // Could diverge from InsuranceEnrollment.linked_loan_id when loans are
  // bundled but not yet tracked as standalone policies.
  const loanBundledCount = await LoanInsuranceBundled.count({ where: { is_active: true } });

  return {
    totalPolicies,
    totalSumInsured: Math.round(totalSumInsured),
    totalPremiumPaid: Math.round(totalPremiumPaid),
    totalPremiumSubsidy: Math.round(totalPremiumSubsidy),
    netPremiumFarmer: Math.round(netPremiumFarmer),
    byProduct: Array.from(byProductMap.values()).sort((a, b) => b.count - a.count),
    claimStats: {
      counts: claimCounts,
      totalClaimAmount: Math.round(totalClaimAmount),
      totalClaimPayout: Math.round(totalClaimPayout),
      settlementRatio,
      totalClaimsFiled:
        claimCounts.filed + claimCounts.under_review + claimCounts.approved + claimCounts.settled + claimCounts.rejected,
      totalClaimsPending: claimCounts.filed + claimCounts.under_review,
    },
    policiesLinkedToLoans,
    loanBundledCount,
    expiringIn30Days,
  };
};

// ─── 2. List Policies (paginated, filterable) ──────────────────────

const listPolicies = async ({
  product = null,
  status = null,
  search = null,
  limit = 25,
  offset = 0,
} = {}) => {
  const { InsuranceEnrollment, User } = getDb();

  const where = { is_active: true };
  if (product && PRODUCT_LABELS[product]) {
    where.insurance_type = product;
  }
  if (status && CLAIM_STATUSES.includes(status)) {
    where.claim_status = status;
  }

  // Farmer-side search needs a pre-filter on users
  let farmerIdFilter = null;
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
    farmerIdFilter = matchedUsers.map((u) => u.id);
    if (farmerIdFilter.length === 0) {
      return { rows: [], total: 0, page: Math.floor(offset / limit) + 1, pageSize: limit };
    }
    where.farmer_id = { [Op.in]: farmerIdFilter };
  }

  const total = await InsuranceEnrollment.count({ where });
  const rows = await InsuranceEnrollment.findAll({
    where,
    limit: Math.min(limit, 100),
    offset,
    order: [['enrollment_date', 'DESC'], ['id', 'DESC']],
    raw: true,
  });

  const farmerIds = [...new Set(rows.map((r) => r.farmer_id))];
  const nameMap = await buildFarmerNameMap(farmerIds);

  const enriched = rows.map((r) => {
    const farmer = nameMap.get(r.farmer_id) || {};
    return {
      enrollmentId: r.id,
      enrollmentUuid: r.enrollment_uuid,
      policyNumber: r.policy_number,
      farmerId: r.farmer_id,
      farmerName: farmer.name || `Farmer #${r.farmer_id}`,
      farmerMobile: farmer.mobile,
      insuranceType: r.insurance_type,
      insuranceTypeLabel: PRODUCT_LABELS[r.insurance_type] || r.insurance_type,
      insurerName: r.insurer_name,
      sumInsured: safeNum(r.sum_insured),
      premiumPaid: safeNum(r.premium_paid),
      premiumSubsidy: safeNum(r.premium_subsidy),
      cropInsured: r.crop_insured,
      areaInsuredHectares: safeNum(r.area_insured_hectares),
      animalTagId: r.animal_tag_id,
      season: r.season,
      enrollmentDate: r.enrollment_date,
      policyExpiryDate: r.policy_expiry_date,
      claimFiled: !!r.claim_filed,
      claimAmount: safeNum(r.claim_amount),
      claimStatus: r.claim_status || 'none',
      claimPayout: safeNum(r.claim_payout),
      linkedLoanId: r.linked_loan_id,
    };
  });

  return {
    rows: enriched,
    total,
    page: Math.floor(offset / limit) + 1,
    pageSize: limit,
  };
};

// ─── 3. List Claims (pipeline view) ────────────────────────────────

const listClaims = async ({ status = null } = {}) => {
  const { InsuranceEnrollment } = getDb();

  const where = { is_active: true, claim_filed: true };
  if (status && CLAIM_STATUSES.includes(status)) {
    where.claim_status = status;
  }

  const rows = await InsuranceEnrollment.findAll({
    where,
    order: [['updated_at', 'DESC']],
    raw: true,
  });

  const farmerIds = [...new Set(rows.map((r) => r.farmer_id))];
  const nameMap = await buildFarmerNameMap(farmerIds);

  return rows.map((r) => {
    const farmer = nameMap.get(r.farmer_id) || {};
    return {
      enrollmentId: r.id,
      enrollmentUuid: r.enrollment_uuid,
      farmerId: r.farmer_id,
      farmerName: farmer.name || `Farmer #${r.farmer_id}`,
      farmerMobile: farmer.mobile,
      policyNumber: r.policy_number,
      insurerName: r.insurer_name,
      insuranceType: r.insurance_type,
      insuranceTypeLabel: PRODUCT_LABELS[r.insurance_type] || r.insurance_type,
      cropInsured: r.crop_insured,
      animalTagId: r.animal_tag_id,
      sumInsured: safeNum(r.sum_insured),
      claimAmount: safeNum(r.claim_amount),
      claimPayout: safeNum(r.claim_payout),
      claimStatus: r.claim_status,
      updatedAt: r.updated_at,
    };
  });
};

// ─── 4. Per-farmer Drill-in ────────────────────────────────────────

const getFarmerInsuranceDetail = async (farmerId) => {
  const { InsuranceEnrollment } = getDb();
  const rows = await InsuranceEnrollment.findAll({
    where: { farmer_id: farmerId, is_active: true },
    order: [['enrollment_date', 'DESC']],
    raw: true,
  });

  const policies = rows.map((r) => ({
    enrollmentId: r.id,
    enrollmentUuid: r.enrollment_uuid,
    policyNumber: r.policy_number,
    insuranceType: r.insurance_type,
    insuranceTypeLabel: PRODUCT_LABELS[r.insurance_type] || r.insurance_type,
    insurerName: r.insurer_name,
    sumInsured: safeNum(r.sum_insured),
    premiumPaid: safeNum(r.premium_paid),
    premiumSubsidy: safeNum(r.premium_subsidy),
    cropInsured: r.crop_insured,
    areaInsuredHectares: safeNum(r.area_insured_hectares),
    animalTagId: r.animal_tag_id,
    season: r.season,
    enrollmentDate: r.enrollment_date,
    policyExpiryDate: r.policy_expiry_date,
    claimFiled: !!r.claim_filed,
    claimAmount: safeNum(r.claim_amount),
    claimStatus: r.claim_status || 'none',
    claimPayout: safeNum(r.claim_payout),
    linkedLoanId: r.linked_loan_id,
  }));

  const totals = policies.reduce(
    (acc, p) => {
      acc.totalSumInsured += p.sumInsured;
      acc.totalPremiumPaid += p.premiumPaid;
      acc.totalPremiumSubsidy += p.premiumSubsidy;
      acc.totalClaimPayout += p.claimPayout;
      return acc;
    },
    { totalSumInsured: 0, totalPremiumPaid: 0, totalPremiumSubsidy: 0, totalClaimPayout: 0 },
  );

  return {
    farmerId,
    policies,
    totals: {
      totalSumInsured: Math.round(totals.totalSumInsured),
      totalPremiumPaid: Math.round(totals.totalPremiumPaid),
      totalPremiumSubsidy: Math.round(totals.totalPremiumSubsidy),
      totalClaimPayout: Math.round(totals.totalClaimPayout),
      policyCount: policies.length,
    },
  };
};

// ─── Phase 2 POS — funnel + catalog delegates ──────────────────────

/**
 * Banker-facing wrapper around posReferralService.getFunnelStats(). No
 * additional aggregation — the POS service already returns the shape
 * the dashboard needs.
 */
const getReferralFunnel = async ({ fromDate = null, toDate = null, productId = null } = {}) => {
  const posReferralService = require('../../insurance/services/posReferralService');
  return posReferralService.getFunnelStats({ fromDate, toDate, productId });
};

/**
 * Banker-facing wrapper around posReferralService.listReferralsWithFarmerJoin().
 * Paginated recent-referrals table for the POS Referrals tab.
 */
const listReferrals = async ({
  action = null,
  productId = null,
  search = null,
  page = 1,
  pageSize = 25,
} = {}) => {
  const posReferralService = require('../../insurance/services/posReferralService');
  const offset = (Math.max(1, page) - 1) * pageSize;
  return posReferralService.listReferralsWithFarmerJoin({
    action,
    productId,
    search,
    limit: pageSize,
    offset,
  });
};

/**
 * Banker-facing wrapper around productCatalogService.listProducts(). Used
 * by the Offers Catalog tab (read-only v1).
 */
const listPosProducts = async () => {
  const productCatalogService = require('../../insurance/services/productCatalogService');
  return productCatalogService.listProducts();
};

module.exports = {
  getPortfolioSummary,
  listPolicies,
  listClaims,
  getFarmerInsuranceDetail,
  // Phase 2 POS additions
  getReferralFunnel,
  listReferrals,
  listPosProducts,
  // Exported for tests / callers that need the enum labels
  PRODUCT_LABELS,
  CLAIM_STATUSES,
};
