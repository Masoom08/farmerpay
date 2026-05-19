'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VarietyRegionalSuitability extends Model {
    static associate(models) {
      VarietyRegionalSuitability.belongsTo(models.VarietyMaster, {
        foreignKey: 'variety_id',
        targetKey: 'variety_id',
        as: 'varietyMaster',
      });
    }
  }

  VarietyRegionalSuitability.init(
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
      state_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      district_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      suitability: {
        type: DataTypes.ENUM('not_suitable', 'marginal', 'suitable', 'ideal'),
        allowNull: false,
      },
      adoption_percentage: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      success_stories: {
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
      modelName: 'VarietyRegionalSuitability',
      tableName: 'variety_regional_suitabilities',
      timestamps: true,
      underscored: true,
    }
  );

  return VarietyRegionalSuitability;
};
