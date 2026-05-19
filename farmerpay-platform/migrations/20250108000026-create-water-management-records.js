'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('water_management_records', {
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
      irrigation_type: {
        type: Sequelize.ENUM('flood', 'drip', 'sprinkler', 'rainwater_harvesting', 'canal'),
        allowNull: true
      },
      water_source: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      total_water_used_mm: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      irrigation_count: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      irrigation_interval_days: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      water_use_efficiency_percent: {
        type: Sequelize.INTEGER,
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
    await queryInterface.dropTable('water_management_records');
  }
};
