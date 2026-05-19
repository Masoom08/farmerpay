'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('soil_health_records', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      field_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'fields',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      test_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      organic_carbon_percent: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      nitrogen_kg_per_hectare: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      phosphorus_kg_per_hectare: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      potassium_kg_per_hectare: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      sulphur_ppm: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      boron_ppm: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      iron_ppm: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      test_lab_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('soil_health_records');
  }
};
