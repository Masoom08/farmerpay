'use strict';

/**
 * Migration: Create 4 DICE post-harvest extension tables.
 * Tables 17-20 from the PULSE × DICE Unified Farmer Frontend Spec.
 */
module.exports = {
  async up(queryInterface, Sequelize) {

    // Table 18: dice_warehouse_registries (create first — referenced by topup loans)
    await queryInterface.createTable('dice_warehouse_registries', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      warehouse_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      warehouse_name: { type: Sequelize.STRING(200), allowNull: true },
      warehouse_type: { type: Sequelize.ENUM('fci', 'cwc', 'swc', 'private', 'cooperative', 'fpo'), allowNull: true },
      operator_name: { type: Sequelize.STRING(200), allowNull: true },
      district_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'lgd_districts', key: 'id' } },
      state_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'lgd_states', key: 'id' } },
      latitude: { type: Sequelize.DECIMAL(10, 8), allowNull: true },
      longitude: { type: Sequelize.DECIMAL(11, 8), allowNull: true },
      total_capacity_tonnes: { type: Sequelize.INTEGER, allowNull: true },
      available_capacity_tonnes: { type: Sequelize.INTEGER, allowNull: true },
      enwr_enabled: { type: Sequelize.BOOLEAN, defaultValue: false },
      cold_storage_available: { type: Sequelize.BOOLEAN, defaultValue: false },
      storage_rate_per_quintal_per_day: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      insurance_available: { type: Sequelize.BOOLEAN, defaultValue: false },
      last_audit_date: { type: Sequelize.DATEONLY, allowNull: true },
      grading_facility_available: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('dice_warehouse_registries', ['district_id', 'enwr_enabled']);
    await queryInterface.addIndex('dice_warehouse_registries', ['state_id']);

    // Table 17: dice_postharvest_topup_loans
    await queryInterface.createTable('dice_postharvest_topup_loans', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      topup_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
      parent_loan_application_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'loan_applications', key: 'id' } },
      cycle_id: { type: Sequelize.STRING(36), allowNull: true },
      commodity_id: { type: Sequelize.STRING(36), allowNull: false },
      produce_quantity_quintals: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      produce_grade: { type: Sequelize.ENUM('A', 'B', 'C'), defaultValue: 'B' },
      produce_valuation_price: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      produce_total_value: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      topup_loan_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      ltv_ratio: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      interest_rate_annual: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      interest_subvention_applicable: { type: Sequelize.BOOLEAN, defaultValue: false },
      effective_interest_rate: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      loan_tenure_days: { type: Sequelize.INTEGER, defaultValue: 90 },
      disbursement_date: { type: Sequelize.DATEONLY, allowNull: true },
      maturity_date: { type: Sequelize.DATEONLY, allowNull: true },
      loan_status: { type: Sequelize.ENUM('applied', 'approved', 'disbursed', 'partially_repaid', 'closed', 'defaulted'), defaultValue: 'applied' },
      warehouse_id: { type: Sequelize.INTEGER, allowNull: true },
      warehouse_receipt_number: { type: Sequelize.STRING(100), allowNull: true },
      enwr_verified: { type: Sequelize.BOOLEAN, defaultValue: false },
      storage_cost_per_quintal_per_day: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      total_interest_accrued: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      total_storage_cost_accrued: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      amount_repaid: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      amount_outstanding: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      pulse_forecast_at_application: { type: Sequelize.JSON, allowNull: true },
      recommended_sell_window: { type: Sequelize.STRING(50), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('dice_postharvest_topup_loans', ['farmer_id', 'loan_status']);
    await queryInterface.addIndex('dice_postharvest_topup_loans', ['parent_loan_application_id']);
    await queryInterface.addIndex('dice_postharvest_topup_loans', ['commodity_id']);

    // Table 19: dice_produce_hypothecation_logs
    await queryInterface.createTable('dice_produce_hypothecation_logs', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      log_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      topup_loan_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'dice_postharvest_topup_loans', key: 'id' } },
      log_date: { type: Sequelize.DATEONLY, allowNull: false },
      event_type: { type: Sequelize.ENUM('deposit', 'valuation_update', 'partial_release', 'full_release', 'quality_check', 'insurance_claim'), allowNull: false },
      quantity_quintals: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      price_per_quintal: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      total_value: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      current_ltv_ratio: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      margin_call_triggered: { type: Sequelize.BOOLEAN, defaultValue: false },
      notes: { type: Sequelize.TEXT, allowNull: true },
      logged_by: { type: Sequelize.INTEGER, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('dice_produce_hypothecation_logs', ['topup_loan_id', 'log_date']);

    // Table 20: dice_price_realisation_snapshots
    await queryInterface.createTable('dice_price_realisation_snapshots', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      snapshot_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
      loan_application_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'loan_applications', key: 'id' } },
      commodity_id: { type: Sequelize.STRING(36), allowNull: false },
      snapshot_date: { type: Sequelize.DATEONLY, allowNull: false },
      produce_quantity_quintals: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      loan_outstanding: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      current_mandi_price: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      sell_now_gross: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      sell_now_transport_cost: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      sell_now_net: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      sell_now_surplus_deficit: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      predicted_price_15d: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      confidence_15d: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      store_15d_storage_cost: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      store_15d_interest_cost: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      store_15d_spoilage_loss: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      store_15d_gross: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      store_15d_net: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      store_15d_surplus_deficit: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      predicted_price_30d: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      confidence_30d: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      store_30d_storage_cost: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      store_30d_interest_cost: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      store_30d_spoilage_loss: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      store_30d_gross: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      store_30d_net: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      store_30d_surplus_deficit: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      recommended_strategy: { type: Sequelize.ENUM('sell_now', 'store_15d', 'store_30d'), allowNull: true },
      topup_eligible: { type: Sequelize.BOOLEAN, defaultValue: false },
      topup_max_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      farmer_decision: { type: Sequelize.ENUM('sell_now', 'store', 'apply_topup', 'undecided'), defaultValue: 'undecided' },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('dice_price_realisation_snapshots', ['farmer_id', 'snapshot_date']);
    await queryInterface.addIndex('dice_price_realisation_snapshots', ['loan_application_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('dice_price_realisation_snapshots');
    await queryInterface.dropTable('dice_produce_hypothecation_logs');
    await queryInterface.dropTable('dice_postharvest_topup_loans');
    await queryInterface.dropTable('dice_warehouse_registries');
  },
};
