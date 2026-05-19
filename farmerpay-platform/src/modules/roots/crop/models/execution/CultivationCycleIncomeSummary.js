'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CultivationCycleIncomeSummary extends Model {
    static associate(models) {
      CultivationCycleIncomeSummary.belongsTo(models.CultivationCycle, {
        foreignKey: 'cycle_id',
        as: 'cultivationCycle',
      });
    }
  }

  CultivationCycleIncomeSummary.init(
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
      total_harvest_kg: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      total_sale_value: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
      },
      total_cost: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
      },
      net_income: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
      },
      income_per_hectare: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
      },
      roi_percent: {
        type: DataTypes.DECIMAL(5, 2),
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
      modelName: 'CultivationCycleIncomeSummary',
      tableName: 'cultivation_cycle_income_summaries',
      timestamps: true,
      underscored: true,
    }
  );

  return CultivationCycleIncomeSummary;
};
