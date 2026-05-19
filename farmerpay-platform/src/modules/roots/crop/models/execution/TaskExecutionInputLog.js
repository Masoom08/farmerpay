'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TaskExecutionInputLog extends Model {
    static associate(models) {
      TaskExecutionInputLog.belongsTo(models.TaskExecution, {
        foreignKey: 'task_execution_id',
        as: 'taskExecution',
      });
    }
  }

  TaskExecutionInputLog.init(
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
      input_item_id: {
        type: DataTypes.STRING(36),
      },
      input_pack_id: {
        type: DataTypes.STRING(36),
      },
      quantity_used: {
        type: DataTypes.DECIMAL(10, 3),
      },
      quantity_unit_id: {
        type: DataTypes.INTEGER,
      },
      application_method: {
        type: DataTypes.STRING(100),
      },
      time_of_application: {
        type: DataTypes.STRING(20),
      },
      input_cost: {
        type: DataTypes.DECIMAL(10, 2),
      },
      supplier_name: {
        type: DataTypes.STRING(100),
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'TaskExecutionInputLog',
      tableName: 'task_execution_input_logs',
      timestamps: true,
      underscored: true,
    }
  );

  return TaskExecutionInputLog;
};
