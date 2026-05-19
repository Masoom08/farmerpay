'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('climate_zones', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      zone_code: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: false,
      },
      zone_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      temperature_range_min: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      temperature_range_max: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      avg_rainfall_mm: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      monsoon_season: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      frost_risk: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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
    await queryInterface.dropTable('climate_zones');
  },
};
