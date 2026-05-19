'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VendorProductCatalog extends Model {
    static associate(models) {
      VendorProductCatalog.belongsTo(models.VendorProfile, { foreignKey: 'vendor_id', as: 'vendor' });
    }
  }

  VendorProductCatalog.init(
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
      input_item_id: {
        type: DataTypes.STRING(36),
      },
      input_pack_id: {
        type: DataTypes.STRING(36),
      },
      mrp_rupees: {
        type: DataTypes.DECIMAL(10, 2),
      },
      vendor_selling_price: {
        type: DataTypes.DECIMAL(10, 2),
      },
      stock_quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      last_stock_update_date: {
        type: DataTypes.DATEONLY,
      },
      availability_status: {
        type: DataTypes.ENUM('in_stock', 'low_stock', 'out_of_stock'),
        defaultValue: 'in_stock',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'VendorProductCatalog',
      tableName: 'vendor_product_catalogs',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['vendor_id', 'input_item_id', 'input_pack_id'],
        },
      ],
    }
  );

  return VendorProductCatalog;
};
