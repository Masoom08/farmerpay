'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VarietyTraitAssignment extends Model {
    static associate(models) {
      VarietyTraitAssignment.belongsTo(models.VarietyMaster, {
        foreignKey: 'variety_id',
        targetKey: 'variety_id',
        as: 'varietyMaster',
      });
      VarietyTraitAssignment.belongsTo(models.Trait, {
        foreignKey: 'trait_id',
        as: 'trait',
      });
    }
  }

  VarietyTraitAssignment.init(
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
      trait_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'traits',
          key: 'id',
        },
      },
      trait_value: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      trait_rating: {
        type: DataTypes.ENUM('poor', 'average', 'good', 'excellent'),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'VarietyTraitAssignment',
      tableName: 'variety_trait_assignments',
      timestamps: true,
      underscored: true,
    }
  );

  return VarietyTraitAssignment;
};
