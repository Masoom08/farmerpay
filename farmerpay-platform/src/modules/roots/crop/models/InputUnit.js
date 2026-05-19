'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class InputUnit extends Model {
    static associate(models) {
      InputUnit.hasMany(models.InputItem, {
        foreignKey: 'unit_id',
        as: 'inputItems',
      });
      InputUnit.hasMany(models.InputPack, {
        foreignKey: 'pack_size_unit_id',
        as: 'inputPacks',
      });
      InputUnit.hasMany(models.PopTaskInput, {
        foreignKey: 'input_unit_id',
        as: 'popTaskInputs',
      });
    }
  }

  InputUnit.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      unit_code: {
        type: DataTypes.STRING(20),
        unique: true,
        allowNull: false,
      },
      unit_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      unit_symbol: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      is_weight: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      is_volume: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      is_count: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      is_area: {
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
      modelName: 'InputUnit',
      tableName: 'input_units',
      timestamps: true,
      underscored: true,
    }
  );

  return InputUnit;
};
