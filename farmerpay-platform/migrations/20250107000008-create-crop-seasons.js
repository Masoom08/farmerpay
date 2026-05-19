'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('crop_seasons', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      crop_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      season: {
        type: Sequelize.ENUM('kharif', 'rabi', 'summer'),
        allowNull: false,
      },
      planting_month_start: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      planting_month_end: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      harvesting_month_start: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      harvesting_month_end: {
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
    await queryInterface.dropTable('crop_seasons');
  },
};
