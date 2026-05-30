'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.addColumn(
      'vendor_transaction_items',
      'category',
      {
        type: Sequelize.STRING(100),
        allowNull: true,
      }
    );

    await queryInterface.removeColumn(
      'vendor_transaction_items',
      'input_item_id'
    );

    await queryInterface.removeColumn(
      'vendor_transaction_items',
      'input_pack_id'
    );
  },

  async down(queryInterface, Sequelize) {

    await queryInterface.addColumn(
      'vendor_transaction_items',
      'input_item_id',
      {
        type: Sequelize.STRING(36),
        allowNull: true,
      }
    );

    await queryInterface.addColumn(
      'vendor_transaction_items',
      'input_pack_id',
      {
        type: Sequelize.STRING(36),
        allowNull: true,
      }
    );

    await queryInterface.removeColumn(
      'vendor_transaction_items',
      'category'
    );
  }
};