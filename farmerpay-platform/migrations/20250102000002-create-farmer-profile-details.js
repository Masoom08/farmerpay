'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('farmer_profile_details', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      farmer_profile_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'farmer_profiles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      family_members: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      children_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      dependents_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      primary_income_source: {
        type: Sequelize.ENUM('farming', 'labor', 'business', 'salary', 'other'),
        allowNull: true,
      },
      secondary_income_source_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      secondary_income_source: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      avg_annual_income: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      has_irrigation: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      irrigation_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      has_pesticides: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      has_seeds: {
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
    await queryInterface.dropTable('farmer_profile_details');
  },
};
