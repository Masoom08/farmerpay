'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('field_soil_details', {
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
      soil_type_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      soil_test_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      ph_value: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      organic_matter_percent: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      nitrogen_ppm: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      phosphorus_ppm: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      potassium_ppm: {
        type: Sequelize.INTEGER,
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
    await queryInterface.dropTable('field_soil_details');
  }
};
