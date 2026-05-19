'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TaskExecutionLaborLog extends Model {
    static associate(models) {
      TaskExecutionLaborLog.belongsTo(models.TaskExecution, {
        foreignKey: 'task_execution_id',
        as: 'taskExecution',
      });
    }
  }

  TaskExecutionLaborLog.init(
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
      labor_type: {
        type: DataTypes.ENUM('family', 'hired_male', 'hired_female', 'machine'),
      },
      labor_count: {
        type: DataTypes.INTEGER,
      },
      labor_hours: {
        type: DataTypes.DECIMAL(10, 2),
      },
      labor_wage_per_day: {
        type: DataTypes.DECIMAL(10, 2),
      },
      total_labor_cost: {
        type: DataTypes.DECIMAL(15, 2),
      },
      labor_provider_name: {
        type: DataTypes.STRING(100),
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'TaskExecutionLaborLog',
      tableName: 'task_execution_labor_logs',
      timestamps: true,
      underscored: true,
    }
  );

  return TaskExecutionLaborLog;
};
