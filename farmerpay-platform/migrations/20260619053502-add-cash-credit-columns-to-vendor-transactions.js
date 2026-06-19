'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('vendor_transactions', 'cash_amount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      after: 'transaction_amount', // MySQL only
    });

    await queryInterface.addColumn('vendor_transactions', 'credit_amount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      after: 'cash_amount',
    });

    // Optional: if payment_status is ENUM
    await queryInterface.changeColumn('vendor_transactions', 'payment_status', {
      type: Sequelize.ENUM(
        'paid',
        'credit_given',
        'partial_paid'
      ),
      allowNull: true,
    });

     // transaction_type enum update
    await queryInterface.changeColumn('vendor_transactions', 'transaction_type', {
      type: Sequelize.ENUM(
        'cash_sale',
        'credit_sale',
        'cash_credit_sale',
        'return',
        'exchange'
      ),
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('vendor_transactions', 'cash_amount');
    await queryInterface.removeColumn('vendor_transactions', 'credit_amount');

    await queryInterface.changeColumn('vendor_transactions', 'payment_status', {
      type: Sequelize.ENUM(
        'paid',
        'credit_given'
      ),
      allowNull: true,
    });

    // revert transaction_type
    await queryInterface.changeColumn('vendor_transactions', 'transaction_type', {
      type: Sequelize.ENUM(
        'cash_sale',
        'credit_sale',
        'return',
        'exchange'
      ),
      allowNull: false
    });
  }
};