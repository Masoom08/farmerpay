'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CropMaster extends Model {
    static associate(models) {
      CropMaster.hasMany(models.CropTranslation, {
        foreignKey: 'crop_id',
        sourceKey: 'crop_id',
        as: 'cropTranslations',
      });
      CropMaster.hasMany(models.CropSeason, {
        foreignKey: 'crop_id',
        sourceKey: 'crop_id',
        as: 'cropSeasons',
      });
      CropMaster.hasMany(models.CropEstablishmentMethod, {
        foreignKey: 'crop_id',
        sourceKey: 'crop_id',
        as: 'cropEstablishmentMethods',
      });
      CropMaster.hasMany(models.VarietyMaster, {
        foreignKey: 'crop_id',
        sourceKey: 'crop_id',
        as: 'varietyMasters',
      });
    }
  }

  CropMaster.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      crop_id: {
        type: DataTypes.STRING(36),
        unique: true,
        allowNull: false,
      },
      crop_code: {
        type: DataTypes.STRING(20),
        unique: true,
        allowNull: false,
      },
      crop_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      crop_group: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      botanical_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      crop_duration_days_min: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      crop_duration_days_max: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      is_annual: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      is_perennial: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      ideal_season: {
        type: DataTypes.ENUM('kharif', 'rabi', 'summer', 'year_round', 'multiple'),
        allowNull: true,
      },
      water_requirement_mm: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'CropMaster',
      tableName: 'crop_masters',
      timestamps: true,
      underscored: true,
    }
  );

  return CropMaster;
};
