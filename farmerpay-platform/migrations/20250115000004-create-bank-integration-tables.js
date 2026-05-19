'use strict';

/**
 * Bank Integration Module — Pathway 1 Tables
 * CSV import tracking, loan account mapping, manual data entry.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. bank_portfolio_imports
    await queryInterface.createTable('bank_portfolio_imports', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      import_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      uploaded_by: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      file_name: { type: Sequelize.STRING(255), allowNull: false },
      file_type: { type: Sequelize.ENUM('csv', 'xlsx'), allowNull: false },
      bank_name: { type: Sequelize.STRING(100), allowNull: true },
      branch_code: { type: Sequelize.STRING(20), allowNull: true },
      total_rows: { type: Sequelize.INTEGER, allowNull: true },
      imported_rows: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      failed_rows: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      import_status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'partial'),
        defaultValue: 'pending',
      },
      error_log: { type: Sequelize.JSON, allowNull: true },
      import_completed_at: { type: Sequelize.DATE, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('bank_portfolio_imports', ['uploaded_by']);
    await queryInterface.addIndex('bank_portfolio_imports', ['import_status']);

    // 2. bank_loan_accounts
    await queryInterface.createTable('bank_loan_accounts', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      account_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      import_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'bank_portfolio_imports', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      finacle_account_number: { type: Sequelize.STRING(20), allowNull: false },
      finacle_cif_id: { type: Sequelize.STRING(20), allowNull: true },
      sol_id: { type: Sequelize.STRING(10), allowNull: true },
      borrower_name: { type: Sequelize.STRING(150), allowNull: true },
      borrower_pan: { type: Sequelize.STRING(10), allowNull: true },
      borrower_mobile: { type: Sequelize.STRING(13), allowNull: true },
      loan_type: {
        type: Sequelize.ENUM('agri_gold', 'consumption_gold', 'kcc_gold', 'allied_gold'), allowNull: true,
      },
      sanction_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      sanction_date: { type: Sequelize.DATEONLY, allowNull: true },
      interest_rate: { type: Sequelize.DECIMAL(5, 3), allowNull: true },
      maturity_date: { type: Sequelize.DATEONLY, allowNull: true },
      repayment_type: { type: Sequelize.ENUM('emi', 'bullet'), allowNull: true },
      outstanding_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      overdue_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      days_past_due: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      gold_weight_grams: { type: Sequelize.DECIMAL(10, 3), allowNull: true },
      gold_purity_carat: { type: Sequelize.DECIMAL(4, 1), allowNull: true },
      gold_valuation_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      gold_valuation_date: { type: Sequelize.DATEONLY, allowNull: true },
      ltv_at_sanction: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      sma_classification: {
        type: Sequelize.ENUM('standard', 'sma_0', 'sma_1', 'sma_2', 'npa'), defaultValue: 'standard',
      },
      psl_category: { type: Sequelize.STRING(50), allowNull: true },
      disbursement_mode: {
        type: Sequelize.ENUM('bank_transfer', 'upi', 'cheque', 'cash'), allowNull: true,
      },
      cash_disbursement_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      linked_application_id: { type: Sequelize.INTEGER, allowNull: true },
      linked_farmer_id: { type: Sequelize.INTEGER, allowNull: true },
      linkage_status: {
        type: Sequelize.ENUM('unlinked', 'auto_matched', 'manually_linked', 'confirmed'),
        defaultValue: 'unlinked',
      },
      data_as_of_date: { type: Sequelize.DATEONLY, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('bank_loan_accounts', ['finacle_account_number']);
    await queryInterface.addIndex('bank_loan_accounts', ['finacle_cif_id']);
    await queryInterface.addIndex('bank_loan_accounts', ['borrower_pan']);
    await queryInterface.addIndex('bank_loan_accounts', ['borrower_mobile']);
    await queryInterface.addIndex('bank_loan_accounts', ['sma_classification']);
    await queryInterface.addIndex('bank_loan_accounts', ['linkage_status']);
    await queryInterface.addIndex('bank_loan_accounts', ['import_id']);

    // 3. bank_data_entries
    await queryInterface.createTable('bank_data_entries', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      entry_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      loan_account_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'bank_loan_accounts', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      entered_by: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      entry_type: {
        type: Sequelize.ENUM(
          'repayment_update', 'sma_update', 'collateral_update',
          'disbursement_event', 'closure_event', 'topup_event', 'general_note'
        ),
        allowNull: false,
      },
      entry_data: { type: Sequelize.JSON, allowNull: false },
      entry_notes: { type: Sequelize.TEXT, allowNull: true },
      processed: { type: Sequelize.BOOLEAN, defaultValue: false },
      processed_at: { type: Sequelize.DATE, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('bank_data_entries', ['loan_account_id']);
    await queryInterface.addIndex('bank_data_entries', ['entry_type']);
    await queryInterface.addIndex('bank_data_entries', ['processed']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('bank_data_entries');
    await queryInterface.dropTable('bank_loan_accounts');
    await queryInterface.dropTable('bank_portfolio_imports');
  },
};
