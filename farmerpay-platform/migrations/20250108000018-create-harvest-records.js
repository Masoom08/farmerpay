'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('harvest_records', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      record_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false
      },
      cycle_id: {
        type: Sequelize.STRING(36),
        allowNull: false
      },
      harvest_start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      harvest_end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      total_harvest_quantity_kg: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      harvest_quality_grade: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      yield_per_hectare_kg: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      expected_yield_achieved_percent: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      loss_due_to_weather: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      loss_due_to_pest: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      loss_due_to_disease: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      post_harvest_loss_percent: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      harvest_notes: {
        type: Sequelize.TEXT,
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
    await queryInterface.dropTable('harvest_records');
  }
};
