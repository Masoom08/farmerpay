'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CultivationCycleExpenseSummary extends Model {
    static associate(models) {
      CultivationCycleExpenseSummary.belongsTo(models.CultivationCycle, {
        foreignKey: 'cycle_id',
        as: 'cultivationCycle',
      });
    }
  }

  CultivationCycleExpenseSummary.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      cycle_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
      },
      total_input_cost: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
      },
      total_labor_cost: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
      },
      total_machinery_cost: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
      },
      total_other_expenses: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
      },
      total_expenses: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
      },
      expense_per_hectare: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
      },
      last_updated_at: {
        type: DataTypes.DATE,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'CultivationCycleExpenseSummary',
      tableName: 'cultivation_cycle_expense_summaries',
      timestamps: true,
      underscored: true,
    }
  );

  return CultivationCycleExpenseSummary;
};
