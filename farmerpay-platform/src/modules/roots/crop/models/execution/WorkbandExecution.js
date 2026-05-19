'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WorkbandExecution extends Model {
    static associate(models) {
      WorkbandExecution.belongsTo(models.CultivationCycle, {
        foreignKey: 'cycle_id',
        as: 'cultivationCycle',
      });
      WorkbandExecution.belongsTo(models.PopWorkband, {
        foreignKey: 'pop_workband_id',
        as: 'popWorkband',
      });
      WorkbandExecution.hasMany(models.TaskExecution, {
        foreignKey: 'workband_execution_id',
        as: 'taskExecutions',
      });
    }
  }

  WorkbandExecution.init(
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
      cycle_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
      },
      pop_workband_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'pop_workbands',
          key: 'id',
        },
      },
      workband_start_date: {
        type: DataTypes.DATEONLY,
      },
      workband_end_date: {
        type: DataTypes.DATEONLY,
      },
      workband_status: {
        type: DataTypes.ENUM('planned', 'in_progress', 'completed', 'delayed', 'skipped'),
        defaultValue: 'planned',
      },
      workband_completion_percentage: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      workband_notes: {
        type: DataTypes.TEXT,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'WorkbandExecution',
      tableName: 'workband_executions',
      timestamps: true,
      underscored: true,
    }
  );

  return WorkbandExecution;
};
