'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WaterManagementRecord extends Model {
    static associate(models) {
      WaterManagementRecord.belongsTo(models.CultivationCycle, {
        foreignKey: 'cycle_id',
        as: 'cultivationCycle',
      });
    }
  }

  WaterManagementRecord.init(
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
      irrigation_type: {
        type: DataTypes.ENUM('flood', 'drip', 'sprinkler', 'rainwater_harvesting', 'canal'),
      },
      water_source: {
        type: DataTypes.STRING(100),
      },
      total_water_used_mm: {
        type: DataTypes.INTEGER,
      },
      irrigation_count: {
        type: DataTypes.INTEGER,
      },
      irrigation_interval_days: {
        type: DataTypes.INTEGER,
      },
      water_use_efficiency_percent: {
        type: DataTypes.INTEGER,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'WaterManagementRecord',
      tableName: 'water_management_records',
      timestamps: true,
      underscored: true,
    }
  );

  return WaterManagementRecord;
};
