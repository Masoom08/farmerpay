'use strict';

/**
 * Insurance Demo Data Seeder — Insurance Phase 1
 *
 * Seeds ~20 insurance_enrollments rows + 3 loan_insurance_bundled rows
 * so the banker dashboard's new /dashboard/insurance page lights up
 * immediately after a fresh DB reset.
 *
 * Mix:
 *   - 10 PMFBY crop policies (Wheat/Rice/Cotton/Onion across Rabi
 *     2025-26 and Kharif 2026). Realistic per-hectare sum insured,
 *     2% Kharif / 1.5% Rabi / 5% horticulture premium, ~10% actuarial
 *     rate so premium_subsidy = actuarial − farmer share.
 *     Claim status mix: 5 none, 2 filed, 1 under_review, 1 approved,
 *     1 settled.
 *   -  5 livestock policies (dairy cows) with animal_tag_id populated.
 *      1 settled disease claim.
 *   -  5 weather-index policies (crop-linked, mostly "none" status,
 *      1 filed rainfall-deficit claim).
 *   -  3 loan_insurance_bundled rows — one per disbursed-loan farmer
 *      so the "policies linked to loans" KPI is non-zero.
 *
 * Idempotent: each enrollment has a deterministic enrollment_uuid
 * derived from a composite seed, pre-queried before bulkInsert so
 * re-running is a no-op.
 *
 * Farmer IDs used: 1 (Ramesh), 2 (Vikram), 3 (Rajesh), 12 (Raju),
 * 13 (Lakshmi), 14 (Kumar Naik) — these exist in the dev seeder.
 */

const crypto = require('crypto');

