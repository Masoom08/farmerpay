'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VendorFarmerLink extends Model {
    static associate(models) {
      VendorFarmerLink.belongsTo(models.VendorProfile, {
        foreignKey: 'vendor_id',
        as: 'vendor',
      });

      VendorFarmerLink.belongsTo(models.User, {
        foreignKey: 'farmer_id',
        as: 'farmer',
      });
    }
  }

  VendorFarmerLink.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      vendor_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
      },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      link_type: {
        type: DataTypes.ENUM('regular_customer', 'credit_customer', 'loan_linked'),
        allowNull: true,
      },
      last_transaction_date: { type: DataTypes.DATEONLY, allowNull: true },
      transaction_count: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
      total_value: { type: DataTypes.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'VendorFarmerLink', tableName: 'vendor_farmer_links',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['vendor_id', 'farmer_id'], unique: true }],
    }
  );

  return VendorFarmerLink;
};
