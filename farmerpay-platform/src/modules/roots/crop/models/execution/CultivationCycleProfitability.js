'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CultivationCycleProfitability extends Model {
    static associate(models) {
      CultivationCycleProfitability.belongsTo(models.CultivationCycle, {
        foreignKey: 'cycle_id',
        as: 'cultivationCycle',
      });
    }
  }

  CultivationCycleProfitability.init(
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
      expected_profit: {
        type: DataTypes.DECIMAL(15, 2),
      },
      actual_profit: {
        type: DataTypes.DECIMAL(15, 2),
      },
      profit_variance_percent: {
        type: DataTypes.DECIMAL(5, 2),
      },
      profit_variance_reason: {
        type: DataTypes.TEXT,
      },
      is_profitable: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      break_even_achieved: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'CultivationCycleProfitability',
      tableName: 'cultivation_cycle_profitabilities',
      timestamps: true,
      underscored: true,
    }
  );

  return CultivationCycleProfitability;
};
