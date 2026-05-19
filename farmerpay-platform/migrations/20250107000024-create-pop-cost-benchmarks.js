'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pop_cost_benchmarks', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      pop_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      cost_category: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      estimated_cost_per_hectare: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      is_variable_cost: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      cost_note: {
        type: Sequelize.TEXT,
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
    await queryInterface.dropTable('pop_cost_benchmarks');
  },
};
