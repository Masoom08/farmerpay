'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('task_execution_machinery_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      task_execution_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'task_executions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      machinery_type: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      machinery_owner: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      machinery_hire_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      machinery_operating_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      hours_used: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      is_owned: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      is_hired: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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
    await queryInterface.dropTable('task_execution_machinery_logs');
  }
};
