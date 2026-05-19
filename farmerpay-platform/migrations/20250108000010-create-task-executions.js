'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('task_executions', {
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
      workband_execution_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'workband_executions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      pop_task_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      task_start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      task_end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      task_status: {
        type: Sequelize.ENUM('planned', 'in_progress', 'completed', 'delayed', 'skipped'),
        defaultValue: 'planned'
      },
      task_completion_percentage: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      task_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      execution_photo_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
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
    await queryInterface.dropTable('task_executions');
  }
};
