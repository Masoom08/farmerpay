'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cultivation_cycle_income_summaries', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      cycle_id: {
        type: Sequelize.STRING(36),
        allowNull: false
      },
      total_harvest_kg: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      total_sale_value: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      total_cost: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      net_income: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      income_per_hectare: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      roi_percent: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0
      },
      last_updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('cultivation_cycle_income_summaries');
  }
};
