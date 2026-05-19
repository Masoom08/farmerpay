'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cultivation_cycle_profitabilities', {
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
      expected_profit: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      actual_profit: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      profit_variance_percent: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      profit_variance_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_profitable: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      break_even_achieved: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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
    await queryInterface.dropTable('cultivation_cycle_profitabilities');
  }
};