const uuidFor = (seed) => {
  const h = crypto.createHash('sha1').update(`insurance-demo|${seed}`).digest('hex');
  return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20, 32)].join('-');
};

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const policyNumber = (prefix, n) =>
  `${prefix}/${new Date().getFullYear()}/${String(n).padStart(6, '0')}`;

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // Build every row first, then pre-query uuids to filter out existing ones
    const enrollments = [
      // ─── PMFBY crop policies ───────────────────────────────────
      // Row 1 — Ramesh, Wheat Rabi, no claim
      {
        seed: 'ramesh-wheat-rabi-2025',
        farmer_id: 1,
        insurance_type: 'pmfby_crop',
        insurer_name: 'Agriculture Insurance Company of India',
        policy_number: policyNumber('AIC/PMFBY', 1001),
        sum_insured: 87500,
        premium_paid: 1313,        // 1.5% Rabi rate
        premium_subsidy: 7437,     // actuarial ~10% of 87500 = 8750, farmer 1313 → subsidy 7437
        crop_insured: 'Wheat',
        area_insured_hectares: 2.5,
        season: 'Rabi 2025-26',
        enrollment_date: daysAgo(150),
        policy_expiry_date: daysFromNow(15),
        linked_loan_id: 13,
        claim_status: 'none',
      },
      // Row 2 — Vikram, Wheat Rabi, filed claim
      {
        seed: 'vikram-wheat-rabi-2025',
        farmer_id: 2,
        insurance_type: 'pmfby_crop',
        insurer_name: 'Agriculture Insurance Company of India',
        policy_number: policyNumber('AIC/PMFBY', 1002),
        sum_insured: 70000,
        premium_paid: 1050,
        premium_subsidy: 5950,
        crop_insured: 'Wheat',
        area_insured_hectares: 2.0,
        season: 'Rabi 2025-26',
        enrollment_date: daysAgo(140),
        policy_expiry_date: daysFromNow(10),
        claim_filed: true,
        claim_amount: 42000,
        claim_status: 'filed',
      },
      // Row 3 — Rajesh, Rice Kharif, under review
      {
        seed: 'rajesh-rice-kharif-2026',
        farmer_id: 3,
        insurance_type: 'pmfby_crop',
        insurer_name: 'Agriculture Insurance Company of India',
        policy_number: policyNumber('AIC/PMFBY', 1003),
        sum_insured: 120000,
        premium_paid: 2400,        // 2% Kharif
        premium_subsidy: 9600,
        crop_insured: 'Rice',
        area_insured_hectares: 3.0,
        season: 'Kharif 2026',
        enrollment_date: daysAgo(90),
        policy_expiry_date: daysFromNow(60),
        claim_filed: true,
        claim_amount: 65000,
        claim_status: 'under_review',
      },
      // Row 4 — Raju, Cotton Kharif, approved
      {
        seed: 'raju-cotton-kharif-2026',
        farmer_id: 12,
        insurance_type: 'pmfby_crop',
        insurer_name: 'Agriculture Insurance Company of India',
        policy_number: policyNumber('AIC/PMFBY', 1004),
        sum_insured: 213000,       // cotton ₹71k/ha × 3ha
        premium_paid: 10650,       // 5% commercial
        premium_subsidy: 10650,    // 50/50 split at 10% actuarial
        crop_insured: 'Cotton',
        area_insured_hectares: 3.0,
        season: 'Kharif 2026',
        enrollment_date: daysAgo(100),
        policy_expiry_date: daysFromNow(50),
        linked_loan_id: 1,
        claim_filed: true,
        claim_amount: 128000,
        claim_status: 'approved',
        claim_payout: 115000,
      },
      // Row 5 — Lakshmi, Wheat Rabi, settled
      {
        seed: 'lakshmi-wheat-rabi-2025',
        farmer_id: 13,
        insurance_type: 'pmfby_crop',
        insurer_name: 'Agriculture Insurance Company of India',
        policy_number: policyNumber('AIC/PMFBY', 1005),
        sum_insured: 52500,
        premium_paid: 788,
        premium_subsidy: 4462,
        crop_insured: 'Wheat',
        area_insured_hectares: 1.5,
        season: 'Rabi 2025-26',
        enrollment_date: daysAgo(160),
        policy_expiry_date: daysFromNow(5),
        linked_loan_id: 2,
        claim_filed: true,
        claim_amount: 32000,
        claim_status: 'settled',
        claim_payout: 29500,
      },
      // Row 6 — Kumar Naik, Rice Kharif, no claim
      {
        seed: 'kumar-rice-kharif-2026',
        farmer_id: 14,
        insurance_type: 'pmfby_crop',
        insurer_name: 'Agriculture Insurance Company of India',
        policy_number: policyNumber('AIC/PMFBY', 1006),
        sum_insured: 160000,
        premium_paid: 3200,
        premium_subsidy: 12800,
        crop_insured: 'Rice',
        area_insured_hectares: 4.0,
        season: 'Kharif 2026',
        enrollment_date: daysAgo(85),
        policy_expiry_date: daysFromNow(65),
        linked_loan_id: 3,
        claim_status: 'none',
      },
      // Row 7 — Ramesh, Onion Kharif, no claim (second policy)
      {
        seed: 'ramesh-onion-kharif-2026',
        farmer_id: 1,
        insurance_type: 'pmfby_crop',
        insurer_name: 'Agriculture Insurance Company of India',
        policy_number: policyNumber('AIC/PMFBY', 1007),
        sum_insured: 120000,
        premium_paid: 6000,        // 5% horticulture
        premium_subsidy: 6000,
        crop_insured: 'Onion',
        area_insured_hectares: 1.5,
        season: 'Kharif 2026',
        enrollment_date: daysAgo(80),
        policy_expiry_date: daysFromNow(40),
        claim_status: 'none',
      },
      // Row 8 — Vikram, Rice Rabi, no claim
      {
        seed: 'vikram-rice-rabi-2025',
        farmer_id: 2,
        insurance_type: 'pmfby_crop',
        insurer_name: 'Agriculture Insurance Company of India',
        policy_number: policyNumber('AIC/PMFBY', 1008),
        sum_insured: 100000,
        premium_paid: 1500,
        premium_subsidy: 8500,
        crop_insured: 'Rice',
        area_insured_hectares: 2.5,
        season: 'Rabi 2025-26',
        enrollment_date: daysAgo(145),
        policy_expiry_date: daysFromNow(25),
        claim_status: 'none',
      },
      // Row 9 — Rajesh, Wheat Rabi, rejected claim
      {
        seed: 'rajesh-wheat-rabi-2025-rejected',
        farmer_id: 3,
        insurance_type: 'pmfby_crop',
        insurer_name: 'Agriculture Insurance Company of India',
        policy_number: policyNumber('AIC/PMFBY', 1009),
        sum_insured: 70000,
        premium_paid: 1050,
        premium_subsidy: 5950,
        crop_insured: 'Wheat',
        area_insured_hectares: 2.0,
        season: 'Rabi 2025-26',
        enrollment_date: daysAgo(155),
        policy_expiry_date: daysFromNow(8),
        claim_filed: true,
        claim_amount: 38000,
        claim_status: 'rejected',
      },
      // Row 10 — Raju, Onion Kharif, no claim
      {
        seed: 'raju-onion-kharif-2026',
        farmer_id: 12,
        insurance_type: 'pmfby_crop',
        insurer_name: 'Agriculture Insurance Company of India',
        policy_number: policyNumber('AIC/PMFBY', 1010),
        sum_insured: 96000,
        premium_paid: 4800,
        premium_subsidy: 4800,
        crop_insured: 'Onion',
        area_insured_hectares: 1.2,
        season: 'Kharif 2026',
        enrollment_date: daysAgo(75),
        policy_expiry_date: daysFromNow(45),
        claim_status: 'none',
      },
      // ─── Livestock policies ────────────────────────────────────
      // Row 11 — Ramesh, dairy cow, no claim
      {
        seed: 'ramesh-livestock-cow-001',
        farmer_id: 1,
        insurance_type: 'livestock',
        insurer_name: 'United India Insurance',
        policy_number: policyNumber('UIIC/LIV', 2001),
        sum_insured: 60000,
        premium_paid: 2400,        // 4% flat
        premium_subsidy: 0,
        animal_tag_id: 'IN-KA-12345',
        season: null,
        enrollment_date: daysAgo(100),
        policy_expiry_date: daysFromNow(265),
        claim_status: 'none',
      },
      // Row 12 — Vikram, buffalo, filed claim
      {
        seed: 'vikram-livestock-buffalo-002',
        farmer_id: 2,
        insurance_type: 'livestock',
        insurer_name: 'United India Insurance',
        policy_number: policyNumber('UIIC/LIV', 2002),
        sum_insured: 75000,
        premium_paid: 3000,
        premium_subsidy: 0,
        animal_tag_id: 'IN-KA-23456',
        season: null,
        enrollment_date: daysAgo(120),
        policy_expiry_date: daysFromNow(245),
        claim_filed: true,
        claim_amount: 45000,
        claim_status: 'filed',
      },
      // Row 13 — Rajesh, dairy cow, settled (mastitis claim)
      {
        seed: 'rajesh-livestock-cow-003',
        farmer_id: 3,
        insurance_type: 'livestock',
        insurer_name: 'United India Insurance',
        policy_number: policyNumber('UIIC/LIV', 2003),
        sum_insured: 55000,
        premium_paid: 2200,
        premium_subsidy: 0,
        animal_tag_id: 'IN-KA-34567',
        season: null,
        enrollment_date: daysAgo(200),
        policy_expiry_date: daysFromNow(165),
        claim_filed: true,
        claim_amount: 28000,
        claim_status: 'settled',
        claim_payout: 25000,
      },
      // Row 14 — Lakshmi, dairy cow
      {
        seed: 'lakshmi-livestock-cow-004',
        farmer_id: 13,
        insurance_type: 'livestock',
        insurer_name: 'United India Insurance',
        policy_number: policyNumber('UIIC/LIV', 2004),
        sum_insured: 50000,
        premium_paid: 2000,
        premium_subsidy: 0,
        animal_tag_id: 'IN-KA-45678',
        season: null,
        enrollment_date: daysAgo(60),
        policy_expiry_date: daysFromNow(305),
        claim_status: 'none',
      },
      // Row 15 — Kumar Naik, bullock, no claim
      {
        seed: 'kumar-livestock-bullock-005',
        farmer_id: 14,
        insurance_type: 'livestock',
        insurer_name: 'United India Insurance',
        policy_number: policyNumber('UIIC/LIV', 2005),
        sum_insured: 35000,
        premium_paid: 1400,
        premium_subsidy: 0,
        animal_tag_id: 'IN-KA-56789',
        season: null,
        enrollment_date: daysAgo(45),
        policy_expiry_date: daysFromNow(320),
        claim_status: 'none',
      },
      // ─── Weather-index policies ────────────────────────────────
      // Row 16 — Ramesh, Wheat weather-index, no claim
      {
        seed: 'ramesh-weather-wheat-2025',
        farmer_id: 1,
        insurance_type: 'weather_index',
        insurer_name: 'HDFC Ergo',
        policy_number: policyNumber('HDFC/WBCIS', 3001),
        sum_insured: 60000,
        premium_paid: 3000,
        premium_subsidy: 3000,
        crop_insured: 'Wheat',
        area_insured_hectares: 2.0,
        season: 'Rabi 2025-26',
        enrollment_date: daysAgo(140),
        policy_expiry_date: daysFromNow(20),
        claim_status: 'none',
      },
      // Row 17 — Vikram, Rice weather-index, filed (rainfall deficit)
      {
        seed: 'vikram-weather-rice-2026',
        farmer_id: 2,
        insurance_type: 'weather_index',
        insurer_name: 'HDFC Ergo',
        policy_number: policyNumber('HDFC/WBCIS', 3002),
        sum_insured: 80000,
        premium_paid: 4000,
        premium_subsidy: 4000,
        crop_insured: 'Rice',
        area_insured_hectares: 2.5,
        season: 'Kharif 2026',
        enrollment_date: daysAgo(95),
        policy_expiry_date: daysFromNow(55),
        claim_filed: true,
        claim_amount: 35000,
        claim_status: 'filed',
      },
      // Row 18 — Raju, Cotton weather-index
      {
        seed: 'raju-weather-cotton-2026',
        farmer_id: 12,
        insurance_type: 'weather_index',
        insurer_name: 'HDFC Ergo',
        policy_number: policyNumber('HDFC/WBCIS', 3003),
        sum_insured: 120000,
        premium_paid: 6000,
        premium_subsidy: 6000,
        crop_insured: 'Cotton',
        area_insured_hectares: 2.5,
        season: 'Kharif 2026',
        enrollment_date: daysAgo(85),
        policy_expiry_date: daysFromNow(50),
        claim_status: 'none',
      },
      // Row 19 — Lakshmi, Wheat weather-index
      {
        seed: 'lakshmi-weather-wheat-2025',
        farmer_id: 13,
        insurance_type: 'weather_index',
        insurer_name: 'HDFC Ergo',
        policy_number: policyNumber('HDFC/WBCIS', 3004),
        sum_insured: 45000,
        premium_paid: 2250,
        premium_subsidy: 2250,
        crop_insured: 'Wheat',
        area_insured_hectares: 1.5,
        season: 'Rabi 2025-26',
        enrollment_date: daysAgo(135),
        policy_expiry_date: daysFromNow(18),
        claim_status: 'none',
      },
      // Row 20 — Kumar, Rice weather-index
      {
        seed: 'kumar-weather-rice-2026',
        farmer_id: 14,
        insurance_type: 'weather_index',
        insurer_name: 'HDFC Ergo',
        policy_number: policyNumber('HDFC/WBCIS', 3005),
        sum_insured: 100000,
        premium_paid: 5000,
        premium_subsidy: 5000,
        crop_insured: 'Rice',
        area_insured_hectares: 3.0,
        season: 'Kharif 2026',
        enrollment_date: daysAgo(80),
        policy_expiry_date: daysFromNow(58),
        claim_status: 'none',
      },
    ];

    // Pre-query existing uuids so re-runs are no-ops
    const allUuids = enrollments.map((e) => uuidFor(e.seed));
    const [existing] = await queryInterface.sequelize.query(
      `SELECT enrollment_uuid FROM insurance_enrollments WHERE enrollment_uuid IN (?)`,
      { replacements: [allUuids] },
    );
    const existingSet = new Set(existing.map((r) => r.enrollment_uuid));

    const rowsToInsert = enrollments
      .filter((e) => !existingSet.has(uuidFor(e.seed)))
      .map((e) => ({
        enrollment_uuid: uuidFor(e.seed),
        farmer_id: e.farmer_id,
        insurance_type: e.insurance_type,
        insurer_name: e.insurer_name,
        policy_number: e.policy_number,
        sum_insured: e.sum_insured,
        premium_paid: e.premium_paid,
        premium_subsidy: e.premium_subsidy,
        crop_insured: e.crop_insured || null,
        area_insured_hectares: e.area_insured_hectares || null,
        animal_tag_id: e.animal_tag_id || null,
        season: e.season || null,
        enrollment_date: e.enrollment_date,
        policy_expiry_date: e.policy_expiry_date,
        claim_filed: !!e.claim_filed,
        claim_amount: e.claim_amount || null,
        claim_status: e.claim_status || 'none',
        claim_payout: e.claim_payout || null,
        linked_loan_id: e.linked_loan_id || null,
        is_active: true,
        created_at: now,
        updated_at: now,
      }));

    if (rowsToInsert.length > 0) {
      await queryInterface.bulkInsert('insurance_enrollments', rowsToInsert);
      console.log(`[seed-insurance-demo] inserted ${rowsToInsert.length} enrollments`);
    } else {
      console.log('[seed-insurance-demo] all enrollments already exist — skipping');
    }

    // ─── loan_insurance_bundled rows ─────────────────────────────
    // Tie 3 disbursed loans to insurance products so the "policies
    // linked to loans" KPI on the overview card is non-zero.
    const bundles = [
      {
        application_id: 1,
        insurance_product_name: 'PMFBY Cotton — Kharif 2026',
        insurance_provider: 'Agriculture Insurance Company of India',
        premium_amount: 10650,
        coverage_amount: 213000,
      },
      {
        application_id: 2,
        insurance_product_name: 'PMFBY Wheat — Rabi 2025-26',
        insurance_provider: 'Agriculture Insurance Company of India',
        premium_amount: 788,
        coverage_amount: 52500,
      },
      {
        application_id: 3,
        insurance_product_name: 'PMFBY Rice — Kharif 2026',
        insurance_provider: 'Agriculture Insurance Company of India',
        premium_amount: 3200,
        coverage_amount: 160000,
      },
    ];

    const [existingBundles] = await queryInterface.sequelize.query(
      `SELECT application_id FROM loan_insurance_bundled WHERE application_id IN (?)`,
      { replacements: [bundles.map((b) => b.application_id)] },
    );
    const existingBundleIds = new Set(existingBundles.map((r) => r.application_id));

    const bundlesToInsert = bundles
      .filter((b) => !existingBundleIds.has(b.application_id))
      .map((b) => ({
        application_id: b.application_id,
        insurance_product_name: b.insurance_product_name,
        insurance_provider: b.insurance_provider,
        premium_amount: b.premium_amount,
        premium_is_bundled: true,
        coverage_amount: b.coverage_amount,
        is_active: true,
        created_at: now,
        updated_at: now,
      }));

    if (bundlesToInsert.length > 0) {
      await queryInterface.bulkInsert('loan_insurance_bundled', bundlesToInsert);
      console.log(`[seed-insurance-demo] inserted ${bundlesToInsert.length} loan bundles`);
    } else {
      console.log('[seed-insurance-demo] all loan bundles already exist — skipping');
    }
  },

  async down(queryInterface) {
    // Destructive — delete by the deterministic uuid prefix we emit
    const allUuids = [
      'ramesh-wheat-rabi-2025', 'vikram-wheat-rabi-2025', 'rajesh-rice-kharif-2026',
      'raju-cotton-kharif-2026', 'lakshmi-wheat-rabi-2025', 'kumar-rice-kharif-2026',
      'ramesh-onion-kharif-2026', 'vikram-rice-rabi-2025', 'rajesh-wheat-rabi-2025-rejected',
      'raju-onion-kharif-2026',
      'ramesh-livestock-cow-001', 'vikram-livestock-buffalo-002', 'rajesh-livestock-cow-003',
      'lakshmi-livestock-cow-004', 'kumar-livestock-bullock-005',
      'ramesh-weather-wheat-2025', 'vikram-weather-rice-2026', 'raju-weather-cotton-2026',
      'lakshmi-weather-wheat-2025', 'kumar-weather-rice-2026',
    ].map((s) => uuidFor(s));

    await queryInterface.sequelize.query(
      `DELETE FROM insurance_enrollments WHERE enrollment_uuid IN (?)`,
      { replacements: [allUuids] },
    );
    await queryInterface.sequelize.query(
      `DELETE FROM loan_insurance_bundled WHERE application_id IN (1, 2, 3)`,
    );
  },
};
