'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VendorShop extends Model {
    static associate(models) {
      VendorShop.belongsTo(models.VendorProfile, { foreignKey: 'vendor_id', as: 'vendor' });
    }
  }

  VendorShop.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      vendor_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'vendor_profiles',
          key: 'id',
        },
      },
      shop_uuid: {
        type: DataTypes.STRING(36),
        unique: true,
      },
      shop_name: {
        type: DataTypes.STRING(150),
      },
      shop_address: {
        type: DataTypes.STRING(255),
      },
      lgd_state_id: {
        type: DataTypes.INTEGER,
      },
      lgd_district_id: {
        type: DataTypes.INTEGER,
      },
      lgd_block_id: {
        type: DataTypes.INTEGER,
      },
      shop_contact_phone: {
        type: DataTypes.STRING(13),
      },
      shop_contact_name: {
        type: DataTypes.STRING(100),
      },
      shop_hours_open_time: {
        type: DataTypes.STRING(5),
      },
      shop_hours_close_time: {
        type: DataTypes.STRING(5),
      },
      is_physical_shop: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      is_online_delivery: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_home_delivery: {
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
      modelName: 'VendorShop',
      tableName: 'vendor_shops',
      timestamps: true,
      underscored: true,
    }
  );

  return VendorShop;
};
