'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cultivation_cycle_histories', {
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
      previous_year_crop_id: {
        type: Sequelize.STRING(36),
        allowNull: true
      },
      previous_year_yield_kg: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      previous_year_profit: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      soil_impact_assessment: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      crop_rotation_followed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      intercropping_practiced: {
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
    await queryInterface.dropTable('cultivation_cycle_histories');
  }
};
