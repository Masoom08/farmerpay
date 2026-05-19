'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('traits', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      trait_code: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: false,
      },
      trait_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      trait_category: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      trait_description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      measurement_unit: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      is_quantifiable: {
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
    await queryInterface.dropTable('traits');
  },
};
