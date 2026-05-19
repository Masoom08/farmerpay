'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VarietySoilCompatibility extends Model {
    static associate(models) {
      VarietySoilCompatibility.belongsTo(models.VarietyMaster, {
        foreignKey: 'variety_id',
        targetKey: 'variety_id',
        as: 'varietyMaster',
      });
      VarietySoilCompatibility.belongsTo(models.SoilType, {
        foreignKey: 'soil_type_id',
        as: 'soilType',
      });
    }
  }

  VarietySoilCompatibility.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      variety_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
      },
      soil_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'soil_types',
          key: 'id',
        },
      },
      suitability: {
        type: DataTypes.ENUM('not_suitable', 'marginal', 'suitable', 'ideal'),
        allowNull: false,
      },
      expected_yield_adjustment_percent: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'VarietySoilCompatibility',
      tableName: 'variety_soil_compatibilities',
      timestamps: true,
      underscored: true,
    }
  );

  return VarietySoilCompatibility;
};
