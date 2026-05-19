'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('task_execution_weather_notes', {
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
      weather_condition: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      temperature_celsius: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      humidity_percent: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      rainfall_mm: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      wind_speed_kmh: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      weather_impact_on_task: {
        type: Sequelize.STRING(200),
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
    await queryInterface.dropTable('task_execution_weather_notes');
  }
};
