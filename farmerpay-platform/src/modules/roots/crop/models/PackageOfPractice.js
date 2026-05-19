'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PackageOfPractice extends Model {
    static associate(models) {
      PackageOfPractice.belongsTo(models.CropMaster, {
        foreignKey: 'crop_id',
        targetKey: 'crop_id',
        as: 'cropMaster',
      });
      PackageOfPractice.belongsTo(models.VarietyMaster, {
        foreignKey: 'variety_id',
        targetKey: 'variety_id',
        as: 'varietyMaster',
      });
      PackageOfPractice.belongsTo(models.SoilType, {
        foreignKey: 'soil_type_id',
        as: 'soilType',
      });
      PackageOfPractice.belongsTo(models.ClimateZone, {
        foreignKey: 'climate_zone_id',
        as: 'climateZone',
      });
      PackageOfPractice.belongsTo(models.Organization, {
        foreignKey: 'recommended_by_org_id',
        as: 'recommendedByOrg',
      });
      PackageOfPractice.hasMany(models.PopWorkband, {
        foreignKey: 'pop_id',
        sourceKey: 'pop_uuid',
        as: 'popWorkbands',
      });
      PackageOfPractice.hasMany(models.PopCostBenchmark, {
        foreignKey: 'pop_id',
        sourceKey: 'pop_uuid',
        as: 'popCostBenchmarks',
      });
    }
  }

  PackageOfPractice.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      pop_uuid: {
        type: DataTypes.STRING(36),
        unique: true,
        allowNull: false,
      },
      crop_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
      },
      variety_id: {
        type: DataTypes.STRING(36),
        allowNull: true,
      },
      soil_type_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      climate_zone_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      state_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      pop_name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      pop_description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      recommended_by_org_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'organizations',
          key: 'id',
        },
      },
      version: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      is_certified: {
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
      modelName: 'PackageOfPractice',
      tableName: 'package_of_practices',
      timestamps: true,
      underscored: true,
    }
  );

  return PackageOfPractice;
};
