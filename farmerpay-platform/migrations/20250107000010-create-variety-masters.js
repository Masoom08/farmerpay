'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('variety_masters', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      variety_id: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false,
      },
      crop_id: {
        type: Sequelize.STRING(36),
        allowNull: false,
      },
      variety_name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      variety_code: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      variety_description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      duration_days_min: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      duration_days_max: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      expected_yield_kg_per_hectare: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      seed_company: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      seed_treatment_recommended: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      is_hybrid: {
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
    await queryInterface.dropTable('variety_masters');
  },
};
