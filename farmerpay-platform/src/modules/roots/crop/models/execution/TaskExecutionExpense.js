'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TaskExecutionExpense extends Model {
    static associate(models) {
      TaskExecutionExpense.belongsTo(models.TaskExecution, {
        foreignKey: 'task_execution_id',
        as: 'taskExecution',
      });
    }
  }

  TaskExecutionExpense.init(
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
      expense_type: {
        type: DataTypes.STRING(50),
      },
      expense_amount: {
        type: DataTypes.DECIMAL(15, 2),
      },
      expense_note: {
        type: DataTypes.TEXT,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'TaskExecutionExpense',
      tableName: 'task_execution_expenses',
      timestamps: true,
      underscored: true,
    }
  );

  return TaskExecutionExpense;
};
