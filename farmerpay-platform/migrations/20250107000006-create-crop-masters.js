'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('crop_masters', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      crop_id: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false,
      },
      crop_code: {
        type: Sequelize.STRING(20),
        unique: true,
        allowNull: false,
      },
      crop_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      crop_group: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      botanical_name: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      crop_duration_days_min: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      crop_duration_days_max: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      is_annual: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      is_perennial: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      ideal_season: {
        type: Sequelize.ENUM('kharif', 'rabi', 'summer', 'year_round', 'multiple'),
        allowNull: true,
      },
      water_requirement_mm: {
        type: Sequelize.INTEGER,
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
    await queryInterface.dropTable('crop_masters');
  },
};
