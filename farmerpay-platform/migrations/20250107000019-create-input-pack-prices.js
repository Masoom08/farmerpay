'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('input_pack_prices', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      pack_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      state_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      market_price_rupees: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      wholesale_price_rupees: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      price_recorded_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      data_source: {
        type: Sequelize.STRING(100),
        allowNull: true,
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('input_pack_prices');
  },
};
