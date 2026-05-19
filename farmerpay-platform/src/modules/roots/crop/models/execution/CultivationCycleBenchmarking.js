'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CultivationCycleBenchmarking extends Model {
    static associate(models) {
      CultivationCycleBenchmarking.belongsTo(models.CultivationCycle, {
        foreignKey: 'cycle_id',
        as: 'cultivationCycle',
      });
    }
  }

  CultivationCycleBenchmarking.init(
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
      benchmark_crop_id: {
        type: DataTypes.STRING(36),
      },
      benchmark_variety_id: {
        type: DataTypes.STRING(36),
      },
      benchmark_state_id: {
        type: DataTypes.INTEGER,
      },
      my_yield_kg: {
        type: DataTypes.INTEGER,
      },
      benchmark_yield_kg: {
        type: DataTypes.INTEGER,
      },
      my_profit_per_hectare: {
        type: DataTypes.DECIMAL(15, 2),
      },
      benchmark_profit_per_hectare: {
        type: DataTypes.DECIMAL(15, 2),
      },
      yield_vs_benchmark_percent: {
        type: DataTypes.DECIMAL(5, 2),
      },
      profit_vs_benchmark_percent: {
        type: DataTypes.DECIMAL(5, 2),
      },
      improvement_opportunities: {
        type: DataTypes.TEXT,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'CultivationCycleBenchmarking',
      tableName: 'cultivation_cycle_benchmarking',
      timestamps: true,
      underscored: true,
    }
  );

  return CultivationCycleBenchmarking;
};
