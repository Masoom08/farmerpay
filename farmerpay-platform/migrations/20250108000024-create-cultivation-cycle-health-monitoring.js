'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cultivation_cycle_health_monitoring', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      cycle_id: {
        type: Sequelize.STRING(36),
        allowNull: false
      },
      monitoring_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      health_status: {
        type: Sequelize.ENUM('excellent', 'good', 'average', 'poor'),
        allowNull: true
      },
      pest_incidence_observed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      disease_incidence_observed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      pest_disease_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      affected_area_percent: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      action_taken: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      monitoring_notes: {
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
    await queryInterface.dropTable('cultivation_cycle_health_monitoring');
  }
};
