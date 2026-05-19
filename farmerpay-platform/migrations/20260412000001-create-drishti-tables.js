'use strict';

/**
 * DRISHTI Module — All 9 tables for the Digital Twin / Scenario Simulation Engine.
 *
 * Tables created (in dependency order):
 *   1. drishti_scenario_templates
 *   2. drishti_farmer_snapshots
 *   3. drishti_benchmark_profiles
 *   4. drishti_portfolio_runs
 *   5. drishti_scenario_runs
 *   6. drishti_scenario_results
 *   7. drishti_scenario_comparisons
 *   8. drishti_household_income_sources
 *   9. drishti_household_expenses
 */

module.exports = {
  async up(queryInterface, Sequelize) {

    // ─── 1. drishti_scenario_templates ─────────────────────────────────
    await queryInterface.createTable('drishti_scenario_templates', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      template_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      engine_type: {
        type: Sequelize.ENUM('pre_loan', 'household_portfolio', 'climate_stress',
          'insurance', 'market_timing', 'banker_portfolio'),
        allowNull: false,
      },
      template_name: { type: Sequelize.STRING(150), allowNull: false },
      template_name_key: { type: Sequelize.STRING(100), allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      default_variables: { type: Sequelize.JSON, allowNull: false },
      variable_ranges: { type: Sequelize.JSON, allowNull: false },
      activity_types: { type: Sequelize.JSON, allowNull: true },
      is_system: { type: Sequelize.BOOLEAN, defaultValue: true },
      display_order: { type: Sequelize.INTEGER, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        type: Sequelize.DATE, allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE, allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('drishti_scenario_templates', ['engine_type'], { name: 'idx_dst_engine_type' });
    await queryInterface.addIndex('drishti_scenario_templates', ['is_active'], { name: 'idx_dst_active' });

    // ─── 2. drishti_farmer_snapshots ───────────────────────────────────
    await queryInterface.createTable('drishti_farmer_snapshots', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      snapshot_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      snapshot_date: { type: Sequelize.DATEONLY, allowNull: false },

      // FARMER module data
      total_farm_size_hectares: { type: Sequelize.DECIMAL(10, 4), allowNull: true },
      land_ownership_type: { type: Sequelize.STRING(20), allowNull: true },
      years_farming_experience: { type: Sequelize.INTEGER, allowNull: true },
      education_level: { type: Sequelize.STRING(30), allowNull: true },
      family_size: { type: Sequelize.INTEGER, allowNull: true },
      district_id: { type: Sequelize.INTEGER, allowNull: true },
      block_id: { type: Sequelize.INTEGER, allowNull: true },

      // ROOTS: Current activities summary
      active_crop_cycles: { type: Sequelize.JSON, allowNull: true },
      active_dairy_profile: { type: Sequelize.JSON, allowNull: true },
      active_fishery_profile: { type: Sequelize.JSON, allowNull: true },
      horticulture_profile: { type: Sequelize.JSON, allowNull: true },

      // ROOTS: Historical performance (last 3 seasons)
      historical_crop_profitability: { type: Sequelize.JSON, allowNull: true },
      historical_dairy_profitability: { type: Sequelize.JSON, allowNull: true },
      historical_fishery_profitability: { type: Sequelize.JSON, allowNull: true },

      // DICE: Loan exposure
      active_loans: { type: Sequelize.JSON, allowNull: true },
      total_outstanding: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      total_monthly_emi: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },

      // TRUST: Credit profile
      trust_score: { type: Sequelize.INTEGER, allowNull: true },
      trust_band: { type: Sequelize.STRING(20), allowNull: true },

      // SENTINEL: Risk profile
      income_adequacy_status: { type: Sequelize.STRING(20), allowNull: true },
      loan_to_income_ratio: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      risk_severity_band: { type: Sequelize.STRING(20), allowNull: true },

      // PULSE: Relevant market data
      relevant_commodity_prices: { type: Sequelize.JSON, allowNull: true },

      // SAGE: Current weather outlook
      weather_outlook: { type: Sequelize.JSON, allowNull: true },

      // INSURANCE: Coverage status
      active_insurance: { type: Sequelize.JSON, allowNull: true },

      // HOUSEHOLD INCOME: Complete non-farm income picture
      household_income_details: { type: Sequelize.JSON, allowNull: true },
      spouse_shg_monthly: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      wage_labor_monthly: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      mgnrega_annual: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      pension_monthly: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      remittance_monthly: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      petty_business_monthly: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      govt_transfers_annual: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      rental_income_monthly: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      other_income_monthly: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      total_non_farm_monthly: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      non_farm_income_streams: { type: Sequelize.INTEGER, defaultValue: 0 },

      // HOUSEHOLD EXPENSES: Full expense picture
      household_expense_details: { type: Sequelize.JSON, allowNull: true },
      food_groceries_monthly: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      education_monthly: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      healthcare_monthly: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      housing_monthly: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      social_obligations_annual: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      transportation_monthly: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      utilities_monthly: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      non_farm_loan_emi_monthly: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      total_household_expense_monthly: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },

      // HOUSEHOLD CONTEXT
      family_members_count: { type: Sequelize.INTEGER, defaultValue: 1 },
      earning_members_count: { type: Sequelize.INTEGER, defaultValue: 1 },
      dependents_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      spouse_occupation: { type: Sequelize.STRING(50), allowNull: true },
      primary_non_farm_occupation: { type: Sequelize.STRING(50), allowNull: true },

      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        type: Sequelize.DATE, allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE, allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('drishti_farmer_snapshots', ['farmer_id'], { name: 'idx_dfs_farmer' });
    await queryInterface.addIndex('drishti_farmer_snapshots', ['snapshot_date'], { name: 'idx_dfs_date' });
    await queryInterface.addIndex('drishti_farmer_snapshots', ['farmer_id', 'snapshot_date'], { name: 'idx_dfs_farmer_date' });

    // ─── 3. drishti_benchmark_profiles ─────────────────────────────────
    await queryInterface.createTable('drishti_benchmark_profiles', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      benchmark_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      district_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'lgd_districts', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      season: { type: Sequelize.STRING(20), allowNull: true },
      activity_type: {
        type: Sequelize.ENUM('crop', 'dairy', 'fishery', 'horticulture'),
        allowNull: false,
      },

      // For crop
      crop_id: { type: Sequelize.STRING(36), allowNull: true },
      avg_yield_kg_per_hectare: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      avg_cost_per_hectare: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      avg_revenue_per_hectare: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      avg_profit_per_hectare: { type: Sequelize.DECIMAL(15, 2), allowNull: true },

      // For dairy
      avg_milk_yield_per_animal: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      avg_monthly_cost_per_animal: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      avg_monthly_revenue_per_animal: { type: Sequelize.DECIMAL(15, 2), allowNull: true },

      // For fishery
      avg_yield_kg_per_hectare_pond: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      avg_cost_per_hectare_pond: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      avg_revenue_per_hectare_pond: { type: Sequelize.DECIMAL(15, 2), allowNull: true },

      // Climate sensitivity
      yield_rainfall_elasticity: { type: Sequelize.DECIMAL(5, 3), allowNull: true },
      yield_temperature_sensitivity: { type: Sequelize.DECIMAL(5, 3), allowNull: true },

      // Insurance history
      historical_claim_rate_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      avg_claim_payout: { type: Sequelize.DECIMAL(15, 2), allowNull: true },

      sample_size: { type: Sequelize.INTEGER, allowNull: true },
      benchmark_date: { type: Sequelize.DATEONLY, allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        type: Sequelize.DATE, allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE, allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('drishti_benchmark_profiles', ['district_id', 'season'], { name: 'idx_dbp_district_season' });
    await queryInterface.addIndex('drishti_benchmark_profiles', ['crop_id'], { name: 'idx_dbp_crop' });
    await queryInterface.addIndex('drishti_benchmark_profiles', ['activity_type'], { name: 'idx_dbp_activity' });
    await queryInterface.addIndex('drishti_benchmark_profiles',
      ['district_id', 'season', 'activity_type', 'crop_id', 'benchmark_date'],
      { unique: true, name: 'uk_benchmark' }
    );

    // ─── 4. drishti_portfolio_runs ─────────────────────────────────────
    await queryInterface.createTable('drishti_portfolio_runs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      portfolio_run_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      banker_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      run_label: { type: Sequelize.STRING(200), allowNull: true },

      // Scope
      district_id: { type: Sequelize.INTEGER, allowNull: true },
      block_id: { type: Sequelize.INTEGER, allowNull: true },
      loan_product_id: { type: Sequelize.INTEGER, allowNull: true },
      farmer_count: { type: Sequelize.INTEGER, allowNull: false },
      farmer_ids: { type: Sequelize.JSON, allowNull: true },

      // Shock parameters
      shock_variables: { type: Sequelize.JSON, allowNull: false },

      // Aggregated results
      total_portfolio_outstanding: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      projected_npa_count: { type: Sequelize.INTEGER, allowNull: true },
      projected_npa_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      projected_sma_migration: { type: Sequelize.JSON, allowNull: true },
      farmers_needing_intervention: { type: Sequelize.JSON, allowNull: true },
      portfolio_var_95: { type: Sequelize.DECIMAL(15, 2), allowNull: true },

      // Status
      status: {
        type: Sequelize.ENUM('queued', 'processing', 'completed', 'failed'),
        defaultValue: 'queued',
      },
      progress_pct: { type: Sequelize.INTEGER, defaultValue: 0 },
      started_at: { type: Sequelize.DATE, allowNull: true },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      error_message: { type: Sequelize.TEXT, allowNull: true },

      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        type: Sequelize.DATE, allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE, allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('drishti_portfolio_runs', ['banker_id'], { name: 'idx_dpr_banker' });
    await queryInterface.addIndex('drishti_portfolio_runs', ['status'], { name: 'idx_dpr_status' });
    await queryInterface.addIndex('drishti_portfolio_runs', ['district_id'], { name: 'idx_dpr_district' });

    // ─── 5. drishti_scenario_runs ──────────────────────────────────────
    await queryInterface.createTable('drishti_scenario_runs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      run_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      snapshot_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'drishti_farmer_snapshots', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      template_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'drishti_scenario_templates', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      engine_type: {
        type: Sequelize.ENUM('pre_loan', 'household_portfolio', 'climate_stress',
          'insurance', 'market_timing', 'banker_portfolio'),
        allowNull: false,
      },

      // Who initiated
      initiated_by: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      initiator_role: {
        type: Sequelize.ENUM('farmer', 'sathi', 'banker', 'admin'),
        allowNull: false,
      },

      // Context links
      loan_application_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'loan_applications', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      portfolio_run_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'drishti_portfolio_runs', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },

      // Input variables
      input_variables: { type: Sequelize.JSON, allowNull: false },

      // Computation metadata
      computation_mode: {
        type: Sequelize.ENUM('deterministic', 'monte_carlo'),
        defaultValue: 'deterministic',
      },
      monte_carlo_runs: { type: Sequelize.INTEGER, defaultValue: 0 },
      computation_time_ms: { type: Sequelize.INTEGER, allowNull: true },

      // Status
      status: {
        type: Sequelize.ENUM('pending', 'computing', 'completed', 'failed'),
        defaultValue: 'pending',
      },
      error_message: { type: Sequelize.TEXT, allowNull: true },

      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        type: Sequelize.DATE, allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE, allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('drishti_scenario_runs', ['farmer_id'], { name: 'idx_dsr_farmer' });
    await queryInterface.addIndex('drishti_scenario_runs', ['engine_type'], { name: 'idx_dsr_engine' });
    await queryInterface.addIndex('drishti_scenario_runs', ['loan_application_id'], { name: 'idx_dsr_loan' });
    await queryInterface.addIndex('drishti_scenario_runs', ['status'], { name: 'idx_dsr_status' });
    await queryInterface.addIndex('drishti_scenario_runs', ['created_at'], { name: 'idx_dsr_created' });

    // ─── 6. drishti_scenario_results ───────────────────────────────────
    await queryInterface.createTable('drishti_scenario_results', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      result_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      run_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'drishti_scenario_runs', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      scenario_label: { type: Sequelize.STRING(50), allowNull: false },

      // Summary metrics
      projected_revenue: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      projected_cost: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      projected_net_income: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      projected_roi_percent: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      emi_to_income_ratio: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      breakeven_yield_kg: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      cash_flow_negative_months: { type: Sequelize.INTEGER, defaultValue: 0 },
      projected_health_status: { type: Sequelize.STRING(20), allowNull: true },
      projected_sma_class: { type: Sequelize.STRING(20), allowNull: true },
      income_adequacy_status: { type: Sequelize.STRING(20), allowNull: true },

      // Monte Carlo outputs
      probability_profitable: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      probability_sma_stress: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      income_p10: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      income_p50: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      income_p90: { type: Sequelize.DECIMAL(15, 2), allowNull: true },

      // Full detailed output
      monthly_cashflow: { type: Sequelize.JSON, allowNull: true },
      detailed_breakdown: { type: Sequelize.JSON, allowNull: true },
      risk_factors: { type: Sequelize.JSON, allowNull: true },
      recommendations: { type: Sequelize.JSON, allowNull: true },

      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        type: Sequelize.DATE, allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE, allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('drishti_scenario_results', ['run_id'], { name: 'idx_dsres_run' });
    await queryInterface.addIndex('drishti_scenario_results', ['scenario_label'], { name: 'idx_dsres_label' });

    // ─── 7. drishti_scenario_comparisons ───────────────────────────────
    await queryInterface.createTable('drishti_scenario_comparisons', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      comparison_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      comparison_label: { type: Sequelize.STRING(150), allowNull: true },

      run_ids: { type: Sequelize.JSON, allowNull: false },
      comparison_summary: { type: Sequelize.JSON, allowNull: true },
      recommended_run_id: { type: Sequelize.INTEGER, allowNull: true },

      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        type: Sequelize.DATE, allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE, allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('drishti_scenario_comparisons', ['farmer_id'], { name: 'idx_dsc_farmer' });

    // ─── 8. drishti_household_income_sources ───────────────────────────
    await queryInterface.createTable('drishti_household_income_sources', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      source_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },

      // Income source details
      source_type: {
        type: Sequelize.ENUM('spouse_shg', 'wage_labor', 'mgnrega', 'pension',
          'remittance', 'petty_business', 'govt_transfer', 'rental', 'other'),
        allowNull: false,
      },
      source_label: { type: Sequelize.STRING(150), allowNull: true },
      earning_member: {
        type: Sequelize.ENUM('farmer', 'spouse', 'son', 'daughter',
          'parent', 'family', 'other'),
        allowNull: false,
      },
      earning_member_name: { type: Sequelize.STRING(100), allowNull: true },

      // Amount and frequency
      amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      frequency: {
        type: Sequelize.ENUM('daily', 'weekly', 'monthly', 'quarterly',
          'seasonal', 'annual', 'irregular'),
        allowNull: false,
      },
      amount_monthly_equivalent: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      active_months: { type: Sequelize.JSON, allowNull: true },
      reliability: {
        type: Sequelize.ENUM('guaranteed', 'regular', 'irregular', 'one_time'),
        defaultValue: 'regular',
      },

      // SHG-specific fields
      shg_name: { type: Sequelize.STRING(100), allowNull: true },
      shg_monthly_saving: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      shg_loan_outstanding: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      shg_member_since: { type: Sequelize.DATEONLY, allowNull: true },

      // Verification
      verified_by_sathi: { type: Sequelize.BOOLEAN, defaultValue: false },
      verified_at: { type: Sequelize.DATEONLY, allowNull: true },
      verification_evidence: { type: Sequelize.STRING(200), allowNull: true },
      confidence_level: {
        type: Sequelize.ENUM('declared', 'sathi_verified', 'document_verified'),
        defaultValue: 'declared',
      },

      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        type: Sequelize.DATE, allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE, allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('drishti_household_income_sources', ['farmer_id'], { name: 'idx_dhis_farmer' });
    await queryInterface.addIndex('drishti_household_income_sources', ['source_type'], { name: 'idx_dhis_source_type' });
    await queryInterface.addIndex('drishti_household_income_sources', ['earning_member'], { name: 'idx_dhis_earning_member' });

    // ─── 9. drishti_household_expenses ─────────────────────────────────
    await queryInterface.createTable('drishti_household_expenses', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      expense_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },

      category: {
        type: Sequelize.ENUM('food_groceries', 'education', 'healthcare', 'housing',
          'social_obligations', 'transportation', 'utilities',
          'non_farm_loan_emi', 'clothing', 'other'),
        allowNull: false,
      },
      category_label: { type: Sequelize.STRING(100), allowNull: true },

      // Amount and frequency
      amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      frequency: {
        type: Sequelize.ENUM('daily', 'weekly', 'monthly', 'quarterly',
          'seasonal', 'annual'),
        allowNull: false,
      },
      amount_monthly_equivalent: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      peak_months: { type: Sequelize.JSON, allowNull: true },
      peak_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },

      // Verification
      verified_by_sathi: { type: Sequelize.BOOLEAN, defaultValue: false },
      confidence_level: {
        type: Sequelize.ENUM('declared', 'sathi_estimated', 'document_verified'),
        defaultValue: 'declared',
      },

      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: {
        type: Sequelize.DATE, allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE, allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('drishti_household_expenses', ['farmer_id'], { name: 'idx_dhe_farmer' });
    await queryInterface.addIndex('drishti_household_expenses', ['category'], { name: 'idx_dhe_category' });
  },

  async down(queryInterface) {
    // Drop in reverse dependency order
    await queryInterface.dropTable('drishti_household_expenses');
    await queryInterface.dropTable('drishti_household_income_sources');
    await queryInterface.dropTable('drishti_scenario_comparisons');
    await queryInterface.dropTable('drishti_scenario_results');
    await queryInterface.dropTable('drishti_scenario_runs');
    await queryInterface.dropTable('drishti_portfolio_runs');
    await queryInterface.dropTable('drishti_benchmark_profiles');
    await queryInterface.dropTable('drishti_farmer_snapshots');
    await queryInterface.dropTable('drishti_scenario_templates');
  },
};
