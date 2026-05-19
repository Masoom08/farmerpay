'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('intercrop_records', {
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
      intercrop_crop_id: {
        type: Sequelize.STRING(36),
        allowNull: true
      },
      intercrop_variety_id: {
        type: Sequelize.STRING(36),
        allowNull: true
      },
      intercrop_area_hectares: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: true
      },
      intercrop_yield_kg: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      intercrop_income: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      intercrop_notes: {
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
    await queryInterface.dropTable('intercrop_records');
  }
};
