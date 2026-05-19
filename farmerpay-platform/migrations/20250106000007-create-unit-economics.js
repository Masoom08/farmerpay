'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('unit_economics', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      ue_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false,
      },
      sof_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'scale_of_finances',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      crop_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      state_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      total_cost_per_hectare: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      expected_yield_kg_per_hectare: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      expected_price_per_kg: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      expected_gross_return: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      expected_net_profit: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      repayment_period_months: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      last_updated: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
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
    await queryInterface.dropTable('unit_economics');
  },
};
