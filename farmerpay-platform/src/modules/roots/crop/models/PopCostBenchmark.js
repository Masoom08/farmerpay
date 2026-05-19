'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PopCostBenchmark extends Model {
    static associate(models) {
      PopCostBenchmark.belongsTo(models.PackageOfPractice, {
        foreignKey: 'pop_id',
        targetKey: 'pop_uuid',
        as: 'packageOfPractice',
      });
    }
  }

  PopCostBenchmark.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      pop_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
      },
      cost_category: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      estimated_cost_per_hectare: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      },
      is_variable_cost: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      cost_note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'PopCostBenchmark',
      tableName: 'pop_cost_benchmarks',
      timestamps: true,
      underscored: true,
    }
  );

  return PopCostBenchmark;
};
