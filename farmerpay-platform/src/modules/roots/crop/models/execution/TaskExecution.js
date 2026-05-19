'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TaskExecution extends Model {
    static associate(models) {
      TaskExecution.belongsTo(models.WorkbandExecution, {
        foreignKey: 'workband_execution_id',
        as: 'workbandExecution',
      });
      TaskExecution.belongsTo(models.PopTask, {
        foreignKey: 'pop_task_id',
        as: 'popTask',
      });
      TaskExecution.hasMany(models.TaskExecutionWeatherNote, {
        foreignKey: 'task_execution_id',
        as: 'weatherNotes',
      });
      TaskExecution.hasMany(models.TaskExecutionInputLog, {
        foreignKey: 'task_execution_id',
        as: 'inputLogs',
      });
      TaskExecution.hasMany(models.TaskExecutionLaborLog, {
        foreignKey: 'task_execution_id',
        as: 'laborLogs',
      });
      TaskExecution.hasMany(models.TaskExecutionMachineryLog, {
        foreignKey: 'task_execution_id',
        as: 'machineryLogs',
      });
      TaskExecution.hasMany(models.TaskExecutionPhoto, {
        foreignKey: 'task_execution_id',
        as: 'photos',
      });
      TaskExecution.hasMany(models.TaskExecutionExpense, {
        foreignKey: 'task_execution_id',
        as: 'expenses',
      });
    }
  }

  TaskExecution.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      execution_uuid: {
        type: DataTypes.STRING(36),
        unique: true,
        allowNull: false,
      },
      workband_execution_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'workband_executions',
          key: 'id',
        },
      },
      pop_task_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'pop_tasks',
          key: 'id',
        },
      },
      task_start_date: {
        type: DataTypes.DATEONLY,
      },
      task_end_date: {
        type: DataTypes.DATEONLY,
      },
      task_status: {
        type: DataTypes.ENUM('planned', 'in_progress', 'completed', 'delayed', 'skipped'),
        defaultValue: 'planned',
      },
      task_completion_percentage: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      task_notes: {
        type: DataTypes.TEXT,
      },
      execution_photo_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'TaskExecution',
      tableName: 'task_executions',
      timestamps: true,
      underscored: true,
    }
  );

  return TaskExecution;
};
