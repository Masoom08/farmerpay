'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('workband_executions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      execution_uuid: {
        type: Sequelize.STRING(36),
        unique: true,
        allowNull: false
      },
      cycle_id: {
        type: Sequelize.STRING(36),
        allowNull: false
      },
      pop_workband_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      workband_start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      workband_end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      workband_status: {
        type: Sequelize.ENUM('planned', 'in_progress', 'completed', 'delayed', 'skipped'),
        defaultValue: 'planned'
      },
      workband_completion_percentage: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      workband_notes: {
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
    await queryInterface.dropTable('workband_executions');
  }
};
