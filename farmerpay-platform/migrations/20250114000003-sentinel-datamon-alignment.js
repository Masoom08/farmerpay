'use strict';

/**
 * SENTINEL DataMon Alignment Migration
 * 3 new tables (credit bureau, AA consent, AA bank statement) + 1 ALTER TABLE.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ─── ALTER: farmer_income_streams — add DBT + contract fields ──
    await queryInterface.addColumn('farmer_income_streams', 'dbt_scheme_name', {
      type: Sequelize.STRING(100), allowNull: true, after: 'income_stability_rating',
    });
    await queryInterface.addColumn('farmer_income_streams', 'dbt_reference_number', {
      type: Sequelize.STRING(50), allowNull: true, after: 'dbt_scheme_name',
    });
    await queryInterface.addColumn('farmer_income_streams', 'contract_agreement_id', {
      type: Sequelize.INTEGER, allowNull: true, after: 'dbt_reference_number',
    });

    // ─── CREATE: credit_bureau_reports ──────────────────────────────
    await queryInterface.createTable('credit_bureau_reports', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      report_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      bureau_name: {
        type: Sequelize.ENUM('cibil', 'experian', 'equifax', 'crif_highmark'), allowNull: false,
      },
      report_date: { type: Sequelize.DATE, allowNull: false },
      credit_score: { type: Sequelize.INTEGER, allowNull: true },
      score_band: { type: Sequelize.STRING(20), allowNull: true },
      active_loans_count: { type: Sequelize.INTEGER, allowNull: true },
      total_outstanding: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      overdue_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      max_dpd_last_12m: { type: Sequelize.INTEGER, allowNull: true },
      enquiry_count_last_6m: { type: Sequelize.INTEGER, allowNull: true },
      raw_report_encrypted: { type: Sequelize.TEXT, allowNull: true },
      consent_id: { type: Sequelize.STRING(36), allowNull: true },
      consent_timestamp: { type: Sequelize.DATE, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('credit_bureau_reports', ['farmer_id']);
    await queryInterface.addIndex('credit_bureau_reports', ['bureau_name']);
    await queryInterface.addIndex('credit_bureau_reports', ['report_date']);

    // ─── CREATE: aa_consents ────────────────────────────────────────
    await queryInterface.createTable('aa_consents', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      consent_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      aa_provider: {
        type: Sequelize.ENUM('finvu', 'onemoney', 'cams', 'nsdl'), allowNull: false,
      },
      consent_status: {
        type: Sequelize.ENUM('requested', 'approved', 'rejected', 'revoked', 'expired'),
        defaultValue: 'requested',
      },
      consent_purpose: { type: Sequelize.STRING(100), allowNull: true },
      data_from: { type: Sequelize.DATEONLY, allowNull: true },
      data_to: { type: Sequelize.DATEONLY, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('aa_consents', ['farmer_id']);
    await queryInterface.addIndex('aa_consents', ['consent_status']);

    // ─── CREATE: aa_bank_statement_summaries ────────────────────────
    await queryInterface.createTable('aa_bank_statement_summaries', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      summary_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      consent_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'aa_consents', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      bank_name: { type: Sequelize.STRING(100), allowNull: true },
      account_type: {
        type: Sequelize.ENUM('savings', 'current', 'kcc', 'loan'), allowNull: true,
      },
      period_months: { type: Sequelize.INTEGER, allowNull: true },
      avg_monthly_credit: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      avg_monthly_debit: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      avg_monthly_balance: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      min_balance: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      max_balance: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      salary_dbt_credits: { type: Sequelize.INTEGER, allowNull: true },
      govt_subsidy_credits: { type: Sequelize.INTEGER, allowNull: true },
      upi_transaction_count: { type: Sequelize.INTEGER, allowNull: true },
      avg_upi_value: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      bounce_count: { type: Sequelize.INTEGER, allowNull: true },
      emi_debit_count: { type: Sequelize.INTEGER, allowNull: true },
      cash_withdrawal_ratio: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('aa_bank_statement_summaries', ['farmer_id']);
    await queryInterface.addIndex('aa_bank_statement_summaries', ['consent_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('aa_bank_statement_summaries');
    await queryInterface.dropTable('aa_consents');
    await queryInterface.dropTable('credit_bureau_reports');
    await queryInterface.removeColumn('farmer_income_streams', 'contract_agreement_id');
    await queryInterface.removeColumn('farmer_income_streams', 'dbt_reference_number');
    await queryInterface.removeColumn('farmer_income_streams', 'dbt_scheme_name');
  },
};
