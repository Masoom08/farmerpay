'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SoilType extends Model {
    static associate(models) {
      SoilType.belongsTo(models.SoilType, {
        foreignKey: 'parent_soil_type_id',
        as: 'parentSoilType',
      });
      SoilType.hasMany(models.SoilType, {
        foreignKey: 'parent_soil_type_id',
        as: 'childSoilTypes',
      });
      SoilType.hasMany(models.SoilTypeTranslation, {
        foreignKey: 'soil_type_id',
        as: 'soilTypeTranslations',
      });
      SoilType.hasMany(models.VarietySoilCompatibility, {
        foreignKey: 'soil_type_id',
        as: 'varietySoilCompatibilities',
      });
    }
  }

  SoilType.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      soil_type_code: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
      },
      soil_type_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      parent_soil_type_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'soil_types',
          key: 'id',
        },
      },
      texture_class: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      color_description: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      ph_range_min: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      ph_range_max: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      org_matter_range_min: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      org_matter_range_max: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      permeability_class: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'SoilType',
      tableName: 'soil_types',
      timestamps: true,
      underscored: true,
    }
  );

  return SoilType;
};
