'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CultivationCyclePlanning extends Model {
    static associate(models) {
      CultivationCyclePlanning.belongsTo(models.CultivationCycle, {
        foreignKey: 'cycle_id',
        as: 'cultivationCycle',
      });
    }
  }

  CultivationCyclePlanning.init(
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
      farmer_planned_area_hectares: {
        type: DataTypes.DECIMAL(10, 4),
      },
      expected_yield_kg_per_hectare: {
        type: DataTypes.INTEGER,
      },
      expected_yield_quality_grade: {
        type: DataTypes.STRING(50),
      },
      expected_sale_price_per_kg: {
        type: DataTypes.DECIMAL(10, 2),
      },
      expected_gross_return: {
        type: DataTypes.DECIMAL(15, 2),
      },
      expected_net_profit: {
        type: DataTypes.DECIMAL(15, 2),
      },
      input_budget: {
        type: DataTypes.DECIMAL(15, 2),
      },
      labor_budget: {
        type: DataTypes.DECIMAL(15, 2),
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'CultivationCyclePlanning',
      tableName: 'cultivation_cycle_planning',
      timestamps: true,
      underscored: true,
    }
  );

  return CultivationCyclePlanning;
};
