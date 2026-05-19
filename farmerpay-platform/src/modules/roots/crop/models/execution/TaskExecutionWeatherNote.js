'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TaskExecutionWeatherNote extends Model {
    static associate(models) {
      TaskExecutionWeatherNote.belongsTo(models.TaskExecution, {
        foreignKey: 'task_execution_id',
        as: 'taskExecution',
      });
    }
  }

  TaskExecutionWeatherNote.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      task_execution_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'task_executions',
          key: 'id',
        },
      },
      weather_condition: {
        type: DataTypes.STRING(50),
      },
      temperature_celsius: {
        type: DataTypes.INTEGER,
      },
      humidity_percent: {
        type: DataTypes.INTEGER,
      },
      rainfall_mm: {
        type: DataTypes.DECIMAL(10, 2),
      },
      wind_speed_kmh: {
        type: DataTypes.INTEGER,
      },
      weather_impact_on_task: {
        type: DataTypes.STRING(200),
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'TaskExecutionWeatherNote',
      tableName: 'task_execution_weather_notes',
      timestamps: true,
      underscored: true,
    }
  );

  return TaskExecutionWeatherNote;
};
