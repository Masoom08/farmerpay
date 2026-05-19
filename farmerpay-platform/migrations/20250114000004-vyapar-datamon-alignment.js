'use strict';

/**
 * VYAPAR DataMon Alignment Migration
 * 5 column additions across 2 tables for subsidy tracking, insurance proof,
 * seasonal tagging, and FPO purchase tracking.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // vendor_transaction_items: subsidy tracking
    await queryInterface.addColumn('vendor_transaction_items', 'subsidy_amount', {
      type: Sequelize.DECIMAL(10, 2), allowNull: true, after: 'line_total',
    });
    await queryInterface.addColumn('vendor_transaction_items', 'subsidy_scheme', {
      type: Sequelize.STRING(100), allowNull: true, after: 'subsidy_amount',
    });

    // vendor_transactions: insurance proof, seasonal tagging, FPO
    await queryInterface.addColumn('vendor_transactions', 'is_insurance_proof', {
      type: Sequelize.BOOLEAN, defaultValue: false, after: 'loan_application_id',
    });
    await queryInterface.addColumn('vendor_transactions', 'season', {
      type: Sequelize.ENUM('kharif', 'rabi', 'zaid', 'year_round'),
      allowNull: true, after: 'is_insurance_proof',
    });
    await queryInterface.addColumn('vendor_transactions', 'fpo_id', {
      type: Sequelize.STRING(16), allowNull: true, after: 'season',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('vendor_transactions', 'fpo_id');
    await queryInterface.removeColumn('vendor_transactions', 'season');
    await queryInterface.removeColumn('vendor_transactions', 'is_insurance_proof');
    await queryInterface.removeColumn('vendor_transaction_items', 'subsidy_scheme');
    await queryInterface.removeColumn('vendor_transaction_items', 'subsidy_amount');
  },
};
