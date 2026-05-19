'use strict';

/**
 * Comprehensive demo-data seeder for the FarmerPay platform.
 *
 * Story: Raju Gowda, a wheat farmer in Mysuru district (Karnataka),
 * grows wheat during the Rabi 2025-26 season with a KCC loan from SBI.
 * This seeder populates all the key Pulse, DICE, and Loan tables with
 * realistic Indian agriculture data so that every screen has something
 * meaningful to render.
 *
 * Re-runnable: uses ignoreDuplicates on every bulkInsert.
 */

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const dup = { ignoreDuplicates: true };

    // ──────────────────────────────────────────────────────────
    // 1. pulse_commodities  (5 crops)
    // ──────────────────────────────────────────────────────────
    await queryInterface.bulkInsert('pulse_commodities', [
      {
        commodity_id: 'COMM-WHEAT-UUID-001',
        commodity_code: 'COMM-WHEAT',
        commodity_name: 'Wheat',
        commodity_type: 'food_grain',
        unit_of_measurement: 'quintal',
        perishability_index: 2,
        volatility_class: 'low',
        shelf_life_days: 365,
        storage_factor: 0.0005,
        msp_applicable: true,
        cold_chain_dependency: 'none',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        commodity_id: 'COMM-RICE-UUID-002',
        commodity_code: 'COMM-RICE',
        commodity_name: 'Rice (Paddy)',
        commodity_type: 'food_grain',
        unit_of_measurement: 'quintal',
        perishability_index: 2,
        volatility_class: 'moderate',
        shelf_life_days: 365,
        storage_factor: 0.0006,
        msp_applicable: true,
        cold_chain_dependency: 'none',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        commodity_id: 'COMM-TOMATO-UUID-003',
        commodity_code: 'COMM-TOMATO',
        commodity_name: 'Tomato',
        commodity_type: 'vegetable',
        unit_of_measurement: 'quintal',
        perishability_index: 8,
        volatility_class: 'ultra_high',
        shelf_life_days: 14,
        storage_factor: 0.0500,
        msp_applicable: false,
        cold_chain_dependency: 'mandatory',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        commodity_id: 'COMM-ONION-UUID-004',
        commodity_code: 'COMM-ONION',
        commodity_name: 'Onion',
        commodity_type: 'vegetable',
        unit_of_measurement: 'quintal',
        perishability_index: 5,
        volatility_class: 'high',
        shelf_life_days: 60,
        storage_factor: 0.0100,
        msp_applicable: false,
        cold_chain_dependency: 'recommended',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        commodity_id: 'COMM-COTTON-UUID-005',
        commodity_code: 'COMM-COTTON',
        commodity_name: 'Cotton',
        commodity_type: 'cash_crop',
        unit_of_measurement: 'quintal',
        perishability_index: 1,
        volatility_class: 'moderate',
        shelf_life_days: 365,
        storage_factor: 0.0003,
        msp_applicable: false,
        cold_chain_dependency: 'none',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ], dup);

    // ──────────────────────────────────────────────────────────
    // 2. pulse_mandis  (3 mandis in Karnataka)
    // ──────────────────────────────────────────────────────────
    await queryInterface.bulkInsert('pulse_mandis', [
      {
        mandi_code: 'MANDI-MYS-001',
        mandi_name: 'Mysuru APMC',
        mandi_state_id: null,
        mandi_district_id: null,
        mandi_latitude: 12.29580000,
        mandi_longitude: 76.63940000,
        mandi_regulated_by: 'Karnataka APMC Act',
        mandi_type: 'apmc',
        density_score: 7.50,
        transport_cost_index: 500.00,
        cold_storage_proximity_km: 5.00,
        fpo_aggregation_flag: false,
        price_discovery_rank: 1,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        mandi_code: 'MANDI-MDY-001',
        mandi_name: 'Mandya APMC',
        mandi_state_id: null,
        mandi_district_id: null,
        mandi_latitude: 12.52220000,
        mandi_longitude: 76.89520000,
        mandi_regulated_by: 'Karnataka APMC Act',
        mandi_type: 'apmc',
        density_score: 6.80,
        transport_cost_index: 800.00,
        cold_storage_proximity_km: 12.00,
        fpo_aggregation_flag: false,
        price_discovery_rank: 2,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        mandi_code: 'MANDI-BLR-001',
        mandi_name: 'Bangalore APMC (Yeshwanthpur)',
        mandi_state_id: null,
        mandi_district_id: null,
        mandi_latitude: 13.02110000,
        mandi_longitude: 77.54340000,
        mandi_regulated_by: 'Karnataka APMC Act',
        mandi_type: 'apmc',
        density_score: 9.20,
        transport_cost_index: 1200.00,
        cold_storage_proximity_km: 2.00,
        fpo_aggregation_flag: true,
        price_discovery_rank: 1,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ], dup);

    // ──────────────────────────────────────────────────────────
    // 3. pulse_price_records  (30 days of wheat @ Mysuru)
    //    Date range: 2026-03-06 to 2026-04-04
    //    Slight upward trend 2200 -> 2500
    // ──────────────────────────────────────────────────────────

    // We need the mandi id for Mysuru. Since we cannot guarantee auto-increment
    // ids, we look it up by code.
    const [mandis] = await queryInterface.sequelize.query(
      `SELECT id FROM pulse_mandis WHERE mandi_code = 'MANDI-MYS-001' LIMIT 1`
    );
    const mysuruMandiId = mandis.length ? mandis[0].id : 1;

    const priceRecords = [];
    const startDate = new Date('2026-03-06');
    for (let i = 0; i < 30; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayNum = String(i + 1).padStart(3, '0');

      // Linear trend from 2200 to 2500 with small daily noise
      const basePrice = 2200 + (300 * i / 29);
      const noise = Math.round((Math.sin(i * 1.3) * 30) + (Math.cos(i * 0.7) * 20));
      const modal = Math.round(basePrice + noise);
      const opening = modal - 30 - Math.round(Math.abs(Math.sin(i)) * 20);
      const closing = modal + 10 + Math.round(Math.abs(Math.cos(i)) * 15);
      const highest = Math.max(modal, opening, closing) + 40 + Math.round(Math.abs(Math.sin(i * 2)) * 30);
      const lowest = Math.min(modal, opening, closing) - 40 - Math.round(Math.abs(Math.cos(i * 2)) * 25);
      const trend = i < 5 ? 'stable' : (i % 5 === 0 ? 'stable' : 'rising');
      const arrivals = 120 + Math.round(Math.sin(i * 0.8) * 40);

      priceRecords.push({
        record_uuid: `PR-WHEAT-MYS-${dayNum}`,
        mandi_id: mysuruMandiId,
        commodity_id: 'COMM-WHEAT-UUID-001',
        record_date: dateStr,
        opening_price: opening,
        closing_price: closing,
        highest_price: highest,
        lowest_price: lowest,
        modal_price: modal,
        quantity_traded_quintals: arrivals * 10,
        arrivals_tonnes: arrivals,
        price_trend: trend,
        quality_flag: 'clean',
        policy_regime: 'open_market',
        futures_basis: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      });
    }
    await queryInterface.bulkInsert('pulse_price_records', priceRecords, dup);

    // ──────────────────────────────────────────────────────────
    // 4. pulse_price_forecasts  (3 horizons for wheat @ Mysuru)
    // ──────────────────────────────────────────────────────────
    const todayStr = new Date().toISOString().slice(0, 10);
    await queryInterface.bulkInsert('pulse_price_forecasts', [
      {
        forecast_uuid: 'FC-WHEAT-MYS-7D-001',
        commodity_id: 'COMM-WHEAT-UUID-001',
        mandi_id: mysuruMandiId,
        forecast_date: todayStr,
        horizon_days: 7,
        forecast_price_min: 2380.00,
        forecast_price_max: 2520.00,
        predicted_price: 2450.00,
        forecast_confidence: 85.00,
        model_version: 'XGB-v2.1',
        risk_score: 20,
        directional_confidence: 82.00,
        forecast_factors: JSON.stringify({
          supply: 'moderate arrivals',
          demand: 'steady flour-mill offtake',
          weather: 'clear skies, no disruption',
        }),
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        forecast_uuid: 'FC-WHEAT-MYS-15D-001',
        commodity_id: 'COMM-WHEAT-UUID-001',
        mandi_id: mysuruMandiId,
        forecast_date: todayStr,
        horizon_days: 15,
        forecast_price_min: 2420.00,
        forecast_price_max: 2620.00,
        predicted_price: 2520.00,
        forecast_confidence: 72.00,
        model_version: 'XGB-v2.1',
        risk_score: 35,
        directional_confidence: 68.00,
        forecast_factors: JSON.stringify({
          supply: 'harvest peak approaching',
          demand: 'government procurement window opening',
          policy: 'MSP procurement likely',
        }),
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        forecast_uuid: 'FC-WHEAT-MYS-30D-001',
        commodity_id: 'COMM-WHEAT-UUID-001',
        mandi_id: mysuruMandiId,
        forecast_date: todayStr,
        horizon_days: 30,
        forecast_price_min: 2500.00,
        forecast_price_max: 2800.00,
        predicted_price: 2650.00,
        forecast_confidence: 58.00,
        model_version: 'XGB-v2.1',
        risk_score: 50,
        directional_confidence: 55.00,
        forecast_factors: JSON.stringify({
          supply: 'post-harvest glut risk',
          demand: 'FCI buffer stock building',
          macro: 'export policy uncertain',
        }),
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ], dup);

    // ──────────────────────────────────────────────────────────
    // 5. pulse_msps  (MSP for wheat, Rabi 2025-26)
    // ──────────────────────────────────────────────────────────
    await queryInterface.bulkInsert('pulse_msps', [
      {
        msp_uuid: 'MSP-WHEAT-RABI-2526-001',
        commodity_id: 'COMM-WHEAT-UUID-001',
        msp_season: 'rabi',
        msp_year: 2025,
        msp_price: 2275.00,
        msp_announced_date: '2025-10-15',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ], dup);

    // ──────────────────────────────────────────────────────────
    // 6. scale_of_finances  (Wheat, Mysuru, Rabi 2025-26)
    //    Note: the table already has rows from the base seeder.
    //    This adds the DLTC district-crop-season norm row.
    // ──────────────────────────────────────────────────────────
    await queryInterface.bulkInsert('scale_of_finances', [
      {
        sof_code: 'SOF-MYS-WHEAT-RABI-2526',
        sof_name: 'Wheat - Mysuru - Rabi 2025-26',
        min_land_size_hectares: null,
        max_land_size_hectares: null,
        avg_investment_amount: 25000.00,
        recommended_loan_amount: 75000.00,
        district_id: null,
        state_id: null,
        crop_id: 1,
        season: 'rabi',
        financial_year: '2025-26',
        cost_per_hectare_seed: 3000.00,
        cost_per_hectare_fertiliser: 5500.00,
        cost_per_hectare_pesticide: 1500.00,
        cost_per_hectare_labour: 8000.00,
        cost_per_hectare_machinery: 4500.00,
        cost_per_hectare_other: 2500.00,
        total_cost_per_hectare: 25000.00,
        nabard_benchmark_total: 23500.00,
        nabard_benchmark_input_cost: 10000.00,
        approved_by: 'DLTC, District Magistrate, Mysuru',
        approved_date: '2025-09-20',
        source: 'dltc',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ], dup);

    // ──────────────────────────────────────────────────────────
    // 7. loan_categories  (KCC — may already exist)
    // ──────────────────────────────────────────────────────────
    await queryInterface.bulkInsert('loan_categories', [
      {
        category_code: 'kcc',
        category_name: 'Kisan Credit Card',
        category_order: 10,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ], dup);

    // ──────────────────────────────────────────────────────────
    // 8. loan_providers  (SBI)
    // ──────────────────────────────────────────────────────────
    await queryInterface.bulkInsert('loan_providers', [
      {
        provider_uuid: 'LP-SBI-UUID-001',
        provider_type_id: 1,
        provider_name: 'State Bank of India',
        provider_code: 'SBI',
        primary_contact_name: 'Agri Loan Desk',
        primary_contact_phone: '+911800111109',
        primary_contact_email: 'agriloan@sbi.co.in',
        headquarters_state_id: null,
        is_rbi_regulated: true,
        rbi_license_number: 'RBI/NB/2024/SBI',
        operates_in_states: 'ALL',
        service_radius_km: null,
        website_url: 'https://www.sbi.co.in',
        api_integration_status: 'none',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ], dup);

    // ──────────────────────────────────────────────────────────
    // 9. loan_products  (KCC Crop Loan - Wheat)
    //    Requires provider_id and category_id lookups.
    // ──────────────────────────────────────────────────────────
    const [providers] = await queryInterface.sequelize.query(
      `SELECT id FROM loan_providers WHERE provider_code = 'SBI' LIMIT 1`
    );
    const sbiId = providers.length ? providers[0].id : 1;

    const [categories] = await queryInterface.sequelize.query(
      `SELECT id FROM loan_categories WHERE category_code = 'kcc' LIMIT 1`
    );
    const kccCatId = categories.length ? categories[0].id : 1;

    await queryInterface.bulkInsert('loan_products', [
      {
        product_uuid: 'LPROD-KCC-WHEAT-001',
        provider_id: sbiId,
        category_id: kccCatId,
        subcategory_id: null,
        product_name: 'KCC Crop Loan - Wheat',
        product_code: 'SBI-KCC-WHEAT',
        product_description: 'Kisan Credit Card crop loan for wheat cultivation. Covers seed, fertiliser, labour, and machinery costs for the Rabi season. Interest subvention applicable for timely repayment.',
        min_loan_amount: 10000.00,
        max_loan_amount: 300000.00,
        min_interest_rate: 4.000,
        max_interest_rate: 7.000,
        processing_fee_percent: 0.500,
        is_floating_rate: false,
        tenure_months_min: 6,
        tenure_months_max: 12,
        repayment_frequency: 'seasonal',
        moratorium_period_months: 0,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ], dup);

    // ──────────────────────────────────────────────────────────
    // 10. dice_warehouse_registries  (2 warehouses)
    // ──────────────────────────────────────────────────────────
    await queryInterface.bulkInsert('dice_warehouse_registries', [
      {
        warehouse_uuid: 'WH-MYS-CWC-001',
        warehouse_name: 'Mysuru CWC Warehouse',
        warehouse_type: 'fci',
        operator_name: 'Central Warehousing Corporation',
        district_id: null,
        state_id: null,
        latitude: 12.30000000,
        longitude: 76.64000000,
        total_capacity_tonnes: 5000,
        available_capacity_tonnes: 3200,
        enwr_enabled: true,
        cold_storage_available: false,
        storage_rate_per_quintal_per_day: 3.50,
        insurance_available: true,
        last_audit_date: '2025-12-15',
        grading_facility_available: true,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        warehouse_uuid: 'WH-MDY-COLD-001',
        warehouse_name: 'Mandya Cold Storage',
        warehouse_type: 'private',
        operator_name: 'Mandya Agri Cold Chain Pvt Ltd',
        district_id: null,
        state_id: null,
        latitude: 12.52500000,
        longitude: 76.90000000,
        total_capacity_tonnes: 2000,
        available_capacity_tonnes: 800,
        enwr_enabled: true,
        cold_storage_available: true,
        storage_rate_per_quintal_per_day: 5.00,
        insurance_available: true,
        last_audit_date: '2026-01-10',
        grading_facility_available: false,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ], dup);

    // ──────────────────────────────────────────────────────────
    // 11. sage_advisory_types  (skip if exists — ignoreDuplicates)
    // ──────────────────────────────────────────────────────────
    await queryInterface.bulkInsert('sage_advisory_types', [
      { advisory_type_code: 'weather_alert', advisory_type_name: 'Weather Alert', advisory_category: 'weather', typical_urgency: 'high', description: 'Severe weather warnings and advisories', is_active: true, created_at: now, updated_at: now },
      { advisory_type_code: 'pest_management', advisory_type_name: 'Pest Management', advisory_category: 'crop_health', typical_urgency: 'medium', description: 'Pest identification and control advisories', is_active: true, created_at: now, updated_at: now },
      { advisory_type_code: 'market_timing', advisory_type_name: 'Market Timing', advisory_category: 'market', typical_urgency: 'medium', description: 'Optimal sell window advisories based on price forecasts', is_active: true, created_at: now, updated_at: now },
      { advisory_type_code: 'input_application', advisory_type_name: 'Input Application', advisory_category: 'crop_management', typical_urgency: 'low', description: 'Fertiliser and pesticide application schedule', is_active: true, created_at: now, updated_at: now },
      { advisory_type_code: 'loan_repayment', advisory_type_name: 'Loan Repayment Reminder', advisory_category: 'finance', typical_urgency: 'high', description: 'Upcoming loan repayment and interest subvention reminders', is_active: true, created_at: now, updated_at: now },
    ], dup);
  },

  async down(queryInterface) {
    // Delete in reverse dependency order using the unique codes/UUIDs
    // seeded above so we only remove our own data.

    // 11. sage_advisory_types
    await queryInterface.bulkDelete('sage_advisory_types', {
      advisory_type_code: [
        'weather_alert', 'pest_management', 'market_timing',
        'input_application', 'loan_repayment',
      ],
    });

    // 10. dice_warehouse_registries
    await queryInterface.bulkDelete('dice_warehouse_registries', {
      warehouse_uuid: ['WH-MYS-CWC-001', 'WH-MDY-COLD-001'],
    });

    // 9. loan_products
    await queryInterface.bulkDelete('loan_products', {
      product_uuid: ['LPROD-KCC-WHEAT-001'],
    });

    // 8. loan_providers
    await queryInterface.bulkDelete('loan_providers', {
      provider_code: ['SBI'],
    });

    // 7. loan_categories
    await queryInterface.bulkDelete('loan_categories', {
      category_code: ['kcc'],
    });

    // 6. scale_of_finances
    await queryInterface.bulkDelete('scale_of_finances', {
      sof_code: ['SOF-MYS-WHEAT-RABI-2526'],
    });

    // 5. pulse_msps
    await queryInterface.bulkDelete('pulse_msps', {
      msp_uuid: ['MSP-WHEAT-RABI-2526-001'],
    });

    // 4. pulse_price_forecasts
    await queryInterface.bulkDelete('pulse_price_forecasts', {
      forecast_uuid: [
        'FC-WHEAT-MYS-7D-001',
        'FC-WHEAT-MYS-15D-001',
        'FC-WHEAT-MYS-30D-001',
      ],
    });

    // 3. pulse_price_records  (30 records)
    const prUuids = [];
    for (let i = 1; i <= 30; i++) {
      prUuids.push(`PR-WHEAT-MYS-${String(i).padStart(3, '0')}`);
    }
    await queryInterface.bulkDelete('pulse_price_records', {
      record_uuid: prUuids,
    });

    // 2. pulse_mandis
    await queryInterface.bulkDelete('pulse_mandis', {
      mandi_code: ['MANDI-MYS-001', 'MANDI-MDY-001', 'MANDI-BLR-001'],
    });

    // 1. pulse_commodities
    await queryInterface.bulkDelete('pulse_commodities', {
      commodity_code: [
        'COMM-WHEAT', 'COMM-RICE', 'COMM-TOMATO',
        'COMM-ONION', 'COMM-COTTON',
      ],
    });
  },
};
