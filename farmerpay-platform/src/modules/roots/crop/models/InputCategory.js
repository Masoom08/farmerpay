'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class InputCategory extends Model {
    static associate(models) {
      InputCategory.hasMany(models.InputItem, {
        foreignKey: 'category_id',
        as: 'inputItems',
      });
    }
  }

  InputCategory.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      category_code: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
      },
      category_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      category_order: {
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
      modelName: 'InputCategory',
      tableName: 'input_categories',
      timestamps: true,
      underscored: true,
    }
  );

  return InputCategory;
};
