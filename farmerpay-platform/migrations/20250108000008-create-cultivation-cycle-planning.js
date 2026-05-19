'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cultivation_cycle_planning', {
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
      farmer_planned_area_hectares: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: true
      },
      expected_yield_kg_per_hectare: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      expected_yield_quality_grade: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      expected_sale_price_per_kg: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      expected_gross_return: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      expected_net_profit: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      input_budget: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      labor_budget: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
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
    await queryInterface.dropTable('cultivation_cycle_planning');
  }
};
