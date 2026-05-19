'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TaskExecutionMachineryLog extends Model {
    static associate(models) {
      TaskExecutionMachineryLog.belongsTo(models.TaskExecution, {
        foreignKey: 'task_execution_id',
        as: 'taskExecution',
      });
    }
  }

  TaskExecutionMachineryLog.init(
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
      machinery_type: {
        type: DataTypes.STRING(100),
      },
      machinery_owner: {
        type: DataTypes.STRING(100),
      },
      machinery_hire_cost: {
        type: DataTypes.DECIMAL(10, 2),
      },
      machinery_operating_cost: {
        type: DataTypes.DECIMAL(10, 2),
      },
      hours_used: {
        type: DataTypes.DECIMAL(10, 2),
      },
      is_owned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_hired: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'TaskExecutionMachineryLog',
      tableName: 'task_execution_machinery_logs',
      timestamps: true,
      underscored: true,
    }
  );

  return TaskExecutionMachineryLog;
};
