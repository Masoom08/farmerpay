'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('languages', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      language_code: {
        type: Sequelize.STRING(10),
        allowNull: false,
        unique: true,
      },
      language_name: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      native_name: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      iso_639_1: {
        type: Sequelize.STRING(2),
        allowNull: true,
      },
      is_supported: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      is_rtl: {
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
    await queryInterface.dropTable('languages');
  },
};
