'use strict';

/**
 * DICE Gold Loan Origination Migration
 * Adds gold loan, PSL, and disbursement mode fields to loan origination tables.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ─── ALTER: loan_products — gold loan product config ─────────
    await queryInterface.addColumn('loan_products', 'repayment_type', {
      type: Sequelize.ENUM('emi', 'bullet', 'interest_only', 'flexible'),
      defaultValue: 'emi', after: 'repayment_frequency',
    });
    await queryInterface.addColumn('loan_products', 'collateral_type', {
      type: Sequelize.ENUM('none', 'gold', 'land', 'crop_hypothecation', 'equipment', 'other'),
      defaultValue: 'none', after: 'moratorium_period_months',
    });
    await queryInterface.addColumn('loan_products', 'is_gold_loan', {
      type: Sequelize.BOOLEAN, defaultValue: false, after: 'collateral_type',
    });
    await queryInterface.addColumn('loan_products', 'ltv_cap_pct', {
      type: Sequelize.DECIMAL(5, 2), allowNull: true, after: 'is_gold_loan',
    });
    await queryInterface.addColumn('loan_products', 'max_bullet_tenure_months', {
      type: Sequelize.INTEGER, allowNull: true, after: 'ltv_cap_pct',
    });
    await queryInterface.addColumn('loan_products', 'psl_eligible', {
      type: Sequelize.BOOLEAN, defaultValue: false, after: 'max_bullet_tenure_months',
    });
    await queryInterface.addColumn('loan_products', 'psl_category', {
      type: Sequelize.ENUM('agriculture', 'small_marginal_farmer', 'allied_activities', 'msme', 'other'),
      allowNull: true, after: 'psl_eligible',
    });

    // ─── ALTER: loan_applications — gold loan origination fields ──
    await queryInterface.addColumn('loan_applications', 'collateral_type', {
      type: Sequelize.ENUM('none', 'gold', 'land', 'crop_hypothecation', 'equipment', 'other'),
      allowNull: true, after: 'risk_score',
    });
    await queryInterface.addColumn('loan_applications', 'is_gold_loan', {
      type: Sequelize.BOOLEAN, defaultValue: false, after: 'collateral_type',
    });
    await queryInterface.addColumn('loan_applications', 'repayment_type', {
      type: Sequelize.ENUM('emi', 'bullet', 'interest_only', 'flexible'),
      allowNull: true, after: 'is_gold_loan',
    });
    await queryInterface.addColumn('loan_applications', 'psl_classification', {
      type: Sequelize.ENUM('agriculture', 'small_marginal_farmer', 'allied_activities', 'non_agriculture', 'consumption'),
      allowNull: true, after: 'repayment_type',
    });
    await queryInterface.addColumn('loan_applications', 'end_use_declaration', {
      type: Sequelize.TEXT, allowNull: true, after: 'psl_classification',
    });
    await queryInterface.addColumn('loan_applications', 'end_use_verified', {
      type: Sequelize.BOOLEAN, defaultValue: false, after: 'end_use_declaration',
    });

    // ─── ALTER: loan_disbursements — disbursement mode tracking ──
    await queryInterface.addColumn('loan_disbursements', 'disbursement_mode', {
      type: Sequelize.ENUM('bank_transfer', 'upi', 'cheque', 'cash', 'demand_draft'),
      defaultValue: 'bank_transfer', after: 'utr_reference_number',
    });
    await queryInterface.addColumn('loan_disbursements', 'cash_amount', {
      type: Sequelize.DECIMAL(15, 2), allowNull: true, after: 'disbursement_mode',
    });
    await queryInterface.addColumn('loan_disbursements', 'digital_amount', {
      type: Sequelize.DECIMAL(15, 2), allowNull: true, after: 'cash_amount',
    });

    // Add index for gold loan filtering
    await queryInterface.addIndex('loan_applications', ['is_gold_loan']);
    await queryInterface.addIndex('loan_products', ['is_gold_loan']);
  },

  async down(queryInterface) {
    // loan_disbursements
    await queryInterface.removeColumn('loan_disbursements', 'digital_amount');
    await queryInterface.removeColumn('loan_disbursements', 'cash_amount');
    await queryInterface.removeColumn('loan_disbursements', 'disbursement_mode');
    // loan_applications
    await queryInterface.removeColumn('loan_applications', 'end_use_verified');
    await queryInterface.removeColumn('loan_applications', 'end_use_declaration');
    await queryInterface.removeColumn('loan_applications', 'psl_classification');
    await queryInterface.removeColumn('loan_applications', 'repayment_type');
    await queryInterface.removeColumn('loan_applications', 'is_gold_loan');
    await queryInterface.removeColumn('loan_applications', 'collateral_type');
    // loan_products
    await queryInterface.removeColumn('loan_products', 'psl_category');
    await queryInterface.removeColumn('loan_products', 'psl_eligible');
    await queryInterface.removeColumn('loan_products', 'max_bullet_tenure_months');
    await queryInterface.removeColumn('loan_products', 'ltv_cap_pct');
    await queryInterface.removeColumn('loan_products', 'is_gold_loan');
    await queryInterface.removeColumn('loan_products', 'collateral_type');
    await queryInterface.removeColumn('loan_products', 'repayment_type');
  },
};
