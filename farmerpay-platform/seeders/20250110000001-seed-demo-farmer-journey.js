'use strict';

/**
 * Demo Farmer Journey Seeder — 5 Karnataka farmers at different stages
 * of the Rabi 2025-26 wheat season.
 *
 * Story:
 *   1. Raju Gowda   — On Track, model borrower, 7/10 touchpoints
 *   2. Lakshmi Devi  — At Risk, some deviations, 5/10 touchpoints
 *   3. Kumar Naik    — Off Track, serious issues, SMA-1, 3/10 touchpoints
 *   4. Manjunath     — Completed cycle, loan repaid, 10/10 touchpoints
 *   5. Savitri Bai   — Gold loan, just started, 2/10 touchpoints
 *
 * Depends on: 20250109000001-seed-full-demo-data.js (commodities, mandis, loan products).
 * Re-runnable: uses ignoreDuplicates on every bulkInsert.
 */

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const dup = { ignoreDuplicates: true };

    // ── Password hash for 'Farmer@123' (bcrypt, 12 rounds) ──
    const PWD_HASH = '$2b$12$LJ3m4ys3GZwgR8JU1FP5/.mGlHx8kBBhIQZcQEqYkFCCFV1hLDBQu';
    // ── MPIN hash for '5678' (bcrypt, 12 rounds) — farmer mobile+MPIN login ──
    // NOTE: '1234' was rejected by the login validator (trivial PIN). Use '5678'.
    const MPIN_HASH = '$2a$12$6K6nTlorWR9EJNZynqgiPumR8BN.JH3Xeh9Nomx3R0DNNnPB5E2HS';

    // ── Helper: generate a v4-style UUID deterministically from a prefix ──
    const uuid = (prefix) => prefix; // we use readable slugs as UUIDs for demo

    // ══════════════════════════════════════════════════════════════
    // 1. USERS
    // ══════════════════════════════════════════════════════════════
    await queryInterface.bulkInsert('users', [
      {
        user_id: 'USR-RAJU-GOWDA-001',
        email: 'raju.gowda@demo.farmerpay.in',
        mobile: '+919876543210',
        password_hash: PWD_HASH,
        mpin_hash: MPIN_HASH,
        first_name: 'Raju',
        last_name: 'Gowda',
        date_of_birth: '1985-06-15',
        gender: 'male',
        is_email_verified: false,
        is_mobile_verified: true,
        is_active: true,
        created_at: new Date('2025-11-01'),
        updated_at: now,
      },
      {
        user_id: 'USR-LAKSHMI-DEVI-002',
        email: 'lakshmi.devi@demo.farmerpay.in',
        mobile: '+919876543211',
        password_hash: PWD_HASH,
        mpin_hash: MPIN_HASH,
        first_name: 'Lakshmi',
        last_name: 'Devi',
        date_of_birth: '1990-03-22',
        gender: 'female',
        is_email_verified: false,
        is_mobile_verified: true,
        is_active: true,
        created_at: new Date('2025-11-05'),
        updated_at: now,
      },
      {
        user_id: 'USR-KUMAR-NAIK-003',
        email: 'kumar.naik@demo.farmerpay.in',
        mobile: '+919876543212',
        password_hash: PWD_HASH,
        mpin_hash: MPIN_HASH,
        first_name: 'Kumar',
        last_name: 'Naik',
        date_of_birth: '1978-09-10',
        gender: 'male',
        is_email_verified: false,
        is_mobile_verified: true,
        is_active: true,
        created_at: new Date('2025-11-08'),
        updated_at: now,
      },
      {
        user_id: 'USR-MANJUNATH-004',
        email: 'manjunath@demo.farmerpay.in',
        mobile: '+919876543213',
        password_hash: PWD_HASH,
        mpin_hash: MPIN_HASH,
        first_name: 'Manjunath',
        last_name: 'Reddy',
        date_of_birth: '1982-01-30',
        gender: 'male',
        is_email_verified: false,
        is_mobile_verified: true,
        is_active: true,
        created_at: new Date('2025-10-20'),
        updated_at: now,
      },
      {
        user_id: 'USR-SAVITRI-BAI-005',
        email: 'savitri.bai@demo.farmerpay.in',
        mobile: '+919876543214',
        password_hash: PWD_HASH,
        mpin_hash: MPIN_HASH,
        first_name: 'Savitri',
        last_name: 'Bai',
        date_of_birth: '1992-12-05',
        gender: 'female',
        is_email_verified: false,
        is_mobile_verified: true,
        is_active: true,
        created_at: new Date('2026-01-10'),
        updated_at: now,
      },
    ], dup);

    // ── Look up auto-generated IDs for the 5 farmers ──
    const [farmerRows] = await queryInterface.sequelize.query(
      `SELECT id, user_id FROM users WHERE user_id IN (
        'USR-RAJU-GOWDA-001', 'USR-LAKSHMI-DEVI-002', 'USR-KUMAR-NAIK-003',
        'USR-MANJUNATH-004', 'USR-SAVITRI-BAI-005'
      )`
    );
    const farmerMap = {};
    farmerRows.forEach((r) => { farmerMap[r.user_id] = r.id; });

    const rajuId      = farmerMap['USR-RAJU-GOWDA-001'];
    const lakshmiId   = farmerMap['USR-LAKSHMI-DEVI-002'];
    const kumarId     = farmerMap['USR-KUMAR-NAIK-003'];
    const manjunathId = farmerMap['USR-MANJUNATH-004'];
    const savitriId   = farmerMap['USR-SAVITRI-BAI-005'];

    // Safety check
    if (!rajuId || !lakshmiId || !kumarId || !manjunathId || !savitriId) {
      console.warn('[seed-demo-farmer-journey] Could not resolve all farmer IDs. Aborting.');
      return;
    }

    // ══════════════════════════════════════════════════════════════
    // 2. FARMER PROFILES
    // ══════════════════════════════════════════════════════════════
    await queryInterface.bulkInsert('farmer_profiles', [
      {
        farmer_id: rajuId,
        profile_uuid: 'FP-RAJU-GOWDA-001',
        full_name: 'Raju Gowda',
        date_of_birth: '1985-06-15',
        gender: 'male',
        father_name: 'Basavanna Gowda',
        education_level: 'higher_secondary',
        marital_status: 'married',
        land_ownership_type: 'owned',
        total_farm_size_hectares: 5.0000,
        primary_crop: 'Wheat',
        secondary_crops: 'Ragi, Jowar',
        years_farming_experience: 18,
        onboarding_status: 'completed',
        onboarding_completed_at: new Date('2025-11-05'),
        profile_completeness_percentage: 100,
        bank_account_verified: true,
        is_active: true,
        created_at: new Date('2025-11-01'),
        updated_at: now,
      },
      {
        farmer_id: lakshmiId,
        profile_uuid: 'FP-LAKSHMI-DEVI-002',
        full_name: 'Lakshmi Devi',
        date_of_birth: '1990-03-22',
        gender: 'female',
        father_name: 'Ramaiah',
        education_level: 'primary',
        marital_status: 'married',
        land_ownership_type: 'owned',
        total_farm_size_hectares: 3.0000,
        primary_crop: 'Wheat',
        secondary_crops: 'Groundnut',
        years_farming_experience: 10,
        onboarding_status: 'completed',
        onboarding_completed_at: new Date('2025-11-10'),
        profile_completeness_percentage: 100,
        bank_account_verified: true,
        is_active: true,
        created_at: new Date('2025-11-05'),
        updated_at: now,
      },
      {
        farmer_id: kumarId,
        profile_uuid: 'FP-KUMAR-NAIK-003',
        full_name: 'Kumar Naik',
        date_of_birth: '1978-09-10',
        gender: 'male',
        father_name: 'Shivappa Naik',
        education_level: 'secondary',
        marital_status: 'married',
        land_ownership_type: 'owned',
        total_farm_size_hectares: 8.0000,
        primary_crop: 'Wheat',
        secondary_crops: 'Sugarcane',
        years_farming_experience: 25,
        onboarding_status: 'completed',
        onboarding_completed_at: new Date('2025-11-12'),
        profile_completeness_percentage: 100,
        bank_account_verified: true,
        is_active: true,
        created_at: new Date('2025-11-08'),
        updated_at: now,
      },
      {
        farmer_id: manjunathId,
        profile_uuid: 'FP-MANJUNATH-004',
        full_name: 'Manjunath Reddy',
        date_of_birth: '1982-01-30',
        gender: 'male',
        father_name: 'Thimma Reddy',
        education_level: 'graduate',
        marital_status: 'married',
        land_ownership_type: 'owned',
        total_farm_size_hectares: 4.0000,
        primary_crop: 'Wheat',
        secondary_crops: 'Maize',
        years_farming_experience: 15,
        onboarding_status: 'completed',
        onboarding_completed_at: new Date('2025-10-25'),
        profile_completeness_percentage: 100,
        bank_account_verified: true,
        is_active: true,
        created_at: new Date('2025-10-20'),
        updated_at: now,
      },
      {
        farmer_id: savitriId,
        profile_uuid: 'FP-SAVITRI-BAI-005',
        full_name: 'Savitri Bai',
        date_of_birth: '1992-12-05',
        gender: 'female',
        father_name: 'Hanumantappa',
        education_level: 'primary',
        marital_status: 'married',
        land_ownership_type: 'leased',
        total_farm_size_hectares: 2.0000,
        primary_crop: 'Wheat',
        secondary_crops: null,
        years_farming_experience: 6,
        onboarding_status: 'completed',
        onboarding_completed_at: new Date('2026-01-14'),
        profile_completeness_percentage: 100,
        bank_account_verified: true,
        is_active: true,
        created_at: new Date('2026-01-10'),
        updated_at: now,
      },
    ], dup);

    // ══════════════════════════════════════════════════════════════
    // 3. FARMER ADDRESSES
    // ══════════════════════════════════════════════════════════════
    await queryInterface.bulkInsert('farmer_addresses', [
      {
        farmer_id: rajuId,
        address_type: 'permanent',
        lgd_state_id: null,
        lgd_district_id: null,
        street_address: 'H.No. 45, Gandhinagar, T. Narasipura Taluk',
        postal_code: '571124',
        latitude: 12.21000000,
        longitude: 76.90000000,
        is_primary_address: true,
        address_verified_by_agent: true,
        agent_verification_timestamp: new Date('2025-11-03'),
        is_active: true,
        created_at: new Date('2025-11-01'),
        updated_at: now,
      },
      {
        farmer_id: lakshmiId,
        address_type: 'permanent',
        lgd_state_id: null,
        lgd_district_id: null,
        street_address: 'Survey No. 112/3, Maddur Hobli, Mandya Taluk',
        postal_code: '571428',
        latitude: 12.58000000,
        longitude: 76.89000000,
        is_primary_address: true,
        address_verified_by_agent: true,
        agent_verification_timestamp: new Date('2025-11-08'),
        is_active: true,
        created_at: new Date('2025-11-05'),
        updated_at: now,
      },
      {
        farmer_id: kumarId,
        address_type: 'permanent',
        lgd_state_id: null,
        lgd_district_id: null,
        street_address: 'Plot 8, Hunsur Road, Mysuru South',
        postal_code: '570008',
        latitude: 12.28000000,
        longitude: 76.60000000,
        is_primary_address: true,
        address_verified_by_agent: true,
        agent_verification_timestamp: new Date('2025-11-10'),
        is_active: true,
        created_at: new Date('2025-11-08'),
        updated_at: now,
      },
      {
        farmer_id: manjunathId,
        address_type: 'permanent',
        lgd_state_id: null,
        lgd_district_id: null,
        street_address: 'Sy. No. 78, Bannur Road, Mysuru Taluk',
        postal_code: '570015',
        latitude: 12.25000000,
        longitude: 76.70000000,
        is_primary_address: true,
        address_verified_by_agent: true,
        agent_verification_timestamp: new Date('2025-10-22'),
        is_active: true,
        created_at: new Date('2025-10-20'),
        updated_at: now,
      },
      {
        farmer_id: savitriId,
        address_type: 'permanent',
        lgd_state_id: null,
        lgd_district_id: null,
        street_address: 'Near Govt. School, Nagamangala Taluk, Mandya',
        postal_code: '571432',
        latitude: 12.82000000,
        longitude: 76.76000000,
        is_primary_address: true,
        address_verified_by_agent: true,
        agent_verification_timestamp: new Date('2026-01-12'),
        is_active: true,
        created_at: new Date('2026-01-10'),
        updated_at: now,
      },
    ], dup);

    // ══════════════════════════════════════════════════════════════
    // 4. FARMER BANK ACCOUNTS
    // ══════════════════════════════════════════════════════════════
    await queryInterface.bulkInsert('farmer_bank_accounts', [
      {
        farmer_id: rajuId,
        account_holder_name: 'Raju Gowda',
        bank_name: 'State Bank of India',
        account_number: 'ENC-SBI-38291047561',
        account_number_masked: 'XXXX XXXX 7561',
        ifsc_code: 'SBIN0001234',
        account_type: 'savings',
        is_primary_account: true,
        verified_at: new Date('2025-11-02'),
        verification_method: 'api',
        is_active: true,
        created_at: new Date('2025-11-01'),
        updated_at: now,
      },
      {
        farmer_id: lakshmiId,
        account_holder_name: 'Lakshmi Devi',
        bank_name: 'State Bank of India',
        account_number: 'ENC-SBI-38291047562',
        account_number_masked: 'XXXX XXXX 7562',
        ifsc_code: 'SBIN0001234',
        account_type: 'savings',
        is_primary_account: true,
        verified_at: new Date('2025-11-07'),
        verification_method: 'api',
        is_active: true,
        created_at: new Date('2025-11-05'),
        updated_at: now,
      },
      {
        farmer_id: kumarId,
        account_holder_name: 'Kumar Naik',
        bank_name: 'State Bank of India',
        account_number: 'ENC-SBI-38291047563',
        account_number_masked: 'XXXX XXXX 7563',
        ifsc_code: 'SBIN0001234',
        account_type: 'savings',
        is_primary_account: true,
        verified_at: new Date('2025-11-09'),
        verification_method: 'api',
        is_active: true,
        created_at: new Date('2025-11-08'),
        updated_at: now,
      },
      {
        farmer_id: manjunathId,
        account_holder_name: 'Manjunath Reddy',
        bank_name: 'State Bank of India',
        account_number: 'ENC-SBI-38291047564',
        account_number_masked: 'XXXX XXXX 7564',
        ifsc_code: 'SBIN0001234',
        account_type: 'savings',
        is_primary_account: true,
        verified_at: new Date('2025-10-21'),
        verification_method: 'api',
        is_active: true,
        created_at: new Date('2025-10-20'),
        updated_at: now,
      },
      {
        farmer_id: savitriId,
        account_holder_name: 'Savitri Bai',
        bank_name: 'State Bank of India',
        account_number: 'ENC-SBI-38291047565',
        account_number_masked: 'XXXX XXXX 7565',
        ifsc_code: 'SBIN0001234',
        account_type: 'savings',
        is_primary_account: true,
        verified_at: new Date('2026-01-11'),
        verification_method: 'api',
        is_active: true,
        created_at: new Date('2026-01-10'),
        updated_at: now,
      },
    ], dup);

    // ── Look up the KCC wheat loan product ──
    const [prodRows] = await queryInterface.sequelize.query(
      `SELECT id FROM loan_products WHERE product_uuid = 'LPROD-KCC-WHEAT-001' LIMIT 1`
    );
    const kccWheatProductId = prodRows.length ? prodRows[0].id : 1;

    // ══════════════════════════════════════════════════════════════
    // 5. LOAN APPLICATIONS
    // ══════════════════════════════════════════════════════════════
    await queryInterface.bulkInsert('loan_applications', [
      // Farmer 1: Raju Gowda — 5 ha x 25,000 = 1,25,000 — disbursed
      {
        application_uuid: 'LA-RAJU-KCC-001',
        farmer_id: rajuId,
        loan_product_id: kccWheatProductId,
        apply_for_amount: 125000.00,
        apply_for_tenure_months: 12,
        intended_use: 'Rabi wheat cultivation — seeds, fertiliser, labour, machinery for 5 hectares',
        existing_loan_balance: 0,
        application_status: 'disbursed',
        applied_at: new Date('2025-11-10'),
        approval_amount: 125000.00,
        approval_interest_rate: 4.000,
        approval_tenure_months: 12,
        approved_at: new Date('2025-11-18'),
        risk_score: 22.50,
        sof_cost_per_hectare: 25000.00,
        nabard_benchmark_per_hectare: 23500.00,
        calculated_recommended_amount: 125000.00,
        input_cost_breakdown: JSON.stringify({
          seeds: 15000, fertiliser: 27500, pesticide: 7500,
          labour: 40000, machinery: 22500, other: 12500,
        }),
        amount_above_sof: 0,
        sizing_method: 'input_cost_based',
        is_active: true,
        created_at: new Date('2025-11-10'),
        updated_at: now,
      },
      // Farmer 2: Lakshmi Devi — 3 ha x 25,000 = 75,000 — disbursed
      {
        application_uuid: 'LA-LAKSHMI-KCC-002',
        farmer_id: lakshmiId,
        loan_product_id: kccWheatProductId,
        apply_for_amount: 75000.00,
        apply_for_tenure_months: 12,
        intended_use: 'Rabi wheat cultivation for 3 hectares — Mandya district',
        existing_loan_balance: 0,
        application_status: 'disbursed',
        applied_at: new Date('2025-11-15'),
        approval_amount: 75000.00,
        approval_interest_rate: 4.000,
        approval_tenure_months: 12,
        approved_at: new Date('2025-11-22'),
        risk_score: 38.00,
        sof_cost_per_hectare: 25000.00,
        nabard_benchmark_per_hectare: 23500.00,
        calculated_recommended_amount: 75000.00,
        input_cost_breakdown: JSON.stringify({
          seeds: 9000, fertiliser: 16500, pesticide: 4500,
          labour: 24000, machinery: 13500, other: 7500,
        }),
        amount_above_sof: 0,
        sizing_method: 'input_cost_based',
        is_active: true,
        created_at: new Date('2025-11-15'),
        updated_at: now,
      },
      // Farmer 3: Kumar Naik — 8 ha x 25,000 = 2,00,000 — disbursed
      {
        application_uuid: 'LA-KUMAR-KCC-003',
        farmer_id: kumarId,
        loan_product_id: kccWheatProductId,
        apply_for_amount: 200000.00,
        apply_for_tenure_months: 12,
        intended_use: 'Rabi wheat cultivation for 8 hectares — large holding, Mysuru',
        existing_loan_balance: 0,
        application_status: 'disbursed',
        applied_at: new Date('2025-11-12'),
        approval_amount: 200000.00,
        approval_interest_rate: 5.500,
        approval_tenure_months: 12,
        approved_at: new Date('2025-11-20'),
        risk_score: 62.00,
        sof_cost_per_hectare: 25000.00,
        nabard_benchmark_per_hectare: 23500.00,
        calculated_recommended_amount: 200000.00,
        input_cost_breakdown: JSON.stringify({
          seeds: 24000, fertiliser: 44000, pesticide: 12000,
          labour: 64000, machinery: 36000, other: 20000,
        }),
        amount_above_sof: 0,
        sizing_method: 'input_cost_based',
        is_active: true,
        created_at: new Date('2025-11-12'),
        updated_at: now,
      },
      // Farmer 4: Manjunath — 4 ha x 25,000 = 1,00,000 — closed (repaid)
      {
        application_uuid: 'LA-MANJUNATH-KCC-004',
        farmer_id: manjunathId,
        loan_product_id: kccWheatProductId,
        apply_for_amount: 100000.00,
        apply_for_tenure_months: 12,
        intended_use: 'Rabi wheat cultivation for 4 hectares — full cycle completed',
        existing_loan_balance: 0,
        application_status: 'closed',
        applied_at: new Date('2025-10-28'),
        approval_amount: 100000.00,
        approval_interest_rate: 4.000,
        approval_tenure_months: 12,
        approved_at: new Date('2025-11-05'),
        risk_score: 15.00,
        sof_cost_per_hectare: 25000.00,
        nabard_benchmark_per_hectare: 23500.00,
        calculated_recommended_amount: 100000.00,
        input_cost_breakdown: JSON.stringify({
          seeds: 12000, fertiliser: 22000, pesticide: 6000,
          labour: 32000, machinery: 18000, other: 10000,
        }),
        amount_above_sof: 0,
        sizing_method: 'input_cost_based',
        is_active: true,
        created_at: new Date('2025-10-28'),
        updated_at: now,
      },
      // Farmer 5: Savitri Bai — gold loan 50,000 — disbursed
      {
        application_uuid: 'LA-SAVITRI-GOLD-005',
        farmer_id: savitriId,
        loan_product_id: kccWheatProductId,
        apply_for_amount: 50000.00,
        apply_for_tenure_months: 12,
        intended_use: 'Rabi wheat cultivation for 2 hectares — gold-backed loan',
        existing_loan_balance: 0,
        application_status: 'disbursed',
        applied_at: new Date('2026-01-15'),
        approval_amount: 50000.00,
        approval_interest_rate: 7.000,
        approval_tenure_months: 12,
        approved_at: new Date('2026-01-20'),
        risk_score: 30.00,
        sof_cost_per_hectare: 25000.00,
        nabard_benchmark_per_hectare: 23500.00,
        calculated_recommended_amount: 50000.00,
        input_cost_breakdown: JSON.stringify({
          seeds: 6000, fertiliser: 11000, pesticide: 3000,
          labour: 16000, machinery: 9000, other: 5000,
        }),
        amount_above_sof: 0,
        sizing_method: 'input_cost_based',
        is_active: true,
        created_at: new Date('2026-01-15'),
        updated_at: now,
      },
    ], dup);

    // ── Look up auto-generated loan application IDs ──
    const [loanRows] = await queryInterface.sequelize.query(
      `SELECT id, application_uuid FROM loan_applications WHERE application_uuid IN (
        'LA-RAJU-KCC-001', 'LA-LAKSHMI-KCC-002', 'LA-KUMAR-KCC-003',
        'LA-MANJUNATH-KCC-004', 'LA-SAVITRI-GOLD-005'
      )`
    );
    const loanMap = {};
    loanRows.forEach((r) => { loanMap[r.application_uuid] = r.id; });

    const rajuLoanId      = loanMap['LA-RAJU-KCC-001'];
    const lakshmiLoanId   = loanMap['LA-LAKSHMI-KCC-002'];
    const kumarLoanId     = loanMap['LA-KUMAR-KCC-003'];
    const manjunathLoanId = loanMap['LA-MANJUNATH-KCC-004'];
    const savitriLoanId   = loanMap['LA-SAVITRI-GOLD-005'];

    // ══════════════════════════════════════════════════════════════
    // 6. POP COMPLIANCE SNAPSHOTS
    // ══════════════════════════════════════════════════════════════
    // Helper to build touchpoint_scores array
    const buildTouchpoints = (completedCount, baseScores) => {
      const wordbands = [
        'Land Preparation', 'Seed Selection & Treatment', 'Sowing',
        'First Irrigation', 'Fertiliser Application (Basal)', 'Weed Management',
        'Pest & Disease Control', 'Second Fertiliser (Top Dressing)',
        'Harvest Readiness', 'Harvest & Post-Harvest',
      ];
      return wordbands.map((name, i) => {
        if (i < completedCount) {
          const scores = baseScores[i] || { task: 80, input: 75, cost: 70, timing: 85 };
          const tp = Math.round((scores.task + scores.input + scores.cost + scores.timing) / 4);
          return {
            workband_order: i + 1,
            workband_name: name,
            task_score: scores.task,
            input_score: scores.input,
            cost_score: scores.cost,
            timing_score: scores.timing,
            touchpoint_score: tp,
            completed_at: new Date(2025, 10 + Math.floor(i / 3), 10 + (i * 5)).toISOString(),
            status: 'completed',
          };
        }
        return {
          workband_order: i + 1,
          workband_name: name,
          task_score: null,
          input_score: null,
          cost_score: null,
          timing_score: null,
          touchpoint_score: null,
          completed_at: null,
          status: 'pending',
        };
      });
    };

    // Farmer 1 — Raju: 7/10 done, overall 82, on_track
    const rajuTouchpoints = buildTouchpoints(7, [
      { task: 90, input: 85, cost: 80, timing: 92 },
      { task: 88, input: 82, cost: 78, timing: 88 },
      { task: 85, input: 80, cost: 82, timing: 85 },
      { task: 82, input: 78, cost: 75, timing: 80 },
      { task: 80, input: 85, cost: 78, timing: 82 },
      { task: 78, input: 76, cost: 80, timing: 78 },
      { task: 82, input: 80, cost: 76, timing: 84 },
    ]);

    // Farmer 2 — Lakshmi: 5/10 done, overall 55, at_risk
    const lakshmiTouchpoints = buildTouchpoints(5, [
      { task: 70, input: 65, cost: 50, timing: 72 },
      { task: 65, input: 60, cost: 45, timing: 68 },
      { task: 60, input: 55, cost: 42, timing: 58 },
      { task: 55, input: 50, cost: 40, timing: 52 },
      { task: 50, input: 48, cost: 38, timing: 50 },
    ]);

    // Farmer 3 — Kumar: 3/10 done, overall 28, off_track
    const kumarTouchpoints = buildTouchpoints(3, [
      { task: 40, input: 35, cost: 25, timing: 30 },
      { task: 35, input: 30, cost: 20, timing: 25 },
      { task: 28, input: 22, cost: 18, timing: 20 },
    ]);

    // Farmer 4 — Manjunath: 10/10 done, overall 91, on_track
    const manjunathTouchpoints = buildTouchpoints(10, [
      { task: 95, input: 92, cost: 90, timing: 96 },
      { task: 94, input: 90, cost: 88, timing: 94 },
      { task: 92, input: 88, cost: 90, timing: 92 },
      { task: 90, input: 92, cost: 88, timing: 90 },
      { task: 92, input: 90, cost: 85, timing: 92 },
      { task: 88, input: 86, cost: 88, timing: 90 },
      { task: 90, input: 88, cost: 86, timing: 88 },
      { task: 92, input: 90, cost: 90, timing: 92 },
      { task: 90, input: 88, cost: 92, timing: 90 },
      { task: 94, input: 92, cost: 90, timing: 95 },
    ]);

    // Farmer 5 — Savitri: 2/10 done, overall 70, on_track
    const savitriTouchpoints = buildTouchpoints(2, [
      { task: 75, input: 70, cost: 68, timing: 72 },
      { task: 72, input: 68, cost: 65, timing: 70 },
    ]);

    await queryInterface.bulkInsert('pop_compliance_snapshots', [
      {
        snapshot_uuid: 'PCS-RAJU-001',
        cycle_id: 'CYCLE-RAJU-RABI-2526',
        farmer_id: rajuId,
        pop_id: null,
        sof_id: null,
        touchpoint_scores: JSON.stringify(rajuTouchpoints),
        timeliness_score: 84,
        task_completion_score: 84,
        input_compliance_score: 81,
        cost_vs_sof_score: 78,
        overall_compliance_score: 82,
        compliance_status: 'on_track',
        touchpoints_completed: 7,
        touchpoints_total: 10,
        sof_cost_per_hectare: 25000.00,
        actual_cost_per_hectare: 24200.00,
        cost_deviation_percent: -3.20,
        deviations: null,
        calculated_at: new Date('2026-02-20'),
        is_active: true,
        created_at: new Date('2025-11-15'),
        updated_at: now,
      },
      {
        snapshot_uuid: 'PCS-LAKSHMI-002',
        cycle_id: 'CYCLE-LAKSHMI-RABI-2526',
        farmer_id: lakshmiId,
        pop_id: null,
        sof_id: null,
        touchpoint_scores: JSON.stringify(lakshmiTouchpoints),
        timeliness_score: 60,
        task_completion_score: 60,
        input_compliance_score: 56,
        cost_vs_sof_score: 43,
        overall_compliance_score: 55,
        compliance_status: 'at_risk',
        touchpoints_completed: 5,
        touchpoints_total: 10,
        sof_cost_per_hectare: 25000.00,
        actual_cost_per_hectare: 32500.00,
        cost_deviation_percent: 30.00,
        deviations: JSON.stringify([
          {
            dimension: 'cost',
            item: 'Input costs 30% above SoF norms',
            expected: 75000,
            actual: 97500,
            variance: 22500,
            severity: 'high',
          },
          {
            dimension: 'timeliness',
            item: 'Fertiliser application delayed by 12 days',
            expected: '2025-12-20',
            actual: '2026-01-01',
            variance: '12 days',
            severity: 'medium',
          },
          {
            dimension: 'timeliness',
            item: 'Weed management delayed by 8 days',
            expected: '2026-01-10',
            actual: '2026-01-18',
            variance: '8 days',
            severity: 'medium',
          },
          {
            dimension: 'input',
            item: 'Field size mismatch — reported 3 ha, SATHI measured 2.6 ha',
            expected: 3.0,
            actual: 2.6,
            variance: 0.4,
            severity: 'high',
          },
        ]),
        calculated_at: new Date('2026-02-10'),
        is_active: true,
        created_at: new Date('2025-11-20'),
        updated_at: now,
      },
      {
        snapshot_uuid: 'PCS-KUMAR-003',
        cycle_id: 'CYCLE-KUMAR-RABI-2526',
        farmer_id: kumarId,
        pop_id: null,
        sof_id: null,
        touchpoint_scores: JSON.stringify(kumarTouchpoints),
        timeliness_score: 25,
        task_completion_score: 30,
        input_compliance_score: 29,
        cost_vs_sof_score: 21,
        overall_compliance_score: 28,
        compliance_status: 'off_track',
        touchpoints_completed: 3,
        touchpoints_total: 10,
        sof_cost_per_hectare: 25000.00,
        actual_cost_per_hectare: 37500.00,
        cost_deviation_percent: 50.00,
        deviations: JSON.stringify([
          {
            dimension: 'cost',
            item: 'Input costs 50% above SoF norms — excessive labour and machinery spending',
            expected: 200000,
            actual: 300000,
            variance: 100000,
            severity: 'critical',
          },
          {
            dimension: 'task_completion',
            item: 'Missed 4 scheduled tasks — weed management, pest control, 2nd fertiliser, harvest readiness',
            expected: 7,
            actual: 3,
            variance: 4,
            severity: 'critical',
          },
          {
            dimension: 'timeliness',
            item: 'Inactive for 18 days — last activity recorded on 2026-01-15',
            expected: '2026-02-02',
            actual: null,
            variance: '18 days inactive',
            severity: 'critical',
          },
          {
            dimension: 'input',
            item: 'Sowing density 40% below recommended — poor germination expected',
            expected: 100,
            actual: 60,
            variance: 40,
            severity: 'high',
          },
          {
            dimension: 'input',
            item: 'SATHI contradiction — claimed 8 ha under cultivation, satellite shows 5.2 ha active',
            expected: 8.0,
            actual: 5.2,
            variance: 2.8,
            severity: 'critical',
          },
        ]),
        calculated_at: new Date('2026-02-02'),
        is_active: true,
        created_at: new Date('2025-11-18'),
        updated_at: now,
      },
      {
        snapshot_uuid: 'PCS-MANJUNATH-004',
        cycle_id: 'CYCLE-MANJUNATH-RABI-2526',
        farmer_id: manjunathId,
        pop_id: null,
        sof_id: null,
        touchpoint_scores: JSON.stringify(manjunathTouchpoints),
        timeliness_score: 92,
        task_completion_score: 92,
        input_compliance_score: 90,
        cost_vs_sof_score: 89,
        overall_compliance_score: 91,
        compliance_status: 'on_track',
        touchpoints_completed: 10,
        touchpoints_total: 10,
        sof_cost_per_hectare: 25000.00,
        actual_cost_per_hectare: 24000.00,
        cost_deviation_percent: -4.00,
        deviations: null,
        calculated_at: new Date('2026-03-15'),
        is_active: true,
        created_at: new Date('2025-11-01'),
        updated_at: now,
      },
      {
        snapshot_uuid: 'PCS-SAVITRI-005',
        cycle_id: 'CYCLE-SAVITRI-RABI-2526',
        farmer_id: savitriId,
        pop_id: null,
        sof_id: null,
        touchpoint_scores: JSON.stringify(savitriTouchpoints),
        timeliness_score: 71,
        task_completion_score: 74,
        input_compliance_score: 69,
        cost_vs_sof_score: 67,
        overall_compliance_score: 70,
        compliance_status: 'on_track',
        touchpoints_completed: 2,
        touchpoints_total: 10,
        sof_cost_per_hectare: 25000.00,
        actual_cost_per_hectare: 26000.00,
        cost_deviation_percent: 4.00,
        deviations: null,
        calculated_at: new Date('2026-02-01'),
        is_active: true,
        created_at: new Date('2026-01-18'),
        updated_at: now,
      },
    ], dup);

    // ══════════════════════════════════════════════════════════════
    // 7. TRUST SCORE HISTORIES
    // ══════════════════════════════════════════════════════════════
    await queryInterface.bulkInsert('trust_score_history', [
      {
        score_history_uuid: 'TSH-RAJU-001',
        farmer_id: rajuId,
        total_trust_score: 720,
        score_band: 'good',
        score_band_min: 600,
        score_band_max: 749,
        section_scores: JSON.stringify({
          identity_verification: 88,
          farm_data_consistency: 82,
          financial_behaviour: 75,
          pop_compliance: 82,
          community_trust: 70,
        }),
        calculated_at: new Date('2026-02-20'),
        is_active: true,
        created_at: new Date('2026-02-20'),
        updated_at: now,
      },
      {
        score_history_uuid: 'TSH-LAKSHMI-002',
        farmer_id: lakshmiId,
        total_trust_score: 550,
        score_band: 'good',
        score_band_min: 450,
        score_band_max: 599,
        section_scores: JSON.stringify({
          identity_verification: 78,
          farm_data_consistency: 50,
          financial_behaviour: 55,
          pop_compliance: 55,
          community_trust: 62,
        }),
        calculated_at: new Date('2026-02-10'),
        is_active: true,
        created_at: new Date('2026-02-10'),
        updated_at: now,
      },
      {
        score_history_uuid: 'TSH-KUMAR-003',
        farmer_id: kumarId,
        total_trust_score: 320,
        score_band: 'fair',
        score_band_min: 300,
        score_band_max: 449,
        section_scores: JSON.stringify({
          identity_verification: 65,
          farm_data_consistency: 25,
          financial_behaviour: 30,
          pop_compliance: 28,
          community_trust: 40,
        }),
        calculated_at: new Date('2026-02-02'),
        is_active: true,
        created_at: new Date('2026-02-02'),
        updated_at: now,
      },
      {
        score_history_uuid: 'TSH-MANJUNATH-004',
        farmer_id: manjunathId,
        total_trust_score: 810,
        score_band: 'excellent',
        score_band_min: 750,
        score_band_max: 900,
        section_scores: JSON.stringify({
          identity_verification: 92,
          farm_data_consistency: 90,
          financial_behaviour: 88,
          pop_compliance: 91,
          community_trust: 85,
        }),
        calculated_at: new Date('2026-03-15'),
        is_active: true,
        created_at: new Date('2026-03-15'),
        updated_at: now,
      },
      {
        score_history_uuid: 'TSH-SAVITRI-005',
        farmer_id: savitriId,
        total_trust_score: 480,
        score_band: 'fair',
        score_band_min: 300,
        score_band_max: 449,
        section_scores: JSON.stringify({
          identity_verification: 72,
          farm_data_consistency: 60,
          financial_behaviour: 45,
          pop_compliance: 70,
          community_trust: 50,
        }),
        calculated_at: new Date('2026-02-01'),
        is_active: true,
        created_at: new Date('2026-02-01'),
        updated_at: now,
      },
    ], dup);

    // ── Look up advisory type IDs ──
    const [advTypeRows] = await queryInterface.sequelize.query(
      `SELECT id, advisory_type_code FROM sage_advisory_types WHERE advisory_type_code IN (
        'weather_alert', 'pest_management', 'market_timing', 'input_application', 'loan_repayment'
      )`
    );
    const advTypeMap = {};
    advTypeRows.forEach((r) => { advTypeMap[r.advisory_type_code] = r.id; });

    // ══════════════════════════════════════════════════════════════
    // 8. SAGE ADVISORIES (3-5 per farmer)
    // ══════════════════════════════════════════════════════════════
    await queryInterface.bulkInsert('sage_advisories', [
      // ── Raju (5 advisories) ──
      {
        advisory_uuid: 'ADV-RAJU-001',
        farmer_id: rajuId,
        advisory_type_id: advTypeMap['market_timing'] || null,
        advisory_content: 'Wheat prices at Mysuru APMC have risen 8% in the last 15 days. Consider holding harvest for another 7 days for optimal price realisation of Rs 2,450-2,500/qtl.',
        advisory_language: 'en',
        advisory_urgency: 'medium',
        delivery_channel: 'in_app',
        delivered_at: new Date('2026-02-15'),
        acknowledged_at: new Date('2026-02-15'),
        action_taken_by_farmer: true,
        is_active: true,
        created_at: new Date('2026-02-15'),
        updated_at: now,
      },
      {
        advisory_uuid: 'ADV-RAJU-002',
        farmer_id: rajuId,
        advisory_type_id: advTypeMap['input_application'] || null,
        advisory_content: 'Top dressing of urea (50 kg/ha) recommended within next 5 days. Crown root initiation stage is optimal for nitrogen absorption.',
        advisory_language: 'en',
        advisory_urgency: 'high',
        delivery_channel: 'sms',
        delivered_at: new Date('2026-01-20'),
        acknowledged_at: new Date('2026-01-20'),
        action_taken_by_farmer: true,
        is_active: true,
        created_at: new Date('2026-01-20'),
        updated_at: now,
      },
      {
        advisory_uuid: 'ADV-RAJU-003',
        farmer_id: rajuId,
        advisory_type_id: advTypeMap['weather_alert'] || null,
        advisory_content: 'Heavy rainfall expected in Mysuru district on 28-29 Jan. Ensure drainage channels are clear. Delay any spray applications.',
        advisory_language: 'en',
        advisory_urgency: 'high',
        delivery_channel: 'push',
        delivered_at: new Date('2026-01-26'),
        acknowledged_at: new Date('2026-01-26'),
        action_taken_by_farmer: true,
        is_active: true,
        created_at: new Date('2026-01-26'),
        updated_at: now,
      },
      {
        advisory_uuid: 'ADV-RAJU-004',
        farmer_id: rajuId,
        advisory_type_id: advTypeMap['pest_management'] || null,
        advisory_content: 'Aphid infestation risk is moderate in your area. Scout your wheat fields and apply imidacloprid (0.3 ml/litre) if 10+ aphids per ear head are observed.',
        advisory_language: 'en',
        advisory_urgency: 'medium',
        delivery_channel: 'in_app',
        delivered_at: new Date('2026-02-05'),
        acknowledged_at: null,
        action_taken_by_farmer: false,
        is_active: true,
        created_at: new Date('2026-02-05'),
        updated_at: now,
      },
      {
        advisory_uuid: 'ADV-RAJU-005',
        farmer_id: rajuId,
        advisory_type_id: advTypeMap['loan_repayment'] || null,
        advisory_content: 'Your KCC loan repayment of Rs 1,25,000 is due on 2026-11-18. Timely repayment qualifies you for 2% interest subvention (effective rate: 2%).',
        advisory_language: 'en',
        advisory_urgency: 'low',
        delivery_channel: 'sms',
        delivered_at: new Date('2026-03-01'),
        acknowledged_at: new Date('2026-03-02'),
        action_taken_by_farmer: false,
        is_active: true,
        created_at: new Date('2026-03-01'),
        updated_at: now,
      },

      // ── Lakshmi (4 advisories) ──
      {
        advisory_uuid: 'ADV-LAKSHMI-001',
        farmer_id: lakshmiId,
        advisory_type_id: advTypeMap['input_application'] || null,
        advisory_content: 'Basal fertiliser application is overdue by 5 days. Apply DAP (50 kg/ha) immediately to avoid yield loss in your 3 hectare wheat plot.',
        advisory_language: 'en',
        advisory_urgency: 'high',
        delivery_channel: 'sms',
        delivered_at: new Date('2025-12-25'),
        acknowledged_at: new Date('2025-12-28'),
        action_taken_by_farmer: true,
        is_active: true,
        created_at: new Date('2025-12-25'),
        updated_at: now,
      },
      {
        advisory_uuid: 'ADV-LAKSHMI-002',
        farmer_id: lakshmiId,
        advisory_type_id: advTypeMap['market_timing'] || null,
        advisory_content: 'Wheat MSP for Rabi 2025-26 is Rs 2,275/qtl. Mandya APMC modal price is currently Rs 2,320/qtl. Government procurement centres are open till March 31.',
        advisory_language: 'en',
        advisory_urgency: 'medium',
        delivery_channel: 'in_app',
        delivered_at: new Date('2026-02-20'),
        acknowledged_at: null,
        action_taken_by_farmer: false,
        is_active: true,
        created_at: new Date('2026-02-20'),
        updated_at: now,
      },
      {
        advisory_uuid: 'ADV-LAKSHMI-003',
        farmer_id: lakshmiId,
        advisory_type_id: advTypeMap['weather_alert'] || null,
        advisory_content: 'Frost warning for Mandya district on Feb 8-9. Irrigate fields in the evening to protect wheat crop at tillering stage.',
        advisory_language: 'en',
        advisory_urgency: 'critical',
        delivery_channel: 'push',
        delivered_at: new Date('2026-02-06'),
        acknowledged_at: new Date('2026-02-06'),
        action_taken_by_farmer: true,
        is_active: true,
        created_at: new Date('2026-02-06'),
        updated_at: now,
      },
      {
        advisory_uuid: 'ADV-LAKSHMI-004',
        farmer_id: lakshmiId,
        advisory_type_id: advTypeMap['loan_repayment'] || null,
        advisory_content: 'Your input costs are 30% above the Scale of Finance norms. Review expenditure on labour and machinery to stay within loan utilisation guidelines.',
        advisory_language: 'en',
        advisory_urgency: 'high',
        delivery_channel: 'in_app',
        delivered_at: new Date('2026-02-12'),
        acknowledged_at: null,
        action_taken_by_farmer: false,
        is_active: true,
        created_at: new Date('2026-02-12'),
        updated_at: now,
      },

      // ── Kumar (3 advisories) ──
      {
        advisory_uuid: 'ADV-KUMAR-001',
        farmer_id: kumarId,
        advisory_type_id: advTypeMap['input_application'] || null,
        advisory_content: 'URGENT: You have missed 4 scheduled cultivation tasks. Please resume activities immediately to avoid further loan compliance deterioration.',
        advisory_language: 'en',
        advisory_urgency: 'critical',
        delivery_channel: 'sms',
        delivered_at: new Date('2026-01-25'),
        acknowledged_at: null,
        action_taken_by_farmer: false,
        is_active: true,
        created_at: new Date('2026-01-25'),
        updated_at: now,
      },
      {
        advisory_uuid: 'ADV-KUMAR-002',
        farmer_id: kumarId,
        advisory_type_id: advTypeMap['loan_repayment'] || null,
        advisory_content: 'Your loan account has been classified as SMA-1 due to 35 days of inactivity on your crop cycle. Contact your branch manager to discuss restructuring options.',
        advisory_language: 'en',
        advisory_urgency: 'critical',
        delivery_channel: 'push',
        delivered_at: new Date('2026-02-05'),
        acknowledged_at: null,
        action_taken_by_farmer: false,
        is_active: true,
        created_at: new Date('2026-02-05'),
        updated_at: now,
      },
      {
        advisory_uuid: 'ADV-KUMAR-003',
        farmer_id: kumarId,
        advisory_type_id: advTypeMap['pest_management'] || null,
        advisory_content: 'Yellow rust symptoms spotted in neighbouring fields. Inspect your wheat fields and apply propiconazole if infection is observed.',
        advisory_language: 'en',
        advisory_urgency: 'high',
        delivery_channel: 'sms',
        delivered_at: new Date('2026-01-15'),
        acknowledged_at: null,
        action_taken_by_farmer: false,
        is_active: true,
        created_at: new Date('2026-01-15'),
        updated_at: now,
      },

      // ── Manjunath (5 advisories — completed cycle) ──
      {
        advisory_uuid: 'ADV-MANJU-001',
        farmer_id: manjunathId,
        advisory_type_id: advTypeMap['market_timing'] || null,
        advisory_content: 'Congratulations on your harvest! Current Mysuru APMC wheat price is Rs 2,480/qtl. This is 9% above MSP. Recommended to sell within 7 days.',
        advisory_language: 'en',
        advisory_urgency: 'medium',
        delivery_channel: 'in_app',
        delivered_at: new Date('2026-03-10'),
        acknowledged_at: new Date('2026-03-10'),
        action_taken_by_farmer: true,
        is_active: true,
        created_at: new Date('2026-03-10'),
        updated_at: now,
      },
      {
        advisory_uuid: 'ADV-MANJU-002',
        farmer_id: manjunathId,
        advisory_type_id: advTypeMap['loan_repayment'] || null,
        advisory_content: 'Your KCC loan of Rs 1,00,000 has been fully repaid. You are eligible for a post-harvest top-up loan of up to Rs 1,50,000 at 4% interest.',
        advisory_language: 'en',
        advisory_urgency: 'low',
        delivery_channel: 'sms',
        delivered_at: new Date('2026-03-18'),
        acknowledged_at: new Date('2026-03-18'),
        action_taken_by_farmer: true,
        is_active: true,
        created_at: new Date('2026-03-18'),
        updated_at: now,
      },
      {
        advisory_uuid: 'ADV-MANJU-003',
        farmer_id: manjunathId,
        advisory_type_id: advTypeMap['weather_alert'] || null,
        advisory_content: 'Hot winds expected on March 5-7. Irrigate your wheat fields before the heat spell to prevent grain shrivelling at grain-fill stage.',
        advisory_language: 'en',
        advisory_urgency: 'high',
        delivery_channel: 'push',
        delivered_at: new Date('2026-03-03'),
        acknowledged_at: new Date('2026-03-03'),
        action_taken_by_farmer: true,
        is_active: true,
        created_at: new Date('2026-03-03'),
        updated_at: now,
      },
      {
        advisory_uuid: 'ADV-MANJU-004',
        farmer_id: manjunathId,
        advisory_type_id: advTypeMap['input_application'] || null,
        advisory_content: 'Final irrigation recommended 10 days before harvest. Soil moisture at 60% field capacity ensures easier combine operation and reduces grain moisture.',
        advisory_language: 'en',
        advisory_urgency: 'medium',
        delivery_channel: 'in_app',
        delivered_at: new Date('2026-02-25'),
        acknowledged_at: new Date('2026-02-25'),
        action_taken_by_farmer: true,
        is_active: true,
        created_at: new Date('2026-02-25'),
        updated_at: now,
      },
      {
        advisory_uuid: 'ADV-MANJU-005',
        farmer_id: manjunathId,
        advisory_type_id: advTypeMap['pest_management'] || null,
        advisory_content: 'Store harvested wheat in jute bags with neem leaf layering to prevent storage pests. Maintain godown moisture below 12%.',
        advisory_language: 'en',
        advisory_urgency: 'low',
        delivery_channel: 'in_app',
        delivered_at: new Date('2026-03-16'),
        acknowledged_at: new Date('2026-03-17'),
        action_taken_by_farmer: true,
        is_active: true,
        created_at: new Date('2026-03-16'),
        updated_at: now,
      },

      // ── Savitri (3 advisories — just started) ──
      {
        advisory_uuid: 'ADV-SAVITRI-001',
        farmer_id: savitriId,
        advisory_type_id: advTypeMap['input_application'] || null,
        advisory_content: 'Welcome to FarmerPay! Your land preparation checklist is ready. Apply 2 tonnes FYM per hectare before first ploughing for your 2 hectare wheat plot.',
        advisory_language: 'en',
        advisory_urgency: 'medium',
        delivery_channel: 'in_app',
        delivered_at: new Date('2026-01-18'),
        acknowledged_at: new Date('2026-01-18'),
        action_taken_by_farmer: true,
        is_active: true,
        created_at: new Date('2026-01-18'),
        updated_at: now,
      },
      {
        advisory_uuid: 'ADV-SAVITRI-002',
        farmer_id: savitriId,
        advisory_type_id: advTypeMap['weather_alert'] || null,
        advisory_content: 'Light rain expected in Mandya on Jan 22. Good time for sowing wheat after rain — soil moisture will be optimal for germination.',
        advisory_language: 'en',
        advisory_urgency: 'low',
        delivery_channel: 'push',
        delivered_at: new Date('2026-01-20'),
        acknowledged_at: new Date('2026-01-20'),
        action_taken_by_farmer: true,
        is_active: true,
        created_at: new Date('2026-01-20'),
        updated_at: now,
      },
      {
        advisory_uuid: 'ADV-SAVITRI-003',
        farmer_id: savitriId,
        advisory_type_id: advTypeMap['market_timing'] || null,
        advisory_content: 'Current wheat seed price at Mandya market: Rs 45/kg (HD-2967 variety). Recommended seed rate: 100 kg/ha for your 2 hectare field.',
        advisory_language: 'en',
        advisory_urgency: 'low',
        delivery_channel: 'sms',
        delivered_at: new Date('2026-01-22'),
        acknowledged_at: null,
        action_taken_by_farmer: false,
        is_active: true,
        created_at: new Date('2026-01-22'),
        updated_at: now,
      },
    ], dup);

    // ══════════════════════════════════════════════════════════════
    // 9. SAGE ALERTS (2-3 per farmer)
    // ══════════════════════════════════════════════════════════════
    await queryInterface.bulkInsert('sage_alerts', [
      // ── Raju ──
      {
        alert_uuid: 'ALT-RAJU-001',
        farmer_id: rajuId,
        alert_type: 'weather',
        alert_message: 'Heavy rainfall warning for Mysuru district. Expected 40-60mm on Jan 28-29, 2026.',
        alert_urgency: 'high',
        alert_triggered_at: new Date('2026-01-26'),
        alert_acknowledged_at: new Date('2026-01-26'),
        action_recommended: 'Clear field drainage channels. Postpone any spray application by 3 days.',
        is_active: true,
        created_at: new Date('2026-01-26'),
        updated_at: now,
      },
      {
        alert_uuid: 'ALT-RAJU-002',
        farmer_id: rajuId,
        alert_type: 'market_price',
        alert_message: 'Wheat price at Mysuru APMC crossed Rs 2,400/qtl — up 8% in 15 days.',
        alert_urgency: 'medium',
        alert_triggered_at: new Date('2026-02-15'),
        alert_acknowledged_at: new Date('2026-02-15'),
        action_recommended: 'Consider selling at current price or hold for 7 more days if storage is dry.',
        is_active: true,
        created_at: new Date('2026-02-15'),
        updated_at: now,
      },
      {
        alert_uuid: 'ALT-RAJU-003',
        farmer_id: rajuId,
        alert_type: 'harvest_timing',
        alert_message: 'Wheat grain moisture at estimated 14%. Optimal harvest window: next 5-7 days.',
        alert_urgency: 'medium',
        alert_triggered_at: new Date('2026-03-01'),
        alert_acknowledged_at: null,
        action_recommended: 'Arrange combine harvester. Book mandi slot at Mysuru APMC.',
        is_active: true,
        created_at: new Date('2026-03-01'),
        updated_at: now,
      },

      // ── Lakshmi ──
      {
        alert_uuid: 'ALT-LAKSHMI-001',
        farmer_id: lakshmiId,
        alert_type: 'weather',
        alert_message: 'Frost alert for Mandya district on Feb 8-9, 2026. Minimum temperature expected: 3 deg C.',
        alert_urgency: 'critical',
        alert_triggered_at: new Date('2026-02-06'),
        alert_acknowledged_at: new Date('2026-02-06'),
        action_recommended: 'Irrigate fields in the evening. Light irrigation raises field temperature by 1-2 deg C.',
        is_active: true,
        created_at: new Date('2026-02-06'),
        updated_at: now,
      },
      {
        alert_uuid: 'ALT-LAKSHMI-002',
        farmer_id: lakshmiId,
        alert_type: 'market_price',
        alert_message: 'Input cost alert: Your per-hectare spend is Rs 32,500 vs SoF norm of Rs 25,000 (30% overrun).',
        alert_urgency: 'high',
        alert_triggered_at: new Date('2026-02-10'),
        alert_acknowledged_at: null,
        action_recommended: 'Review labour and machinery expenses. Contact FPO for group hiring to reduce costs.',
        is_active: true,
        created_at: new Date('2026-02-10'),
        updated_at: now,
      },

      // ── Kumar ──
      {
        alert_uuid: 'ALT-KUMAR-001',
        farmer_id: kumarId,
        alert_type: 'market_price',
        alert_message: 'CRITICAL: Input cost overrun 50% above SoF norms. Loan utilisation under review.',
        alert_urgency: 'critical',
        alert_triggered_at: new Date('2026-01-28'),
        alert_acknowledged_at: null,
        action_recommended: 'Schedule meeting with bank branch manager. Provide receipts for all expenditures.',
        is_active: true,
        created_at: new Date('2026-01-28'),
        updated_at: now,
      },
      {
        alert_uuid: 'ALT-KUMAR-002',
        farmer_id: kumarId,
        alert_type: 'loan_due',
        alert_message: 'SMA-1 classification applied. Account inactive for 18 days. Respond to avoid SMA-2 upgrade.',
        alert_urgency: 'critical',
        alert_triggered_at: new Date('2026-02-05'),
        alert_acknowledged_at: null,
        action_recommended: 'Resume crop activity and upload proof. Contact helpline at 1800-XXX-XXXX.',
        is_active: true,
        created_at: new Date('2026-02-05'),
        updated_at: now,
      },
      {
        alert_uuid: 'ALT-KUMAR-003',
        farmer_id: kumarId,
        alert_type: 'weather',
        alert_message: 'Extended dry spell expected in Mysuru district for next 10 days. Irrigate wheat fields immediately.',
        alert_urgency: 'high',
        alert_triggered_at: new Date('2026-01-20'),
        alert_acknowledged_at: null,
        action_recommended: 'Schedule irrigation within 48 hours. Wheat at tillering stage needs 5 cm water.',
        is_active: true,
        created_at: new Date('2026-01-20'),
        updated_at: now,
      },

      // ── Manjunath ──
      {
        alert_uuid: 'ALT-MANJU-001',
        farmer_id: manjunathId,
        alert_type: 'harvest_timing',
        alert_message: 'Wheat ready for harvest. Grain moisture at 12.5%. Book combine within 3 days.',
        alert_urgency: 'medium',
        alert_triggered_at: new Date('2026-03-05'),
        alert_acknowledged_at: new Date('2026-03-05'),
        action_recommended: 'Contact Ramesh Combine Services (9845XXXXXX) or book via FPO aggregation.',
        is_active: true,
        created_at: new Date('2026-03-05'),
        updated_at: now,
      },
      {
        alert_uuid: 'ALT-MANJU-002',
        farmer_id: manjunathId,
        alert_type: 'storage_opportunity',
        alert_message: 'Mysuru CWC warehouse has 3,200 tonnes available. eNWR facility enabled for pledge finance.',
        alert_urgency: 'low',
        alert_triggered_at: new Date('2026-03-12'),
        alert_acknowledged_at: new Date('2026-03-13'),
        action_recommended: 'Store wheat at CWC for Rs 3.50/qtl/day. Use eNWR receipt for post-harvest credit.',
        is_active: true,
        created_at: new Date('2026-03-12'),
        updated_at: now,
      },

      // ── Savitri ──
      {
        alert_uuid: 'ALT-SAVITRI-001',
        farmer_id: savitriId,
        alert_type: 'weather',
        alert_message: 'Light rain expected in Mandya on Jan 22. Good sowing window after rain.',
        alert_urgency: 'low',
        alert_triggered_at: new Date('2026-01-20'),
        alert_acknowledged_at: new Date('2026-01-20'),
        action_recommended: 'Sow wheat seeds 24 hours after rain for optimal soil moisture.',
        is_active: true,
        created_at: new Date('2026-01-20'),
        updated_at: now,
      },
      {
        alert_uuid: 'ALT-SAVITRI-002',
        farmer_id: savitriId,
        alert_type: 'market_price',
        alert_message: 'Gold price update: 22K gold at Rs 5,800/gram. Your collateral value: Rs 58,000 (116% coverage).',
        alert_urgency: 'low',
        alert_triggered_at: new Date('2026-01-25'),
        alert_acknowledged_at: null,
        action_recommended: 'No action needed. Collateral coverage is healthy.',
        is_active: true,
        created_at: new Date('2026-01-25'),
        updated_at: now,
      },
    ], dup);

    // ══════════════════════════════════════════════════════════════
    // 10. CONSENT RECORDS (kyc + lending per farmer)
    // ══════════════════════════════════════════════════════════════
    const consentRows = [];
    const farmerIds = [
      { id: rajuId, prefix: 'RAJU', date: '2025-11-01' },
      { id: lakshmiId, prefix: 'LAKSHMI', date: '2025-11-05' },
      { id: kumarId, prefix: 'KUMAR', date: '2025-11-08' },
      { id: manjunathId, prefix: 'MANJU', date: '2025-10-20' },
      { id: savitriId, prefix: 'SAVITRI', date: '2026-01-10' },
    ];

    farmerIds.forEach(({ id, prefix, date }) => {
      consentRows.push(
        {
          consent_uuid: `CONS-${prefix}-KYC-001`,
          farmer_id: id,
          consent_type: 'kyc',
          consent_version: '1.0',
          accepted: true,
          accepted_at: new Date(date),
          ip_address: '103.22.141.10',
          user_agent: 'FarmerPay-Android/2.1.0',
          is_active: true,
          created_at: new Date(date),
          updated_at: now,
        },
        {
          consent_uuid: `CONS-${prefix}-LEND-001`,
          farmer_id: id,
          consent_type: 'lending',
          consent_version: '1.0',
          accepted: true,
          accepted_at: new Date(date),
          ip_address: '103.22.141.10',
          user_agent: 'FarmerPay-Android/2.1.0',
          is_active: true,
          created_at: new Date(date),
          updated_at: now,
        }
      );
    });

    await queryInterface.bulkInsert('consent_records', consentRows, dup);

    // ══════════════════════════════════════════════════════════════
    // 11. SMA CLASSIFICATION LOGS
    // ══════════════════════════════════════════════════════════════
    const smaRows = [];

    // All farmers get 'standard' classification at disbursement
    if (rajuLoanId) {
      smaRows.push({
        log_uuid: 'SMA-RAJU-001',
        application_id: rajuLoanId,
        sma_classification: 'standard',
        classification_date: '2025-11-20',
        classification_reason: 'Loan disbursed. All compliance metrics within acceptable range.',
        previous_classification: null,
        classification_trigger: null,
        is_active: true,
        created_at: new Date('2025-11-20'),
        updated_at: now,
      });
    }
    if (lakshmiLoanId) {
      smaRows.push({
        log_uuid: 'SMA-LAKSHMI-001',
        application_id: lakshmiLoanId,
        sma_classification: 'standard',
        classification_date: '2025-11-25',
        classification_reason: 'Loan disbursed. Initial classification standard.',
        previous_classification: null,
        classification_trigger: null,
        is_active: true,
        created_at: new Date('2025-11-25'),
        updated_at: now,
      });
    }
    if (kumarLoanId) {
      smaRows.push(
        {
          log_uuid: 'SMA-KUMAR-001',
          application_id: kumarLoanId,
          sma_classification: 'standard',
          classification_date: '2025-11-22',
          classification_reason: 'Loan disbursed. Initial classification standard.',
          previous_classification: null,
          classification_trigger: null,
          is_active: true,
          created_at: new Date('2025-11-22'),
          updated_at: now,
        },
        {
          log_uuid: 'SMA-KUMAR-002',
          application_id: kumarLoanId,
          sma_classification: 'sma_0_30',
          classification_date: '2026-01-15',
          classification_reason: 'Pop compliance score dropped to 28. Inactive for 10 days. Cost overrun 50%.',
          previous_classification: 'standard',
          classification_trigger: 'monitoring_trigger',
          is_active: true,
          created_at: new Date('2026-01-15'),
          updated_at: now,
        },
        {
          log_uuid: 'SMA-KUMAR-003',
          application_id: kumarLoanId,
          sma_classification: 'sma_30_60',
          classification_date: '2026-02-05',
          classification_reason: 'Upgraded to SMA-1. Continued inactivity for 18 days. Missed 4 tasks. No response to advisory alerts.',
          previous_classification: 'sma_0_30',
          classification_trigger: 'monitoring_trigger',
          is_active: true,
          created_at: new Date('2026-02-05'),
          updated_at: now,
        }
      );
    }
    if (manjunathLoanId) {
      smaRows.push({
        log_uuid: 'SMA-MANJU-001',
        application_id: manjunathLoanId,
        sma_classification: 'standard',
        classification_date: '2025-11-08',
        classification_reason: 'Loan disbursed. Model borrower — all touchpoints completed, loan repaid.',
        previous_classification: null,
        classification_trigger: null,
        is_active: true,
        created_at: new Date('2025-11-08'),
        updated_at: now,
      });
    }
    if (savitriLoanId) {
      smaRows.push({
        log_uuid: 'SMA-SAVITRI-001',
        application_id: savitriLoanId,
        sma_classification: 'standard',
        classification_date: '2026-01-22',
        classification_reason: 'Gold-backed loan disbursed. Collateral coverage 116%. Initial classification standard.',
        previous_classification: null,
        classification_trigger: null,
        is_active: true,
        created_at: new Date('2026-01-22'),
        updated_at: now,
      });
    }

    if (smaRows.length) {
      await queryInterface.bulkInsert('sma_classification_logs', smaRows, dup);
    }

    console.log('[seed-demo-farmer-journey] Seeded 5 farmer journeys successfully.');
  },

  async down(queryInterface) {
    // ── Clean up in reverse dependency order using known UUIDs/codes ──

    // 11. SMA classification logs
    await queryInterface.bulkDelete('sma_classification_logs', {
      log_uuid: [
        'SMA-RAJU-001', 'SMA-LAKSHMI-001',
        'SMA-KUMAR-001', 'SMA-KUMAR-002', 'SMA-KUMAR-003',
        'SMA-MANJU-001', 'SMA-SAVITRI-001',
      ],
    });

    // 10. Consent records
    await queryInterface.bulkDelete('consent_records', {
      consent_uuid: [
        'CONS-RAJU-KYC-001', 'CONS-RAJU-LEND-001',
        'CONS-LAKSHMI-KYC-001', 'CONS-LAKSHMI-LEND-001',
        'CONS-KUMAR-KYC-001', 'CONS-KUMAR-LEND-001',
        'CONS-MANJU-KYC-001', 'CONS-MANJU-LEND-001',
        'CONS-SAVITRI-KYC-001', 'CONS-SAVITRI-LEND-001',
      ],
    });

    // 9. Sage alerts
    await queryInterface.bulkDelete('sage_alerts', {
      alert_uuid: [
        'ALT-RAJU-001', 'ALT-RAJU-002', 'ALT-RAJU-003',
        'ALT-LAKSHMI-001', 'ALT-LAKSHMI-002',
        'ALT-KUMAR-001', 'ALT-KUMAR-002', 'ALT-KUMAR-003',
        'ALT-MANJU-001', 'ALT-MANJU-002',
        'ALT-SAVITRI-001', 'ALT-SAVITRI-002',
      ],
    });

    // 8. Sage advisories
    await queryInterface.bulkDelete('sage_advisories', {
      advisory_uuid: [
        'ADV-RAJU-001', 'ADV-RAJU-002', 'ADV-RAJU-003', 'ADV-RAJU-004', 'ADV-RAJU-005',
        'ADV-LAKSHMI-001', 'ADV-LAKSHMI-002', 'ADV-LAKSHMI-003', 'ADV-LAKSHMI-004',
        'ADV-KUMAR-001', 'ADV-KUMAR-002', 'ADV-KUMAR-003',
        'ADV-MANJU-001', 'ADV-MANJU-002', 'ADV-MANJU-003', 'ADV-MANJU-004', 'ADV-MANJU-005',
        'ADV-SAVITRI-001', 'ADV-SAVITRI-002', 'ADV-SAVITRI-003',
      ],
    });

    // 7. Trust score histories
    await queryInterface.bulkDelete('trust_score_history', {
      score_history_uuid: [
        'TSH-RAJU-001', 'TSH-LAKSHMI-002', 'TSH-KUMAR-003',
        'TSH-MANJUNATH-004', 'TSH-SAVITRI-005',
      ],
    });

    // 6. Pop compliance snapshots
    await queryInterface.bulkDelete('pop_compliance_snapshots', {
      snapshot_uuid: [
        'PCS-RAJU-001', 'PCS-LAKSHMI-002', 'PCS-KUMAR-003',
        'PCS-MANJUNATH-004', 'PCS-SAVITRI-005',
      ],
    });

    // 5. Loan applications
    await queryInterface.bulkDelete('loan_applications', {
      application_uuid: [
        'LA-RAJU-KCC-001', 'LA-LAKSHMI-KCC-002', 'LA-KUMAR-KCC-003',
        'LA-MANJUNATH-KCC-004', 'LA-SAVITRI-GOLD-005',
      ],
    });

    // 4. Farmer bank accounts — look up farmer IDs then delete
    const [farmerRows] = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE user_id IN (
        'USR-RAJU-GOWDA-001', 'USR-LAKSHMI-DEVI-002', 'USR-KUMAR-NAIK-003',
        'USR-MANJUNATH-004', 'USR-SAVITRI-BAI-005'
      )`
    );
    const ids = farmerRows.map((r) => r.id);

    if (ids.length) {
      await queryInterface.bulkDelete('farmer_bank_accounts', { farmer_id: ids });
      await queryInterface.bulkDelete('farmer_addresses', { farmer_id: ids });
      await queryInterface.bulkDelete('farmer_profiles', { farmer_id: ids });
    }

    // 1. Users
    await queryInterface.bulkDelete('users', {
      user_id: [
        'USR-RAJU-GOWDA-001', 'USR-LAKSHMI-DEVI-002', 'USR-KUMAR-NAIK-003',
        'USR-MANJUNATH-004', 'USR-SAVITRI-BAI-005',
      ],
    });
  },
};
