'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class InputPack extends Model {
    static associate(models) {
      InputPack.belongsTo(models.InputItem, {
        foreignKey: 'item_id',
        targetKey: 'item_uuid',
        as: 'inputItem',
      });
      InputPack.belongsTo(models.InputUnit, {
        foreignKey: 'pack_size_unit_id',
        as: 'packSizeUnit',
      });
      InputPack.hasMany(models.InputPackPrice, {
        foreignKey: 'pack_id',
        sourceKey: 'pack_uuid',
        as: 'inputPackPrices',
      });
    }
  }

  InputPack.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      pack_uuid: {
        type: DataTypes.STRING(36),
        unique: true,
        allowNull: false,
      },
      item_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
      },
      pack_size_value: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
      },
      pack_size_unit_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'input_units',
          key: 'id',
        },
      },
      pack_quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      pack_price_rupees: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      is_retail_pack: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      distributor_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'InputPack',
      tableName: 'input_packs',
      timestamps: true,
      underscored: true,
    }
  );

  return InputPack;
};
