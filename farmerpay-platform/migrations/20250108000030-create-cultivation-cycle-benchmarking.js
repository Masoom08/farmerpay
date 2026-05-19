'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cultivation_cycle_benchmarking', {
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
      benchmark_crop_id: {
        type: Sequelize.STRING(36),
        allowNull: true
      },
      benchmark_variety_id: {
        type: Sequelize.STRING(36),
        allowNull: true
      },
      benchmark_state_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      my_yield_kg: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      benchmark_yield_kg: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      my_profit_per_hectare: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      benchmark_profit_per_hectare: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      yield_vs_benchmark_percent: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      profit_vs_benchmark_percent: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      improvement_opportunities: {
        type: Sequelize.TEXT,
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
    await queryInterface.dropTable('cultivation_cycle_benchmarking');
  }
};
