'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('input_units', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      unit_code: {
        type: Sequelize.STRING(20),
        unique: true,
        allowNull: false,
      },
      unit_name: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      unit_symbol: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },
      is_weight: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      is_volume: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      is_count: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      is_area: {
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
    await queryInterface.dropTable('input_units');
  },
};
