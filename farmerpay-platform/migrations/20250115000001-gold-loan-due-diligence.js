'use strict';

/**
 * Gold Loan Due Diligence Migration
 * 4 new tables + 2 ALTER TABLE changes for RBI compliance.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ─── ALTER: rss_score_histories — add 4-component breakdown ──
    await queryInterface.addColumn('rss_score_histories', 'financial_health_score', {
      type: Sequelize.INTEGER, allowNull: true, after: 'risk_categories',
    });
    await queryInterface.addColumn('rss_score_histories', 'agricultural_performance_score', {
      type: Sequelize.INTEGER, allowNull: true, after: 'financial_health_score',
    });
    await queryInterface.addColumn('rss_score_histories', 'market_conditions_score', {
      type: Sequelize.INTEGER, allowNull: true, after: 'agricultural_performance_score',
    });
    await queryInterface.addColumn('rss_score_histories', 'behavioral_engagement_score', {
      type: Sequelize.INTEGER, allowNull: true, after: 'market_conditions_score',
    });
    await queryInterface.addColumn('rss_score_histories', 'rss_band', {
      type: Sequelize.ENUM('green', 'yellow', 'orange', 'red'),
      allowNull: true, after: 'behavioral_engagement_score',
    });

    // ─── CREATE: gold_loan_collaterals ──────────────────────────
    await queryInterface.createTable('gold_loan_collaterals', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      collateral_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      ornament_description: { type: Sequelize.STRING(200), allowNull: true },
      ornament_count: { type: Sequelize.INTEGER, allowNull: true },
      gross_weight_grams: { type: Sequelize.DECIMAL(10, 3), allowNull: false },
      net_weight_grams: { type: Sequelize.DECIMAL(10, 3), allowNull: true },
      purity_carat: { type: Sequelize.DECIMAL(4, 1), allowNull: true, defaultValue: 22.0 },
      stone_deduction_grams: { type: Sequelize.DECIMAL(10, 3), allowNull: true, defaultValue: 0 },
      ibja_price_per_gram: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      ibja_30day_avg_per_gram: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      valuation_price_used: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      total_gold_value: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      valuation_date: { type: Sequelize.DATEONLY, allowNull: true },
      appraiser_name: { type: Sequelize.STRING(100), allowNull: true },
      borrower_present_at_valuation: { type: Sequelize.BOOLEAN, defaultValue: true },
      ownership_proof_type: {
        type: Sequelize.ENUM('purchase_receipt', 'family_declaration', 'affidavit', 'inheritance_doc', 'other'),
        allowNull: true,
      },
      ownership_proof_document_id: { type: Sequelize.INTEGER, allowNull: true },
      aggregate_pledge_weight_grams: { type: Sequelize.DECIMAL(10, 3), allowNull: true },
      within_1kg_limit: { type: Sequelize.BOOLEAN, defaultValue: true },
      ltv_at_sanction_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      applicable_ltv_cap_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      ltv_compliant: { type: Sequelize.BOOLEAN, defaultValue: true },
      vault_location: { type: Sequelize.STRING(100), allowNull: true },
      vault_packet_id: { type: Sequelize.STRING(50), allowNull: true },
      gold_returned_date: { type: Sequelize.DATEONLY, allowNull: true },
      gold_return_within_7days: { type: Sequelize.BOOLEAN, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('gold_loan_collaterals', ['application_id']);
    await queryInterface.addIndex('gold_loan_collaterals', ['ltv_compliant']);

    // ─── CREATE: gold_loan_ltv_monitors ─────────────────────────
    await queryInterface.createTable('gold_loan_ltv_monitors', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      monitor_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      monitor_date: { type: Sequelize.DATEONLY, allowNull: false },
      loan_amount_slab: {
        type: Sequelize.ENUM('upto_2_5_lakh', '2_5_to_5_lakh', 'above_5_lakh'), allowNull: true,
      },
      sanctioned_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      principal_outstanding: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      accrued_interest: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      total_exposure: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      current_gold_value: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      ibja_price_date: { type: Sequelize.DATEONLY, allowNull: true },
      applicable_ltv_cap_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      current_ltv_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      maturity_adjusted_ltv_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      is_bullet_loan: { type: Sequelize.BOOLEAN, defaultValue: false },
      ltv_breach: { type: Sequelize.BOOLEAN, defaultValue: false },
      ltv_breach_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      margin_call_triggered: { type: Sequelize.BOOLEAN, defaultValue: false },
      action_required: { type: Sequelize.STRING(200), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('gold_loan_ltv_monitors', ['application_id']);
    await queryInterface.addIndex('gold_loan_ltv_monitors', ['monitor_date']);
    await queryInterface.addIndex('gold_loan_ltv_monitors', ['ltv_breach']);

    // ─── CREATE: income_adequacy_assessments ─────────────────────
    await queryInterface.createTable('income_adequacy_assessments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      assessment_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      assessment_date: { type: Sequelize.DATEONLY, allowNull: false },
      total_annual_income: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      crop_income: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      dairy_income: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      allied_income: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      non_farm_income: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      govt_transfer_income: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      income_stream_count: { type: Sequelize.INTEGER, allowNull: true },
      total_loan_obligation: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      emi_or_bullet_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      loan_to_income_ratio: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      emi_to_income_ratio: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      income_adequacy_status: {
        type: Sequelize.ENUM('strong', 'adequate', 'marginal', 'inadequate', 'failed'), allowNull: true,
      },
      shortfall_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      shortfall_probability_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      income_verified_by_sathi: { type: Sequelize.BOOLEAN, defaultValue: false },
      income_verified_by_vyapar: { type: Sequelize.BOOLEAN, defaultValue: false },
      verification_confidence_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('income_adequacy_assessments', ['application_id']);
    await queryInterface.addIndex('income_adequacy_assessments', ['income_adequacy_status']);

    // ─── CREATE: psl_compliance_trackers ─────────────────────────
    await queryInterface.createTable('psl_compliance_trackers', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      tracker_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      psl_eligible: { type: Sequelize.BOOLEAN, defaultValue: true },
      psl_category: {
        type: Sequelize.ENUM('agriculture', 'small_marginal_farmer', 'allied_activities', 'non_agriculture', 'consumption'),
        allowNull: true,
      },
      original_classification: { type: Sequelize.STRING(50), allowNull: true },
      current_classification: { type: Sequelize.STRING(50), allowNull: true },
      reclassified: { type: Sequelize.BOOLEAN, defaultValue: false },
      reclassification_date: { type: Sequelize.DATEONLY, allowNull: true },
      reclassification_reason: { type: Sequelize.TEXT, allowNull: true },
      end_use_verified: { type: Sequelize.BOOLEAN, defaultValue: false },
      end_use_score: { type: Sequelize.INTEGER, allowNull: true },
      agri_spend_percentage: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      diversion_risk_level: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'), allowNull: true,
      },
      documentation_complete: { type: Sequelize.BOOLEAN, defaultValue: false },
      last_audit_date: { type: Sequelize.DATEONLY, allowNull: true },
      audit_finding: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('psl_compliance_trackers', ['application_id']);
    await queryInterface.addIndex('psl_compliance_trackers', ['psl_category']);
    await queryInterface.addIndex('psl_compliance_trackers', ['reclassified']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('psl_compliance_trackers');
    await queryInterface.dropTable('income_adequacy_assessments');
    await queryInterface.dropTable('gold_loan_ltv_monitors');
    await queryInterface.dropTable('gold_loan_collaterals');
    await queryInterface.removeColumn('rss_score_histories', 'rss_band');
    await queryInterface.removeColumn('rss_score_histories', 'behavioral_engagement_score');
    await queryInterface.removeColumn('rss_score_histories', 'market_conditions_score');
    await queryInterface.removeColumn('rss_score_histories', 'agricultural_performance_score');
    await queryInterface.removeColumn('rss_score_histories', 'financial_health_score');
  },
};
