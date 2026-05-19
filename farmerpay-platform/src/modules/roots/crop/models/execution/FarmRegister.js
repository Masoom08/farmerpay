'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FarmRegister extends Model {
    static associate(models) {
      FarmRegister.hasMany(models.Field, {
        foreignKey: 'farm_register_id',
        as: 'fields',
      });
    }
  }

  FarmRegister.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      register_uuid: {
        type: DataTypes.STRING(36),
        unique: true,
        allowNull: false,
      },
      farmer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      register_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      total_hectares_owned: {
        type: DataTypes.DECIMAL(10, 4),
      },
      total_hectares_cultivable: {
        type: DataTypes.DECIMAL(10, 4),
      },
      total_hectares_cultivated: {
        type: DataTypes.DECIMAL(10, 4),
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'FarmRegister',
      tableName: 'farm_registers',
      timestamps: true,
      underscored: true,
    }
  );

  return FarmRegister;
};
