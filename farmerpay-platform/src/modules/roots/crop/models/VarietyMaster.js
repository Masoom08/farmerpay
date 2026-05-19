'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VarietyMaster extends Model {
    static associate(models) {
      VarietyMaster.belongsTo(models.CropMaster, {
        foreignKey: 'crop_id',
        targetKey: 'crop_id',
        as: 'cropMaster',
      });
      VarietyMaster.hasMany(models.VarietyTraitAssignment, {
        foreignKey: 'variety_id',
        sourceKey: 'variety_id',
        as: 'varietyTraitAssignments',
      });
      VarietyMaster.hasMany(models.VarietySoilCompatibility, {
        foreignKey: 'variety_id',
        sourceKey: 'variety_id',
        as: 'varietySoilCompatibilities',
      });
      VarietyMaster.hasMany(models.VarietyRegionalSuitability, {
        foreignKey: 'variety_id',
        sourceKey: 'variety_id',
        as: 'varietyRegionalSuitabilities',
      });
    }
  }

  VarietyMaster.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      variety_id: {
        type: DataTypes.STRING(36),
        unique: true,
        allowNull: false,
      },
      crop_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
      },
      variety_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      variety_code: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      variety_description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      duration_days_min: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      duration_days_max: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      expected_yield_kg_per_hectare: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      seed_company: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      seed_treatment_recommended: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      is_hybrid: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'VarietyMaster',
      tableName: 'variety_masters',
      timestamps: true,
      underscored: true,
    }
  );

  return VarietyMaster;
};
