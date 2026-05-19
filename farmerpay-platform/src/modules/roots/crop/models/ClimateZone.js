'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ClimateZone extends Model {
    static associate(models) {
      ClimateZone.hasMany(models.PackageOfPractice, {
        foreignKey: 'climate_zone_id',
        as: 'packageOfPractices',
      });
    }
  }

  ClimateZone.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      zone_code: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
      },
      zone_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      temperature_range_min: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      temperature_range_max: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      avg_rainfall_mm: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      monsoon_season: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      frost_risk: {
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
      modelName: 'ClimateZone',
      tableName: 'climate_zones',
      timestamps: true,
      underscored: true,
    }
  );

  return ClimateZone;
};
