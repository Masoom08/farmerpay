'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pop_workbands', {
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
      workband_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      workband_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      days_from_sowing_start: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      days_from_sowing_end: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      workband_description: {
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
    await queryInterface.dropTable('pop_workbands');
  },
};
