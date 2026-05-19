'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('crop_establishment_methods', {
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
      method_code: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      method_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      seed_rate_per_hectare_kg: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
      },
      spacing_row_cm: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      spacing_plant_cm: {
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
    await queryInterface.dropTable('crop_establishment_methods');
  },
};
