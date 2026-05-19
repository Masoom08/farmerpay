'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Trait extends Model {
    static associate(models) {
      Trait.hasMany(models.VarietyTraitAssignment, {
        foreignKey: 'trait_id',
        as: 'varietyTraitAssignments',
      });
    }
  }

  Trait.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      trait_code: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
      },
      trait_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      trait_category: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      trait_description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      measurement_unit: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      is_quantifiable: {
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
      modelName: 'Trait',
      tableName: 'traits',
      timestamps: true,
      underscored: true,
    }
  );

  return Trait;
};
