'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CultivationCycleHistory extends Model {
    static associate(models) {
      CultivationCycleHistory.belongsTo(models.CultivationCycle, {
        foreignKey: 'cycle_id',
        as: 'cultivationCycle',
      });
    }
  }

  CultivationCycleHistory.init(
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
      previous_year_crop_id: {
        type: DataTypes.STRING(36),
      },
      previous_year_yield_kg: {
        type: DataTypes.INTEGER,
      },
      previous_year_profit: {
        type: DataTypes.DECIMAL(15, 2),
      },
      soil_impact_assessment: {
        type: DataTypes.TEXT,
      },
      crop_rotation_followed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      intercropping_practiced: {
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
      modelName: 'CultivationCycleHistory',
      tableName: 'cultivation_cycle_histories',
      timestamps: true,
      underscored: true,
    }
  );

  return CultivationCycleHistory;
};
