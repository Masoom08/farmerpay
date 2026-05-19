'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VendorInventory extends Model {
    static associate(models) {
      VendorInventory.belongsTo(models.VendorProfile, { foreignKey: 'vendor_id', as: 'vendor' });
    }
  }

  VendorInventory.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      vendor_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
      },
      input_item_id: { type: DataTypes.STRING(36), allowNull: true },
      input_pack_id: { type: DataTypes.STRING(36), allowNull: true },
      current_stock: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
      reorder_level: { type: DataTypes.INTEGER, allowNull: true },
      last_restocked_date: { type: DataTypes.DATEONLY, allowNull: true },
      last_restocked_quantity: { type: DataTypes.INTEGER, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'VendorInventory', tableName: 'vendor_inventories',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['vendor_id'] }],
    }
  );

  return VendorInventory;
};
