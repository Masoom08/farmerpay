'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class InputPackPrice extends Model {
    static associate(models) {
      InputPackPrice.belongsTo(models.InputPack, {
        foreignKey: 'pack_id',
        targetKey: 'pack_uuid',
        as: 'inputPack',
      });
    }
  }

  InputPackPrice.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      pack_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
      },
      state_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      market_price_rupees: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      wholesale_price_rupees: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      price_recorded_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      data_source: {
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
      modelName: 'InputPackPrice',
      tableName: 'input_pack_prices',
      timestamps: true,
      underscored: true,
    }
  );

  return InputPackPrice;
};
