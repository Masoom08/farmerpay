'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VendorTransactionItem extends Model {
    static associate(models) {
      VendorTransactionItem.belongsTo(models.VendorTransaction, { foreignKey: 'transaction_id', as: 'transaction' });
    }
  }

  VendorTransactionItem.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      transaction_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'vendor_transactions',
          key: 'id',
        },
      },
      input_item_id: {
        type: DataTypes.STRING(36),
      },
      input_pack_id: {
        type: DataTypes.STRING(36),
      },
      quantity: {
        type: DataTypes.INTEGER,
      },
      unit_price: {
        type: DataTypes.DECIMAL(10, 2),
      },
      line_total: {
        type: DataTypes.DECIMAL(15, 2),
      },
      subsidy_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      subsidy_scheme: { type: DataTypes.STRING(100), allowNull: true },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'VendorTransactionItem',
      tableName: 'vendor_transaction_items',
      timestamps: true,
      underscored: true,
    }
  );

  return VendorTransactionItem;
};
