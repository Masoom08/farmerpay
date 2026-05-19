'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lgd_states', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      state_code: {
        type: Sequelize.STRING(5),
        allowNull: false,
        unique: true,
      },
      state_name: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      state_name_en: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      state_abbreviation: {
        type: Sequelize.STRING(3),
        allowNull: true,
      },
      region: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      is_union_territory: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      gst_code: {
        type: Sequelize.STRING(5),
        allowNull: true,
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
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
    await queryInterface.dropTable('lgd_states');
  },
};
