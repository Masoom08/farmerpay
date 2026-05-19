'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // ─── PART A: ALTER EXISTING TABLES ───

    // 1. harvest_sale_records
    await queryInterface.addColumn('harvest_sale_records', 'sale_type', {
      type: Sequelize.ENUM('mandi', 'msp_procurement', 'fpo_pooling', 'contract_buyback', 'direct_retail', 'export'),
      defaultValue: 'mandi',
      after: 'buyer_type',
    });
    await queryInterface.addColumn('harvest_sale_records', 'transport_mode', {
      type: Sequelize.STRING(50),
      after: 'sale_type',
    });
    await queryInterface.addColumn('harvest_sale_records', 'distance_to_market_km', {
      type: Sequelize.DECIMAL(6, 1),
      after: 'transport_mode',
    });

    // 2. dairy_milk_production_logs
    await queryInterface.addColumn('dairy_milk_production_logs', 'cooperative_id', {
      type: Sequelize.STRING(16),
      after: 'buyer_name',
    });
    await queryInterface.addColumn('dairy_milk_production_logs', 'gross_payout', {
      type: Sequelize.DECIMAL(10, 2),
      after: 'cooperative_id',
    });
    await queryInterface.addColumn('dairy_milk_production_logs', 'deduction_feed_advance', {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0,
      after: 'gross_payout',
    });
    await queryInterface.addColumn('dairy_milk_production_logs', 'deduction_insurance', {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0,
      after: 'deduction_feed_advance',
    });
    await queryInterface.addColumn('dairy_milk_production_logs', 'deduction_loan_recovery', {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0,
      after: 'deduction_insurance',
    });
    await queryInterface.addColumn('dairy_milk_production_logs', 'net_payout', {
      type: Sequelize.DECIMAL(10, 2),
      after: 'deduction_loan_recovery',
    });

    // 3. fishery_ponds
    await queryInterface.addColumn('fishery_ponds', 'license_type', {
      type: Sequelize.STRING(50),
      after: 'water_source',
    });
    await queryInterface.addColumn('fishery_ponds', 'license_number', {
      type: Sequelize.STRING(50),
      after: 'license_type',
    });
    await queryInterface.addColumn('fishery_ponds', 'license_issuing_authority', {
      type: Sequelize.STRING(100),
      after: 'license_number',
    });
    await queryInterface.addColumn('fishery_ponds', 'license_expiry_date', {
      type: Sequelize.DATE,
      after: 'license_issuing_authority',
    });

    // 4. loan_repayments
    await queryInterface.addColumn('loan_repayments', 'is_subvention_eligible', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      before: 'is_active',
    });
    await queryInterface.addColumn('loan_repayments', 'subvention_rate_pct', {
      type: Sequelize.DECIMAL(4, 2),
      before: 'is_active',
    });
    await queryInterface.addColumn('loan_repayments', 'subvention_amount', {
      type: Sequelize.DECIMAL(10, 2),
      before: 'is_active',
    });
    await queryInterface.addColumn('loan_repayments', 'prompt_repayment_bonus', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      before: 'is_active',
    });

    // ─── PART B: CREATE NEW TABLES ───

    // 5. horticulture_orchards
    await queryInterface.createTable('horticulture_orchards', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      orchard_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      orchard_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      crop_name: {
        type: Sequelize.STRING(100),
      },
      variety: {
        type: Sequelize.STRING(100),
      },
      area_hectares: {
        type: Sequelize.DECIMAL(10, 4),
      },
      planting_date: {
        type: Sequelize.DATE,
      },
      plant_count: {
        type: Sequelize.INTEGER,
      },
      plant_spacing_meters: {
        type: Sequelize.DECIMAL(5, 2),
      },
      infrastructure_type: {
        type: Sequelize.ENUM('open_field', 'polyhouse', 'shade_net', 'low_tunnel', 'greenhouse'),
        defaultValue: 'open_field',
      },
      infrastructure_area_sqm: {
        type: Sequelize.DECIMAL(10, 2),
      },
      subsidy_scheme: {
        type: Sequelize.STRING(100),
      },
      subsidy_amount: {
        type: Sequelize.DECIMAL(10, 2),
      },
      orchard_gps_latitude: {
        type: Sequelize.DECIMAL(10, 8),
      },
      orchard_gps_longitude: {
        type: Sequelize.DECIMAL(11, 8),
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('horticulture_orchards', ['farmer_id']);

    // 6. horticulture_plantings
    await queryInterface.createTable('horticulture_plantings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      orchard_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'horticulture_orchards', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      sapling_source: {
        type: Sequelize.STRING(100),
      },
      sapling_variety: {
        type: Sequelize.STRING(100),
      },
      sapling_count: {
        type: Sequelize.INTEGER,
      },
      sapling_cost_per_unit: {
        type: Sequelize.DECIMAL(10, 2),
      },
      planting_date: {
        type: Sequelize.DATE,
      },
      survival_rate_percent: {
        type: Sequelize.DECIMAL(5, 2),
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('horticulture_plantings', ['orchard_id']);

    // 7. horticulture_harvests
    await queryInterface.createTable('horticulture_harvests', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      orchard_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'horticulture_orchards', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      harvest_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      total_yield_kg: {
        type: Sequelize.INTEGER,
      },
      grade_a_kg: {
        type: Sequelize.INTEGER,
      },
      grade_b_kg: {
        type: Sequelize.INTEGER,
      },
      grade_c_kg: {
        type: Sequelize.INTEGER,
      },
      rejection_kg: {
        type: Sequelize.INTEGER,
      },
      rejection_reason: {
        type: Sequelize.STRING(200),
      },
      sale_quantity_kg: {
        type: Sequelize.INTEGER,
      },
      sale_price_per_kg: {
        type: Sequelize.DECIMAL(10, 2),
      },
      total_sale_value: {
        type: Sequelize.DECIMAL(15, 2),
      },
      buyer_name: {
        type: Sequelize.STRING(100),
      },
      buyer_type: {
        type: Sequelize.ENUM('mandi', 'processor', 'exporter', 'retail', 'fpo'),
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('horticulture_harvests', ['orchard_id']);
    await queryInterface.addIndex('horticulture_harvests', ['harvest_date']);

    // 8. horticulture_input_logs
    await queryInterface.createTable('horticulture_input_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      orchard_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'horticulture_orchards', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      input_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      input_type: {
        type: Sequelize.STRING(50),
      },
      input_name: {
        type: Sequelize.STRING(100),
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
      },
      unit: {
        type: Sequelize.STRING(20),
      },
      cost: {
        type: Sequelize.DECIMAL(10, 2),
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('horticulture_input_logs', ['orchard_id']);

    // 9. horticulture_health_records
    await queryInterface.createTable('horticulture_health_records', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      orchard_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'horticulture_orchards', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      observation_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      health_status: {
        type: Sequelize.ENUM('excellent', 'good', 'average', 'poor'),
      },
      pest_detected: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      pest_name: {
        type: Sequelize.STRING(100),
      },
      disease_detected: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      disease_name: {
        type: Sequelize.STRING(100),
      },
      affected_plant_count: {
        type: Sequelize.INTEGER,
      },
      treatment_given: {
        type: Sequelize.TEXT,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('horticulture_health_records', ['orchard_id']);

    // 10. horticulture_expense_summaries
    await queryInterface.createTable('horticulture_expense_summaries', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      orchard_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'horticulture_orchards', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      expense_month: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      expense_year: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      sapling_cost: {
        type: Sequelize.DECIMAL(15, 2),
      },
      input_cost: {
        type: Sequelize.DECIMAL(15, 2),
      },
      labor_cost: {
        type: Sequelize.DECIMAL(15, 2),
      },
      infrastructure_cost: {
        type: Sequelize.DECIMAL(15, 2),
      },
      other_cost: {
        type: Sequelize.DECIMAL(15, 2),
      },
      total_expense: {
        type: Sequelize.DECIMAL(15, 2),
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('horticulture_expense_summaries', ['orchard_id']);
    await queryInterface.addIndex('horticulture_expense_summaries', ['expense_month', 'expense_year']);

    // 11. horticulture_income_summaries
    await queryInterface.createTable('horticulture_income_summaries', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      orchard_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'horticulture_orchards', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      income_month: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      income_year: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      harvest_sale_income: {
        type: Sequelize.DECIMAL(15, 2),
      },
      byproduct_income: {
        type: Sequelize.DECIMAL(15, 2),
      },
      total_income: {
        type: Sequelize.DECIMAL(15, 2),
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('horticulture_income_summaries', ['orchard_id']);
    await queryInterface.addIndex('horticulture_income_summaries', ['income_month', 'income_year']);

    // 12. horticulture_irrigation_logs
    await queryInterface.createTable('horticulture_irrigation_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      orchard_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'horticulture_orchards', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      irrigation_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      irrigation_method: {
        type: Sequelize.ENUM('drip', 'sprinkler', 'flood', 'furrow', 'manual'),
      },
      duration_hours: {
        type: Sequelize.DECIMAL(5, 2),
      },
      water_source: {
        type: Sequelize.STRING(50),
      },
      cost: {
        type: Sequelize.DECIMAL(10, 2),
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('horticulture_irrigation_logs', ['orchard_id']);

    // 13. farmer_scheme_enrollments
    await queryInterface.createTable('farmer_scheme_enrollments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      enrollment_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      scheme_code: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      scheme_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      scheme_category: {
        type: Sequelize.ENUM('pm_kisan', 'pmfby', 'pmmsy', 'midh', 'smam', 'aif', 'nrlm', 'dbt_other'),
        allowNull: false,
      },
      enrollment_status: {
        type: Sequelize.ENUM('active', 'expired', 'pending', 'rejected'),
        defaultValue: 'active',
      },
      benefit_amount: {
        type: Sequelize.DECIMAL(12, 2),
      },
      last_benefit_date: {
        type: Sequelize.DATE,
      },
      benefit_frequency: {
        type: Sequelize.ENUM('annual', 'seasonal', 'one_time', 'monthly'),
      },
      verification_source: {
        type: Sequelize.STRING(50),
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('farmer_scheme_enrollments', ['farmer_id']);
    await queryInterface.addIndex('farmer_scheme_enrollments', ['scheme_code']);
    await queryInterface.addIndex('farmer_scheme_enrollments', ['enrollment_status']);

    // 14. fpo_memberships
    await queryInterface.createTable('fpo_memberships', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      membership_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      fpo_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      fpo_registration_number: {
        type: Sequelize.STRING(50),
      },
      membership_status: {
        type: Sequelize.ENUM('active', 'inactive', 'suspended'),
        defaultValue: 'active',
      },
      share_value: {
        type: Sequelize.DECIMAL(10, 2),
      },
      joined_date: {
        type: Sequelize.DATE,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('fpo_memberships', ['farmer_id']);

    // 15. fpo_transactions
    await queryInterface.createTable('fpo_transactions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      transaction_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false,
      },
      fpo_membership_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'fpo_memberships', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      transaction_type: {
        type: Sequelize.ENUM('commodity_pooling', 'input_purchase', 'payout', 'share_dividend'),
        allowNull: false,
      },
      commodity: {
        type: Sequelize.STRING(50),
      },
      quantity: {
        type: Sequelize.DECIMAL(12, 2),
      },
      unit: {
        type: Sequelize.STRING(20),
      },
      price_per_unit: {
        type: Sequelize.DECIMAL(10, 2),
      },
      total_amount: {
        type: Sequelize.DECIMAL(12, 2),
      },
      fpo_margin_pct: {
        type: Sequelize.DECIMAL(5, 2),
      },
      farmer_payout: {
        type: Sequelize.DECIMAL(12, 2),
      },
      transaction_date: {
        type: Sequelize.DATE,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('fpo_transactions', ['farmer_id']);
    await queryInterface.addIndex('fpo_transactions', ['fpo_membership_id']);
    await queryInterface.addIndex('fpo_transactions', ['transaction_date']);

    // 16. contract_farming_agreements
    await queryInterface.createTable('contract_farming_agreements', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      agreement_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      buyer_company_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      buyer_contact: {
        type: Sequelize.STRING(100),
      },
      crop: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      variety: {
        type: Sequelize.STRING(50),
      },
      agreed_price_per_unit: {
        type: Sequelize.DECIMAL(10, 2),
      },
      quantity_commitment: {
        type: Sequelize.DECIMAL(12, 2),
      },
      unit: {
        type: Sequelize.STRING(20),
      },
      delivery_start_date: {
        type: Sequelize.DATE,
      },
      delivery_end_date: {
        type: Sequelize.DATE,
      },
      penalty_clause_summary: {
        type: Sequelize.TEXT,
      },
      payment_terms: {
        type: Sequelize.STRING(200),
      },
      agreement_status: {
        type: Sequelize.ENUM('active', 'completed', 'terminated', 'expired'),
        defaultValue: 'active',
      },
      document_url: {
        type: Sequelize.STRING(500),
      },
      season: {
        type: Sequelize.STRING(20),
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('contract_farming_agreements', ['farmer_id']);
    await queryInterface.addIndex('contract_farming_agreements', ['agreement_status']);
    await queryInterface.addIndex('contract_farming_agreements', ['season']);

    // 17. insurance_enrollments
    await queryInterface.createTable('insurance_enrollments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      enrollment_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false,
      },
      farmer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      insurance_type: {
        type: Sequelize.ENUM('pmfby_crop', 'livestock', 'aquaculture', 'polyhouse', 'weather_index'),
        allowNull: false,
      },
      insurer_name: {
        type: Sequelize.STRING(100),
      },
      policy_number: {
        type: Sequelize.STRING(50),
      },
      sum_insured: {
        type: Sequelize.DECIMAL(12, 2),
      },
      premium_paid: {
        type: Sequelize.DECIMAL(10, 2),
      },
      premium_subsidy: {
        type: Sequelize.DECIMAL(10, 2),
      },
      crop_insured: {
        type: Sequelize.STRING(50),
      },
      area_insured_hectares: {
        type: Sequelize.DECIMAL(8, 2),
      },
      animal_tag_id: {
        type: Sequelize.STRING(50),
      },
      season: {
        type: Sequelize.STRING(20),
      },
      enrollment_date: {
        type: Sequelize.DATE,
      },
      policy_expiry_date: {
        type: Sequelize.DATE,
      },
      claim_filed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      claim_amount: {
        type: Sequelize.DECIMAL(12, 2),
      },
      claim_status: {
        type: Sequelize.ENUM('none', 'filed', 'under_review', 'approved', 'rejected', 'settled'),
        defaultValue: 'none',
      },
      claim_payout: {
        type: Sequelize.DECIMAL(12, 2),
      },
      linked_loan_id: {
        type: Sequelize.INTEGER,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('insurance_enrollments', ['farmer_id']);
    await queryInterface.addIndex('insurance_enrollments', ['insurance_type']);
    await queryInterface.addIndex('insurance_enrollments', ['season']);
    await queryInterface.addIndex('insurance_enrollments', ['claim_status']);
  },

  async down(queryInterface) {
    // Drop new tables in reverse order
    await queryInterface.dropTable('insurance_enrollments');
    await queryInterface.dropTable('contract_farming_agreements');
    await queryInterface.dropTable('fpo_transactions');
    await queryInterface.dropTable('fpo_memberships');
    await queryInterface.dropTable('farmer_scheme_enrollments');
    await queryInterface.dropTable('horticulture_irrigation_logs');
    await queryInterface.dropTable('horticulture_income_summaries');
    await queryInterface.dropTable('horticulture_expense_summaries');
    await queryInterface.dropTable('horticulture_health_records');
    await queryInterface.dropTable('horticulture_input_logs');
    await queryInterface.dropTable('horticulture_harvests');
    await queryInterface.dropTable('horticulture_plantings');
    await queryInterface.dropTable('horticulture_orchards');

    // Remove added columns from altered tables
    await queryInterface.removeColumn('loan_repayments', 'prompt_repayment_bonus');
    await queryInterface.removeColumn('loan_repayments', 'subvention_amount');
    await queryInterface.removeColumn('loan_repayments', 'subvention_rate_pct');
    await queryInterface.removeColumn('loan_repayments', 'is_subvention_eligible');

    await queryInterface.removeColumn('fishery_ponds', 'license_expiry_date');
    await queryInterface.removeColumn('fishery_ponds', 'license_issuing_authority');
    await queryInterface.removeColumn('fishery_ponds', 'license_number');
    await queryInterface.removeColumn('fishery_ponds', 'license_type');

    await queryInterface.removeColumn('dairy_milk_production_logs', 'net_payout');
    await queryInterface.removeColumn('dairy_milk_production_logs', 'deduction_loan_recovery');
    await queryInterface.removeColumn('dairy_milk_production_logs', 'deduction_insurance');
    await queryInterface.removeColumn('dairy_milk_production_logs', 'deduction_feed_advance');
    await queryInterface.removeColumn('dairy_milk_production_logs', 'gross_payout');
    await queryInterface.removeColumn('dairy_milk_production_logs', 'cooperative_id');

    await queryInterface.removeColumn('harvest_sale_records', 'distance_to_market_km');
    await queryInterface.removeColumn('harvest_sale_records', 'transport_mode');
    await queryInterface.removeColumn('harvest_sale_records', 'sale_type');
  },
};
