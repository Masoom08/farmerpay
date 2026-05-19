'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('task_execution_labor_logs', {
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
      labor_type: {
        type: Sequelize.ENUM('family', 'hired_male', 'hired_female', 'machine'),
        allowNull: false
      },
      labor_count: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      labor_hours: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      labor_wage_per_day: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      total_labor_cost: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      labor_provider_name: {
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
    await queryInterface.dropTable('task_execution_labor_logs');
  }
};
