'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('soil_types', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      soil_type_code: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: false,
      },
      soil_type_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      parent_soil_type_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'soil_types',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      texture_class: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      color_description: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      ph_range_min: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      ph_range_max: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      org_matter_range_min: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      org_matter_range_max: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      permeability_class: {
        type: Sequelize.STRING(50),
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
    await queryInterface.dropTable('soil_types');
  },
};
